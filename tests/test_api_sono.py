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
            database.salvar_registro_sono(conexao, registro)
        finally:
            conexao.close()
        resposta = self.cliente.get(self.url + '?data=2026-11-10')
        self.assertEqual(resposta.status_code, 422)
        self.assertIn('erro', resposta.json)


if __name__ == '__main__':
    unittest.main()
