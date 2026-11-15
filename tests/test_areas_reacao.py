"""Integração demonstrativa das cinco áreas e do teste de reação."""

import tempfile
import unittest
import json
from datetime import date
from pathlib import Path

import database
import avaliacao_areas
from app import app


class TesteAreasReacao(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        self.caminho = Path(self.pasta.name) / 'teste.db'
        database.inicializar_banco(self.caminho)
        conexao = database.conectar_banco(self.caminho)
        database.carregar_dados_ficticios(conexao)
        self.primeira_carga = database.carregar_indicadores_ficticios(conexao)
        conexao.close()
        anterior = app.config['CAMINHO_BANCO']
        self.addCleanup(app.config.__setitem__, 'CAMINHO_BANCO', anterior)
        app.config['CAMINHO_BANCO'] = self.caminho
        self.cliente = app.test_client()
        self.url = '/api/astronautas/1/cognicao/testes'
        self.teste = {'realizado_em': '2026-11-11T08:00:00-03:00', 'tentativas': 10,
                      'mediana_ms': 0, 'mais_rapida_ms': 0, 'mais_lenta_ms': 0,
                      'acima_500ms': 0, 'antecipacoes': 1,
                      'tempos_ms': [200, 220, 240, 260, 280, 300, 320, 340, 520, 600]}

    def test_carga_idempotente_e_avaliacao_explicavel(self):
        self.assertEqual(self.primeira_carga['inseridos'], 15)
        conexao = database.conectar_banco(self.caminho)
        self.assertEqual(database.carregar_indicadores_ficticios(conexao)['ignorados'], 15)
        conexao.close()
        resposta = self.cliente.get('/api/astronautas/1/areas?data=2026-11-10')
        self.assertEqual(resposta.status_code, 200)
        areas = {a['id']: a for a in resposta.json['areas']}
        self.assertEqual(set(areas), {'sono', 'coracao', 'mente', 'exercicio', 'cognicao'})
        self.assertTrue(all(a['estado'] == 'amarelo' for a in areas.values()))
        self.assertEqual(areas['coracao']['linha_base']['valor'], 65)
        self.assertEqual([d['valor'] for d in areas['coracao']['dados']], [76, 78, 79])
        self.assertEqual(areas['cognicao']['dados'][0]['valor'], 363)
        self.assertNotIn('diario', str(areas))
        if date.today().isoformat() != '2026-11-10':
            self.assertEqual(resposta.json['estado_geral']['estado'], 'dados_insuficientes')
            self.assertTrue(all(a['historico'] for a in areas.values()))

    def test_carga_rejeita_conflitos_sem_sobrescrever(self):
        conexao = database.conectar_banco(self.caminho)
        try:
            with conexao:
                conexao.execute("UPDATE referencias_areas SET valor = 66 WHERE astronauta_id = 1 AND area = 'coracao'")
            with self.assertRaises(ValueError):
                database.carregar_indicadores_ficticios(conexao)
            self.assertEqual(conexao.execute("SELECT valor FROM referencias_areas WHERE astronauta_id = 1 AND area = 'coracao'").fetchone()[0], 66)
            self.assertEqual(conexao.execute('SELECT count(*) FROM indicadores_areas').fetchone()[0], 8)
        finally:
            conexao.close()

    def test_carga_rejeita_texto_nao_compartilhado(self):
        dados = json.loads(database.CAMINHO_INDICADORES.read_text(encoding='utf-8'))
        dados['checkins'][1]['diario'] = 'Texto fictício privado'
        caminho = self.caminho.parent / 'indicadores-invalidos.json'
        caminho.write_text(json.dumps(dados), encoding='utf-8')
        conexao = database.conectar_banco(self.caminho)
        self.addCleanup(conexao.close)
        with self.assertRaises(ValueError):
            database.carregar_indicadores_ficticios(conexao, caminho)
        self.assertEqual(conexao.execute("SELECT diario FROM checkins_noite WHERE data = '2026-11-09'").fetchone()[0], '')

    def test_estado_geral_exige_dados_completos_e_preserva_sinais(self):
        dia = date.fromisoformat('2026-11-10')
        conexao = database.conectar_banco(self.caminho)
        try:
            with conexao:
                conexao.execute("UPDATE registros_sono SET duracao_horas = 7.5 WHERE fim_sono LIKE '2026-11-0%' OR fim_sono LIKE '2026-11-10%'")
                conexao.execute("UPDATE indicadores_areas SET valor = 65 WHERE area = 'coracao'")
                conexao.execute("UPDATE indicadores_areas SET valor = 120 WHERE area = 'exercicio'")
                conexao.execute("UPDATE checkins_noite SET estresse = 2")
                conexao.execute("UPDATE testes_reacao SET mediana_ms = 285")
            resultado = avaliacao_areas.avaliar(conexao, 1, dia, hoje=dia)
            self.assertEqual(resultado['estado_geral']['estado'], 'verde')
            with conexao:
                conexao.execute("DELETE FROM checkins_noite WHERE data = '2026-11-09'")
            resultado = avaliacao_areas.avaliar(conexao, 1, dia, hoje=dia)
            self.assertEqual(resultado['estado_geral']['estado'], 'dados_insuficientes')
            with conexao:
                conexao.execute("UPDATE indicadores_areas SET valor = 80 WHERE area = 'coracao'")
            resultado = avaliacao_areas.avaliar(conexao, 1, dia, hoje=dia)
            self.assertEqual(resultado['estado_geral']['estado'], 'amarelo')
            self.assertIn('insufficient', resultado['estado_geral']['explicacao'])
        finally:
            conexao.close()

    def test_ausencia_ou_data_antiga_nao_viram_verde_atual(self):
        resposta = self.cliente.get('/api/astronautas/1/areas?data=2026-11-14')
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(all(a['estado'] == 'dados_insuficientes' for a in resposta.json['areas']))
        self.assertEqual(resposta.json['estado_geral']['estado'], 'dados_insuficientes')
        self.assertEqual(self.cliente.get('/api/astronautas/1/areas?data=invalida').status_code, 400)
        self.assertEqual(self.cliente.get('/api/astronautas/999/areas?data=2026-11-10').status_code, 404)
        self.assertIsNotNone(next(a for a in resposta.json['areas'] if a['id'] == 'coracao')['ultimo_registro'])

    def test_visao_medica_agrega_areas_e_ordena_tripulacao_ficticia(self):
        conexao = database.conectar_banco(self.caminho)
        database.carregar_dados_ficticios(conexao, database.CAMINHO_TRIPULACAO)
        database.carregar_dados_ficticios(conexao, database.CAMINHO_TRIPULACAO)
        conexao.close()
        resposta = self.cliente.get('/api/equipe-medica/sono?data=2026-11-10')
        self.assertEqual(resposta.status_code, 200)
        tripulantes = resposta.json['tripulantes']
        self.assertEqual([t['id'] for t in tripulantes], [1, 2, 3])
        self.assertEqual(len(tripulantes[0]['areas']), 5)
        self.assertIn('historical', resposta.json['ordem'])
        self.assertEqual(tripulantes[0]['checkins_noite'][0]['origem'], 'simulada')
        checkins = tripulantes[0]['checkins_noite']
        self.assertEqual([c['diario_compartilhado'] for c in checkins], [True, False, False])
        self.assertTrue(checkins[0]['diario'])
        self.assertEqual([c['diario'] for c in checkins[1:]], [None, None])
        self.assertEqual(len(tripulantes[0]['testes_reacao']), 1)
        self.assertEqual(self.cliente.get('/api/equipe-medica/sono?data=invalida').status_code, 400)

    def test_teste_e_recalculado_persistido_e_usado_na_area(self):
        resposta = self.cliente.post(self.url, json=self.teste)
        self.assertEqual(resposta.status_code, 201)
        salvo = resposta.json['teste']
        self.assertEqual((salvo['mediana_ms'], salvo['mais_rapida_ms'], salvo['mais_lenta_ms'], salvo['acima_500ms']),
                         (290, 200, 600, 2))
        self.assertEqual(salvo['origem'], 'teste_interativo_demonstrativo')
        self.assertEqual(self.cliente.post(self.url, json=self.teste).status_code, 409)
        historico = self.cliente.get(self.url).json
        self.assertEqual(historico['linha_base_ms'], 285)
        self.assertEqual(historico['testes'][-1]['tempos_ms'], self.teste['tempos_ms'])
        areas = self.cliente.get('/api/astronautas/1/areas?data=2026-11-11').json['areas']
        cognicao = next(a for a in areas if a['id'] == 'cognicao')
        self.assertEqual(cognicao['estado'], 'verde')
        self.assertEqual(cognicao['dados'][0]['valor'], 290)

    def test_indicador_ficticio_atualiza_area_e_rejeita_duplicata(self):
        url = '/api/astronautas/1/indicadores'
        dados = {'area': 'exercicio', 'valor': 0, 'registrado_em': '2026-11-12T12:00:00-03:00'}
        resposta = self.cliente.post(url, json=dados)
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json['registro']['unidade'], 'min')
        self.assertEqual(resposta.json['registro']['origem'], 'simulada')
        self.assertEqual(self.cliente.post(url, json={**dados, 'registrado_em': '2026-11-12T17:00:00Z'}).status_code, 409)
        areas = self.cliente.get('/api/astronautas/1/areas?data=2026-11-12').json['areas']
        exercicio = next(a for a in areas if a['id'] == 'exercicio')
        self.assertEqual(exercicio['dados'][-1]['valor'], 0)
        for alteracao in ({'area': 'mente'}, {'valor': -1}, {'valor': True},
                          {'registrado_em': '2026-11-12T12:00:00'},
                          {'registrado_em': '9999-01-01T00:00:00Z'}):
            self.assertEqual(self.cliente.post(url, json={**dados, **alteracao}).status_code, 400)
        self.assertEqual(self.cliente.post('/api/astronautas/999/indicadores', json=dados).status_code, 404)

    def test_entradas_invalidas_e_banco_indisponivel(self):
        for mudanca in ({'tempos_ms': [200] * 9}, {'tempos_ms': [True] * 10},
                        {'realizado_em': '2026-11-11T08:00:00'}, {'antecipacoes': -1},
                        {'realizado_em': '9999-01-01T00:00:00Z'}):
            with self.subTest(mudanca=mudanca):
                self.assertEqual(self.cliente.post(self.url, json={**self.teste, **mudanca}).status_code, 400)
        self.assertEqual(self.cliente.get('/api/astronautas/999/cognicao/testes').status_code, 404)
        app.config['CAMINHO_BANCO'] = self.caminho.parent / 'ausente.db'
        self.assertEqual(self.cliente.get(self.url).status_code, 503)
        self.assertEqual(self.cliente.get('/api/astronautas/1/areas?data=2026-11-10').status_code, 503)
        self.assertFalse(app.config['CAMINHO_BANCO'].exists())


if __name__ == '__main__':
    unittest.main()
