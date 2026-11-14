"""Cenários fictícios para a regra demonstrativa de sono."""

import unittest
from datetime import date

from avaliacao_sono import avaliar_sono


class TesteAvaliacaoSono(unittest.TestCase):
    def setUp(self):
        self.hoje = date(2026, 11, 14)
        self.noites = [
            {"data_sono": "2026-11-12", "duracao_horas": 6},
            {"data_sono": "2026-11-13", "duracao_horas": 6.5},
            {"data_sono": "2026-11-14", "duracao_horas": 7},
        ]

    def test_tres_noites_abaixo_da_referencia(self):
        resultado = avaliar_sono(8, list(reversed(self.noites)), self.hoje)
        self.assertEqual(resultado["estado"], "amarelo")
        self.assertEqual(resultado["reavaliar_em_horas"], 24)
        self.assertEqual(resultado["noites_consideradas"], self.noites)

    def test_regra_nao_acionada(self):
        resultado = avaliar_sono(7, self.noites, self.hoje)
        self.assertEqual(resultado["estado"], "verde")
        self.assertIsNone(resultado["orientacao"])

    def test_ausencia_lacuna_e_dados_antigos(self):
        for base, noites in [(None, self.noites), (8, []), (8, self.noites[:2]),
                             (8, [self.noites[0], self.noites[2]])]:
            with self.subTest(base=base, noites=noites):
                self.assertEqual(avaliar_sono(base, noites, self.hoje)["estado"], "dados_insuficientes")

    def test_rejeita_dados_invalidos(self):
        for noites in [self.noites + [self.noites[0]],
                       [{"data_sono": "2026-11-15", "duracao_horas": 7}],
                       [{"data_sono": "2026-11-14", "duracao_horas": -1}],
                       [{"data_sono": "invalida", "duracao_horas": 7}]]:
            with self.subTest(noites=noites), self.assertRaises(ValueError):
                avaliar_sono(8, noites, self.hoje)
        for base in [0, float("nan"), True]:
            with self.subTest(base=base), self.assertRaises(ValueError):
                avaliar_sono(base, self.noites, self.hoje)


if __name__ == "__main__":
    unittest.main()
