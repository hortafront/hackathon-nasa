"""Avaliação demonstrativa de sono; não substitui avaliação profissional."""

from datetime import date, timedelta
from math import isfinite


def _duracao(valor):
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not isfinite(valor):
        raise ValueError("A duração deve ser um número finito de horas.")
    if not 0 < valor <= 24:
        raise ValueError("A duração deve ser maior que zero e no máximo 24 horas.")
    return valor


def avaliar_sono(linha_base_horas, registros, data_avaliacao):
    """Compara três noites fictícias consecutivas com uma referência individual.

    data_sono é a data local do despertar; data_avaliacao é explícita para
    evitar depender do relógio da máquina ou do fuso de uma missão simulada.
    """
    if type(data_avaliacao) is not date:
        raise ValueError("A data de avaliação deve ser uma data.")
    if linha_base_horas is not None:
        _duracao(linha_base_horas)

    noites = {}
    for registro in registros:
        try:
            data_texto = registro["data_sono"]
            dia = date.fromisoformat(data_texto)
            if dia.isoformat() != data_texto:
                raise ValueError
            horas = _duracao(registro["duracao_horas"])
        except (KeyError, TypeError, ValueError) as erro:
            raise ValueError("Registro de sono inválido.") from erro
        if dia > data_avaliacao or dia in noites:
            raise ValueError("Datas futuras ou repetidas não são aceitas.")
        noites[dia] = horas

    base = {
        "area": "sono",
        "data_avaliacao": data_avaliacao.isoformat(),
        "linha_base_horas": linha_base_horas,
        "origem_regra": "demonstracao_nao_clinica",
    }
    dias = [data_avaliacao - timedelta(days=i) for i in (2, 1, 0)]
    if linha_base_horas is None or any(dia not in noites for dia in dias):
        return {**base, "estado": "dados_insuficientes", "noites_consideradas": [],
                "explicacao": "São necessárias a referência individual e as três noites mais recentes consecutivas.",
                "orientacao": None, "reavaliar_em_horas": None}

    consideradas = [{"data_sono": dia.isoformat(), "duracao_horas": noites[dia]} for dia in dias]
    alteradas = all(noites[dia] < linha_base_horas for dia in dias)
    if alteradas:
        return {**base, "estado": "amarelo", "noites_consideradas": consideradas,
                "explicacao": "As três durações estão abaixo da referência individual fictícia.",
                "orientacao": "Revise os registros e acompanhe a evolução com a equipe responsável.",
                "reavaliar_em_horas": 24}
    return {**base, "estado": "verde", "noites_consideradas": consideradas,
            "explicacao": "A regra demonstrativa de três noites abaixo da referência não foi acionada.",
            "orientacao": None, "reavaliar_em_horas": None}
