"""Conecta o armazenamento à avaliação demonstrativa de sono."""

from datetime import date, datetime, timedelta

from avaliacao_sono import avaliar_sono
from database import buscar_historico_sono, buscar_linha_base_sono


def preparar_historico(registros):
    """Agrupa por data local de despertar, preservando duplicatas para validação."""
    por_data = {}
    for registro in registros:
        fim = datetime.fromisoformat(registro["fim_sono"].replace("Z", "+00:00"))
        if fim.utcoffset() is None:
            raise ValueError("O fim do sono deve incluir fuso.")
        por_data.setdefault(fim.date(), []).append(registro)
    return por_data


def _validar_avaliacao(astronauta_id, data_avaliacao):
    if type(data_avaliacao) is not date:
        raise ValueError("A data de avaliação deve ser uma data.")
    if isinstance(astronauta_id, bool) or not isinstance(astronauta_id, int) or astronauta_id <= 0:
        raise ValueError("O identificador deve ser um inteiro positivo.")


def avaliar_com_historico(astronauta_id, linha_base, por_data, data_avaliacao):
    _validar_avaliacao(astronauta_id, data_avaliacao)
    noites = []
    fontes = {}
    for deslocamento in (2, 1, 0):
        dia = data_avaliacao - timedelta(days=deslocamento)
        for registro in por_data.get(dia, []):
            noites.append({"data_sono": dia.isoformat(), "duracao_horas": registro["duracao_horas"]})
            fontes[dia.isoformat()] = {"origem": registro["origem"], "registrado_em": registro["fim_sono"]}

    referencia = linha_base["duracao_media_horas"] if linha_base else None
    resultado = avaliar_sono(referencia, noites, data_avaliacao)
    for noite in resultado["noites_consideradas"]:
        noite.update(fontes[noite["data_sono"]])
    return {"astronauta_id": astronauta_id, "origem_linha_base": linha_base["origem"] if linha_base else None,
            **resultado}


def avaliar_sono_do_astronauta(conexao, astronauta_id, data_avaliacao):
    """Avalia a janela escolhida, sem alterar o banco ou criar alertas."""
    _validar_avaliacao(astronauta_id, data_avaliacao)
    linha_base = buscar_linha_base_sono(conexao, astronauta_id)
    registros = buscar_historico_sono(conexao, astronauta_id)
    return avaliar_com_historico(astronauta_id, linha_base, preparar_historico(registros), data_avaliacao)
