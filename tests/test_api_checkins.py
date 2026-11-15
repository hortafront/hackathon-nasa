"""Integração dos check-ins e do compartilhamento fictício no banco local."""

import tempfile
import unittest
from pathlib import Path

import database
from app import app


class TesteCheckins(unittest.TestCase):
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
        self.url = '/api/astronautas/1/mente/checkins'
        self.dados = {'data': '2026-11-10', 'humor': 2, 'estresse': 4,
                      'convivencia': 3, 'diario': 'Registro fictício do dia.',
                      'diario_compartilhado': True,
                      'registrado_em': '2026-11-10T22:00:00-03:00'}

    def test_diario_e_respostas_persistem_e_aparecem_na_visao_medica(self):
        resposta = self.cliente.post(self.url, json=self.dados)
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json['checkin']['origem'], 'autorrelato_simulado')
        checkins = self.cliente.get(self.url).json['checkins']
        self.assertEqual(checkins[0]['diario'], self.dados['diario'])
        resposta_medica = self.cliente.get('/api/equipe-medica/sono')
        self.assertEqual(resposta_medica.status_code, 200)
        tripulante = resposta_medica.json['tripulantes'][0]
        self.assertEqual(tripulante['checkins_noite'], checkins)
        self.assertEqual(tripulante['checkins_noite'][0]['humor'], 2)
        self.assertEqual(len(tripulante['registros_sono']), 7)
        self.assertIn('observacao', tripulante['registros_sono'][0])
        self.assertEqual(self.cliente.post(self.url, json=self.dados).status_code, 409)

    def test_validacao_e_erros(self):
        self.assertEqual(self.cliente.get(self.url).json['checkins'], [])
        for mudanca in ({'humor': True}, {'estresse': 6}, {'data': 'inválida'},
                        {'registrado_em': '2026-11-10T22:00:00'},
                        {'diario': 'x' * 1001}, {'diario': None}, {'extra': 'x'},
                        {'diario_compartilhado': 1}):
            with self.subTest(mudanca=mudanca):
                self.assertEqual(self.cliente.post(self.url, json={**self.dados, **mudanca}).status_code, 400)
        self.assertEqual(self.cliente.get('/api/astronautas/999/mente/checkins').status_code, 404)
        self.assertEqual(self.cliente.post('/api/astronautas/999/mente/checkins', json=self.dados).status_code, 404)
        app.config['CAMINHO_BANCO'] = self.caminho.parent / 'ausente.db'
        self.assertEqual(self.cliente.get(self.url).status_code, 503)
        self.assertEqual(self.cliente.get('/api/equipe-medica/sono').status_code, 503)
        self.assertFalse(app.config['CAMINHO_BANCO'].exists())

    def test_reinicializacao_preserva_checkins(self):
        self.assertEqual(self.cliente.post(self.url, json=self.dados).status_code, 201)
        database.inicializar_banco(self.caminho)
        self.assertEqual(self.cliente.get(self.url).json['checkins'][0]['diario'], self.dados['diario'])

    def test_ordenacao_e_diario_opcional(self):
        self.assertEqual(self.cliente.post(self.url, json=self.dados).status_code, 201)
        anterior = {**self.dados, 'data': '2026-11-09', 'diario': '',
                    'registrado_em': '2026-11-09T22:00:00-03:00'}
        self.assertEqual(self.cliente.post(self.url, json=anterior).status_code, 201)
        checkins = self.cliente.get(self.url).json['checkins']
        self.assertEqual([c['data'] for c in checkins], ['2026-11-09', '2026-11-10'])
        self.assertEqual(checkins[0]['diario'], '')

    def test_privado_nao_e_gravado_nem_devolvido(self):
        dados = {**self.dados, 'diario_compartilhado': False}
        resposta = self.cliente.post(self.url, json=dados)
        self.assertEqual(resposta.status_code, 201)
        self.assertIsNone(resposta.json['checkin']['diario'])
        conexao = database.conectar_banco(self.caminho)
        self.addCleanup(conexao.close)
        self.assertEqual(conexao.execute('SELECT diario FROM checkins_noite').fetchone()[0], '')
        self.assertIsNone(self.cliente.get(self.url).json['checkins'][0]['diario'])
        self.assertIsNone(self.cliente.get('/api/equipe-medica/sono').json['tripulantes'][0]['checkins_noite'][0]['diario'])

    def test_campo_ausente_nao_implica_compartilhamento(self):
        dados = {chave: valor for chave, valor in self.dados.items() if chave != 'diario_compartilhado'}
        self.assertIsNone(self.cliente.post(self.url, json=dados).json['checkin']['diario'])

    def test_migracao_preserva_e_oculta_diario_anterior(self):
        caminho = self.caminho.parent / 'antigo.db'
        conexao = database.conectar_banco(caminho)
        esquema = database.CAMINHO_SCHEMA.read_text(encoding='utf-8')
        esquema = esquema.replace("    diario_compartilhado INTEGER NOT NULL DEFAULT 0 CHECK (diario_compartilhado IN (0, 1)),\n", '')
        conexao.executescript(esquema)
        database.carregar_dados_ficticios(conexao)
        conexao.execute("INSERT INTO checkins_noite (astronauta_id, data, humor, estresse, convivencia, diario, registrado_em, origem) VALUES (1, '2026-11-10', 2, 4, 3, 'texto antigo', '2026-11-10T22:00:00-03:00', 'simulada')")
        conexao.commit()
        conexao.close()

        database.inicializar_banco(caminho)
        database.inicializar_banco(caminho)
        conexao = database.conectar_banco(caminho)
        self.addCleanup(conexao.close)
        self.assertEqual(conexao.execute('SELECT diario, diario_compartilhado FROM checkins_noite').fetchone(), ('texto antigo', 0))
        self.assertIsNone(database.buscar_checkins_noite(conexao, 1)[0]['diario'])
        app.config['CAMINHO_BANCO'] = caminho
        self.assertIsNone(self.cliente.get(self.url).json['checkins'][0]['diario'])
        self.assertIsNone(self.cliente.get('/api/equipe-medica/sono').json['tripulantes'][0]['checkins_noite'][0]['diario'])


if __name__ == '__main__':
    unittest.main()
