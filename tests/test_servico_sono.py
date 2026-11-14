"""Integração da avaliação com armazenamento e cenário fictício."""

import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

import database
from servico_sono import avaliar_sono_do_astronauta


class TesteServicoSono(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)
        caminho = Path(self.pasta.name) / "teste.db"
        database.inicializar_banco(caminho)
        self.conexao = database.conectar_banco(caminho)
        self.addCleanup(self.conexao.close)
        fixture = json.loads((Path(__file__).parents[1] / "data" / "astronautas-ficticios.json").read_text(encoding="utf-8"))
        pessoa = fixture["astronautas"][0]
        database.salvar_astronauta(self.conexao, pessoa)
        database.salvar_linha_base_sono(self.conexao, {"astronauta_id": pessoa["id"], **pessoa["linha_base_sono"]})
        self.registros = pessoa["registros_sono"]
        for registro in self.registros:
            database.salvar_registro_sono(self.conexao, {"astronauta_id": pessoa["id"], **registro})

    def test_fixture_avalia_tres_noites_e_ignora_futuro(self):
        resultado = avaliar_sono_do_astronauta(self.conexao, 1, date(2026, 11, 10))
        self.assertEqual(resultado["estado"], "amarelo")
        self.assertEqual([r["duracao_horas"] for r in resultado["noites_consideradas"]], [6, 5.5, 4.5])

    def test_sem_dados_e_dados_antigos(self):
        self.assertEqual(avaliar_sono_do_astronauta(self.conexao, 99, date(2026, 11, 10))["estado"], "dados_insuficientes")
        self.assertEqual(avaliar_sono_do_astronauta(self.conexao, 1, date(2026, 11, 14))["estado"], "dados_insuficientes")

    def test_registros_duplicados_na_janela_sao_rejeitados(self):
        database.salvar_registro_sono(self.conexao, {"astronauta_id": 1, **self.registros[3]})
        with self.assertRaises(ValueError):
            avaliar_sono_do_astronauta(self.conexao, 1, date(2026, 11, 10))


if __name__ == "__main__":
    unittest.main()
