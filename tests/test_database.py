"""Testes do banco usando apenas leituras fictícias."""

import sqlite3
import tempfile
import unittest
from pathlib import Path

import database


class TesteBanco(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        self.caminho = Path(self.pasta.name) / "teste.db"
        database.inicializar_banco(self.caminho)
        self.conexao = database.conectar_banco(self.caminho)
        self.addCleanup(self.conexao.close)
        self.leitura = {
            "astronauta_id": 1,
            "indicador": "frequencia_cardiaca",
            "valor": 72,
            "unidade": "bpm",
            "registrado_em": "2026-11-14T13:00:00+00:00",
            "origem": "simulada",
        }

    def test_banco_vazio_e_reinicializacao(self):
        self.assertIsNone(database.buscar_ultima_leitura(self.conexao, 1))
        self.assertEqual(database.buscar_historico(self.conexao, 1, "frequencia_cardiaca"), [])
        leitura = database.salvar_leitura(self.conexao, self.leitura)
        database.inicializar_banco(self.caminho)
        self.assertEqual(database.buscar_ultima_leitura(self.conexao, 1), leitura)

    def test_ordem_por_instante_fuso_e_microssegundo(self):
        horarios = ["2026-11-14T10:00:00.000002-03:00", "2026-11-14T13:00:00.000001+00:00"]
        ids = [database.salvar_leitura(self.conexao, {**self.leitura, "registrado_em": h})["id"] for h in horarios]
        historico = database.buscar_historico(self.conexao, 1, "frequencia_cardiaca")
        self.assertEqual([item["id"] for item in historico], [ids[1], ids[0]])
        self.assertEqual(database.buscar_ultima_leitura(self.conexao, 1)["id"], ids[0])

    def test_filtros_e_desempate(self):
        primeira = database.salvar_leitura(self.conexao, self.leitura)
        segunda = database.salvar_leitura(self.conexao, self.leitura)
        database.salvar_leitura(self.conexao, {**self.leitura, "astronauta_id": 2})
        database.salvar_leitura(self.conexao, {**self.leitura, "indicador": "outro"})
        historico = database.buscar_historico(self.conexao, 1, "frequencia_cardiaca")
        self.assertEqual([item["id"] for item in historico], [primeira["id"], segunda["id"]])
        self.assertEqual(database.buscar_historico(self.conexao, 1, "x' OR 1=1 --"), [])

    def test_campo_obrigatorio(self):
        with self.assertRaises(sqlite3.IntegrityError):
            database.salvar_leitura(self.conexao, {**self.leitura, "origem": None})
        self.assertEqual(database.buscar_historico(self.conexao, 1, "frequencia_cardiaca"), [])


if __name__ == "__main__":
    unittest.main()
