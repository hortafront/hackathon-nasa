"""Testes do banco usando apenas leituras fictícias."""

import sqlite3
import json
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

    def test_sono_preserva_leituras_e_ordena_historico(self):
        astronauta = database.salvar_astronauta(self.conexao, {
            "id": 1,
            "identificacao": "RAGA-AST-001",
            "nome_exibicao": "Comandante Aurora",
            "origem": "ficticia",
        })
        self.assertEqual(astronauta["identificacao"], "RAGA-AST-001")
        database.salvar_linha_base_sono(self.conexao, {
            "astronauta_id": 1,
            "duracao_media_horas": 7.5,
            "qualidade_media": 4,
            "periodo_inicio": "2026-11-01T07:00:00-03:00",
            "periodo_fim": "2026-11-04T07:00:00-03:00",
            "origem": "simulada",
        })
        registros = [
            {"astronauta_id": 1, "noite_em": "2026-11-09T00:00:00-03:00", "inicio_sono": "2026-11-08T23:00:00-03:00", "fim_sono": "2026-11-09T06:00:00-03:00", "duracao_horas": 7, "qualidade": 3, "interrupcoes": 2, "origem": "simulada", "observacao": None},
            {"astronauta_id": 1, "noite_em": "2026-11-08T00:00:00-03:00", "inicio_sono": "2026-11-07T23:00:00-03:00", "fim_sono": "2026-11-08T06:00:00-03:00", "duracao_horas": 7, "qualidade": 4, "interrupcoes": 1, "origem": "simulada", "observacao": None},
        ]
        for registro in registros:
            database.salvar_registro_sono(self.conexao, registro)
        self.assertEqual(database.buscar_linha_base_sono(self.conexao, 1)["qualidade_media"], 4)
        historico = database.buscar_historico_sono(self.conexao, 1)
        self.assertEqual([item["noite_em"] for item in historico], [registros[1]["noite_em"], registros[0]["noite_em"]])
        self.assertEqual(database.buscar_historico_sono(self.conexao, 99), [])
        self.assertEqual(database.buscar_historico(self.conexao, 1, "frequencia_cardiaca")[0]["valor"], 72)

    def test_sono_rejeita_horario_sem_fuso_e_intervalo_invalido(self):
        base = {
            "astronauta_id": 1,
            "noite_em": "2026-11-08T00:00:00",
            "inicio_sono": "2026-11-07T23:00:00-03:00",
            "fim_sono": "2026-11-08T06:00:00-03:00",
            "duracao_horas": 7,
            "qualidade": 4,
            "interrupcoes": 1,
            "origem": "simulada",
            "observacao": None,
        }
        with self.assertRaises(ValueError):
            database.salvar_registro_sono(self.conexao, base)
        base["noite_em"] = "2026-11-08T00:00:00-03:00"
        base["fim_sono"] = "2026-11-07T22:00:00-03:00"
        with self.assertRaises(ValueError):
            database.salvar_registro_sono(self.conexao, base)

    def test_fixture_json_tem_tres_noites_alteradas(self):
        caminho = Path(__file__).parents[1] / "data" / "astronautas-ficticios.json"
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        registros = dados["astronautas"][0]["registros_sono"]
        alterados = [registro for registro in registros if "alterada" in registro["observacao"]]
        self.assertEqual(len(alterados), 3)


if __name__ == "__main__":
    unittest.main()
