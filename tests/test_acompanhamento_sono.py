"""Fluxo demonstrativo de sono com banco temporário e dados fictícios."""

import tempfile
import unittest
from pathlib import Path

import database
from app import app


class TesteAcompanhamentoSono(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        self.caminho = Path(self.pasta.name) / 'teste.db'
        database.inicializar_banco(self.caminho)
        conexao = database.conectar_banco(self.caminho)
        database.carregar_dados_ficticios(conexao)
        conexao.close()
        anterior = app.config['CAMINHO_BANCO']
        self.addCleanup(app.config.__setitem__, 'CAMINHO_BANCO', anterior)
        app.config['CAMINHO_BANCO'] = self.caminho
        self.cliente = app.test_client()
        self.base = '/api/astronautas/1/sono/acompanhamentos'

    def iniciar(self):
        return self.cliente.post(self.base, json={'data_avaliacao': '2026-11-10'})

    def test_ciclo_completo_e_persistencia(self):
        resposta = self.iniciar()
        self.assertEqual(resposta.status_code, 201)
        acompanhamento = resposta.json['acompanhamento']
        self.assertEqual(acompanhamento['avaliacao_inicial']['estado'], 'amarelo')
        self.assertEqual(acompanhamento['reavaliar_a_partir_de'], '2026-11-11T05:30:00-03:00')
        self.assertIsNone(acompanhamento['encerrado_em'])
        caminho = self.base + '/' + str(acompanhamento['id'])
        self.assertEqual(self.iniciar().status_code, 409)
        self.assertEqual(self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'}).status_code, 409)
        self.assertEqual(self.cliente.post(caminho + '/acoes', json={'acao': 'revisar_registros'}).status_code, 201)
        self.assertEqual(self.cliente.post(caminho + '/acoes', json={'acao': 'revisar_registros'}).status_code, 409)
        self.assertEqual(self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-10'}).status_code, 409)
        resposta = self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'})
        self.assertEqual(resposta.status_code, 201)
        acompanhamento = resposta.json['acompanhamento']
        self.assertIsNotNone(acompanhamento['encerrado_em'])
        self.assertEqual([e['tipo'] for e in acompanhamento['eventos']], ['acao', 'reavaliacao'])
        self.assertEqual(acompanhamento['eventos'][-1]['conteudo']['estado'], 'verde')
        self.assertEqual(len(acompanhamento['eventos'][-1]['conteudo']['noites_consideradas']), 3)
        conexao = database.conectar_banco(self.caminho)
        with conexao:
            conexao.execute("UPDATE registros_sono SET duracao_horas = 5 WHERE noite_em LIKE '2026-11-11%'")
        conexao.close()
        database.inicializar_banco(self.caminho)
        self.assertEqual(self.cliente.get(self.base).json['acompanhamentos'][0], acompanhamento)
        self.assertEqual(self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'}).status_code, 409)
        self.assertEqual(self.iniciar().status_code, 409)
        self.assertEqual(self.cliente.post(self.base, json={'data_avaliacao': '2026-11-09'}).status_code, 409)

    def test_prazo_sugerido_nao_bloqueia_reavaliacao_antecipada(self):
        identificador = self.iniciar().json['acompanhamento']['id']
        caminho = self.base + '/' + str(identificador)
        self.cliente.post(caminho + '/acoes', json={'acao': 'revisar_registros'})
        conexao = database.conectar_banco(self.caminho)
        with conexao:
            conexao.execute("""UPDATE registros_sono SET inicio_sono = '2026-11-10T21:30:00-03:00',
                               fim_sono = '2026-11-11T05:00:00-03:00'
                               WHERE noite_em LIKE '2026-11-11%'""")
        conexao.close()
        resposta = self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'})
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json['acompanhamento']['eventos'][-1]['conteudo']['estado'], 'verde')

    def test_dados_insuficientes_mantem_acompanhamento_aberto(self):
        identificador = self.iniciar().json['acompanhamento']['id']
        caminho = self.base + '/' + str(identificador)
        self.cliente.post(caminho + '/acoes', json={'acao': 'revisar_registros'})
        conexao = database.conectar_banco(self.caminho)
        with conexao:
            conexao.execute("DELETE FROM registros_sono WHERE noite_em LIKE '2026-11-09%'")
        conexao.close()
        resposta = self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'})
        self.assertEqual(resposta.status_code, 201)
        self.assertIsNone(resposta.json['acompanhamento']['encerrado_em'])
        self.assertEqual(resposta.json['acompanhamento']['eventos'][-1]['conteudo']['estado'], 'dados_insuficientes')

    def test_regra_ainda_acionada_mantem_aberto_e_permite_nova_reavaliacao(self):
        identificador = self.iniciar().json['acompanhamento']['id']
        caminho = self.base + '/' + str(identificador)
        self.cliente.post(caminho + '/acoes', json={'acao': 'revisar_registros'})
        conexao = database.conectar_banco(self.caminho)
        with conexao:
            conexao.execute("UPDATE registros_sono SET duracao_horas = 4 WHERE noite_em LIKE '2026-11-11%'")
        database.salvar_registro_sono(conexao, {
            'astronauta_id': 1, 'noite_em': '2026-11-12T00:00:00-03:00',
            'inicio_sono': '2026-11-11T23:00:00-03:00', 'fim_sono': '2026-11-12T06:30:00-03:00',
            'duracao_horas': 7.5, 'qualidade': 3, 'interrupcoes': 1, 'origem': 'simulada',
        })
        conexao.close()
        resposta = self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'})
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json['acompanhamento']['eventos'][-1]['conteudo']['estado'], 'amarelo')
        self.assertIsNone(resposta.json['acompanhamento']['encerrado_em'])
        self.assertEqual(self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-11'}).status_code, 409)
        resposta = self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-12'})
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json['acompanhamento']['eventos'][-1]['conteudo']['estado'], 'verde')
        self.assertIsNotNone(resposta.json['acompanhamento']['encerrado_em'])

    def test_validacao_e_falhas(self):
        self.assertEqual(self.cliente.get(self.base).json['acompanhamentos'], [])
        for dados in ({}, {'data_avaliacao': 'inválida'}, {'data_avaliacao': '9999-01-01'}):
            with self.subTest(dados=dados):
                self.assertEqual(self.cliente.post(self.base, json=dados).status_code, 400)
        self.assertEqual(self.cliente.post(self.base, json={'data_avaliacao': '2026-11-11'}).status_code, 409)
        self.assertEqual(self.cliente.post('/api/astronautas/999/sono/acompanhamentos', json={'data_avaliacao': '2026-11-10'}).status_code, 404)
        identificador = self.iniciar().json['acompanhamento']['id']
        caminho = self.base + '/' + str(identificador)
        self.assertEqual(self.cliente.post(caminho + '/acoes', json={'acao': 'outra'}).status_code, 400)
        self.assertEqual(self.cliente.post(caminho + '/acoes', json={'acao': 'revisar_registros'}).status_code, 201)
        self.assertEqual(self.cliente.post(caminho + '/reavaliacoes', json={'data_avaliacao': '2026-11-12'}).status_code, 409)
        self.assertEqual(len(self.cliente.get(self.base).json['acompanhamentos'][0]['eventos']), 1)
        app.config['CAMINHO_BANCO'] = self.caminho.parent / 'ausente.db'
        self.assertEqual(self.cliente.get(self.base).status_code, 503)
        self.assertFalse(app.config['CAMINHO_BANCO'].exists())


if __name__ == '__main__':
    unittest.main()
