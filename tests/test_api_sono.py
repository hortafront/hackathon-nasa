"""Testes HTTP com dados exclusivamente fictícios e banco temporário."""

import json
import tempfile
import unittest
from pathlib import Path

import database
from app import app


class TesteApiSono(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        self.caminho = Path(self.pasta.name) / "teste.db"
        database.inicializar_banco(self.caminho)
        conexao = database.conectar_banco(self.caminho)
        try:
            pessoa = json.loads((Path(__file__).parents[1] / "data" / "astronautas-ficticios.json").read_text(encoding="utf-8"))["astronautas"][0]
            database.salvar_astronauta(conexao, pessoa)
            database.salvar_linha_base_sono(conexao, {"astronauta_id": pessoa["id"], **pessoa["linha_base_sono"]})
            for registro in pessoa["registros_sono"]:
                database.salvar_registro_sono(conexao, {"astronauta_id": pessoa["id"], **registro})
        finally:
            conexao.close()
        anterior = app.config['CAMINHO_BANCO']
        self.addCleanup(app.config.__setitem__, 'CAMINHO_BANCO', anterior)
        app.config['CAMINHO_BANCO'] = self.caminho
        self.cliente = app.test_client()
        self.url = '/api/astronautas/1/sono/avaliacao'

    def test_avaliacao_com_dados_ficticios(self):
        resposta = self.cliente.get(self.url, query_string={'data': '2026-11-10'})
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json['estado'], 'amarelo')
        self.assertEqual(len(resposta.json['noites_consideradas']), 3)
        self.assertEqual(resposta.json['noites_consideradas'][0]['origem'], 'simulada')

    def test_paginas_e_arquivos_estaticos(self):
        for rota in ('/', '/index.html', '/equipe-medica.html', '/checkins.html', '/teste-reacao.html', '/static/js/dados-api.js'):
            with self.subTest(rota=rota):
                resposta = self.cliente.get(rota)
                self.assertEqual(resposta.status_code, 200)
                resposta.close()

    def test_gravacao_e_avaliacoes_retrospectivas(self):
        url = '/api/astronautas/1/sono/registros'
        dados = {'noite_em': '2026-11-12T00:00:00-03:00',
                 'inicio_sono': '2026-11-11T23:00:00-03:00',
                 'fim_sono': '2026-11-12T06:30:00-03:00',
                 'duracao_horas': 1, 'qualidade': 4, 'interrupcoes': 1}
        resposta = self.cliente.post(url, json=dados)
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json['registro']['duracao_horas'], 7.5)
        self.assertEqual(resposta.json['registro']['origem'], 'autorrelato_simulado')
        self.assertNotIn('observacao', resposta.json['registro'])
        avaliacao_nova = self.cliente.get(self.url + '?data=2026-11-12')
        self.assertEqual(avaliacao_nova.json['estado'], 'verde')
        self.assertEqual(avaliacao_nova.json['noites_consideradas'][-1]['origem'], 'autorrelato_simulado')
        dados['noite_em'] = '2026-11-12T00:00:00+00:00'
        self.assertEqual(self.cliente.post(url, json=dados).status_code, 409)
        historico = self.cliente.get('/api/astronautas/1/sono/avaliacoes?data=2026-11-11')
        self.assertEqual(historico.status_code, 200)
        avaliacoes = historico.json['avaliacoes']
        self.assertEqual([(a['data_avaliacao'], a['estado']) for a in avaliacoes[-2:]],
                         [('2026-11-10', 'amarelo'), ('2026-11-11', 'verde')])

    def test_gravacao_rejeita_dados_invalidos_e_banco_ausente(self):
        url = '/api/astronautas/1/sono/registros'
        valido = {'noite_em': '2026-11-12T00:00:00-03:00',
                  'inicio_sono': '2026-11-11T23:00:00-03:00',
                  'fim_sono': '2026-11-12T06:30:00-03:00',
                  'duracao_horas': 7.5, 'qualidade': 4, 'interrupcoes': 1}
        for mudanca in ({'qualidade': True}, {'interrupcoes': -1},
                        {'fim_sono': '2026-11-12T06:30:00'},
                        {'noite_em': '2026-11-13T00:00:00-03:00'},
                        {'duracao_horas': float('nan')}, {'observacao': 'texto privado'}):
            with self.subTest(mudanca=mudanca):
                self.assertEqual(self.cliente.post(url, json={**valido, **mudanca}).status_code, 400)
        self.assertEqual(self.cliente.post('/api/astronautas/999/sono/registros', json=valido).status_code, 404)
        app.config['CAMINHO_BANCO'] = self.caminho.parent / 'ausente.db'
        self.assertEqual(self.cliente.post(url, json=valido).status_code, 503)
        self.assertFalse(app.config['CAMINHO_BANCO'].exists())

    def test_historico_e_avaliacao_usam_os_mesmos_dados(self):
        resposta = self.cliente.get('/api/astronautas/1/sono/registros')
        self.assertEqual(resposta.status_code, 200)
        dados = resposta.json
        self.assertEqual(dados['astronauta']['id'], 1)
        self.assertEqual(dados['linha_base']['duracao_media_horas'], 7.5)
        self.assertEqual(len(dados['registros']), 7)
        self.assertEqual([r['id'] for r in dados['registros']], sorted(r['id'] for r in dados['registros']))
        self.assertNotIn('observacao', dados['registros'][0])
        avaliacao = self.cliente.get(self.url + '?data=2026-11-10')
        self.assertEqual(avaliacao.json['estado'], 'amarelo')

    def test_historico_vazio_e_erros(self):
        conexao = database.conectar_banco(self.caminho)
        try:
            database.salvar_astronauta(conexao, {'id': 99, 'identificacao': 'TESTE',
                                               'nome_exibicao': 'Pessoa fictícia', 'origem': 'ficticia'})
        finally:
            conexao.close()
        resposta = self.cliente.get('/api/astronautas/99/sono/registros')
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json['registros'], [])
        self.assertIsNone(resposta.json['linha_base'])
        self.assertEqual(self.cliente.get('/api/astronautas/999/sono/registros').status_code, 404)
        self.assertEqual(self.cliente.get('/api/astronautas/0/sono/registros').status_code, 400)
        app.config['CAMINHO_BANCO'] = self.caminho.parent / 'ausente.db'
        self.assertEqual(self.cliente.get('/api/astronautas/1/sono/registros').status_code, 503)
        self.assertFalse(app.config['CAMINHO_BANCO'].exists())

    def test_historico_inconsistente_retorna_erro_generico(self):
        conexao = database.conectar_banco(self.caminho)
        try:
            with conexao:
                conexao.execute("UPDATE registros_sono SET noite_em = 'inválida' WHERE id = 1")
        finally:
            conexao.close()
        resposta = self.cliente.get('/api/astronautas/1/sono/registros')
        self.assertEqual(resposta.status_code, 422)
        self.assertIn('erro', resposta.json)

    def test_ausencia_e_identificador_inexistente(self):
        resposta = self.cliente.get(self.url, query_string={'data': '2026-11-14'})
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json['estado'], 'dados_insuficientes')
        self.assertEqual(self.cliente.get('/api/astronautas/999/sono/avaliacao?data=2026-11-10').status_code, 404)

    def test_data_invalida_e_banco_indisponivel(self):
        for consulta in ['', '?data=invalida', '?data=0001-01-01']:
            with self.subTest(consulta=consulta):
                self.assertEqual(self.cliente.get(self.url + consulta).status_code, 400)
        app.config['CAMINHO_BANCO'] = self.caminho.parent / 'ausente.db'
        self.assertEqual(self.cliente.get(self.url + '?data=2026-11-10').status_code, 503)

    def test_dados_duplicados_retorna_erro_generico(self):
        conexao = database.conectar_banco(self.caminho)
        try:
            registro = database.buscar_historico_sono(conexao, 1)[3]
            registro['noite_em'] = '2026-11-08T00:01:00-03:00'
            database.salvar_registro_sono(conexao, registro)
        finally:
            conexao.close()
        resposta = self.cliente.get(self.url + '?data=2026-11-10')
        self.assertEqual(resposta.status_code, 422)
        self.assertIn('erro', resposta.json)


if __name__ == '__main__':
    unittest.main()
