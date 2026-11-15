"""Comparações ilustrativas das áreas; não são regras clínicas."""

from datetime import date, datetime, timedelta
from math import isfinite

import database
from servico_sono import avaliar_com_historico, preparar_historico


NOMES = {'sono': 'Sleep', 'coracao': 'Heart', 'mente': 'Mind and crew',
         'exercicio': 'Exercise', 'cognicao': 'Cognition'}


def _area(chave, estado, resumo, dados=None, orientacao=None):
    return {'id': chave, 'nome': NOMES[chave], 'estado': estado, 'resumo': resumo,
            'dados': dados or [], 'orientacao': orientacao,
            'origem_regra': 'demonstracao_nao_clinica'}


def _instante(texto):
    instante = datetime.fromisoformat(texto.replace('Z', '+00:00'))
    if instante.utcoffset() is None:
        raise ValueError('Horário sem fuso.')
    return instante


def avaliar(conexao, astronauta_id, dia, hoje=None, registros_sono=None):
    """Avalia a data local indicada com regras arbitrárias documentadas pela equipe."""
    if type(dia) is not date or dia.toordinal() < 3:
        raise ValueError('Data inválida.')
    hoje = hoje or date.today()
    dias = [(dia - timedelta(days=n)).isoformat() for n in (2, 1, 0)]
    if registros_sono is None:
        registros_sono = database.buscar_historico_sono(conexao, astronauta_id)
    sono = avaliar_com_historico(astronauta_id, database.buscar_linha_base_sono(conexao, astronauta_id),
                                 preparar_historico(registros_sono), dia)
    areas = [_area('sono', sono['estado'], sono['explicacao'], sono['noites_consideradas'], sono['orientacao'])]
    historico_sono = [r for r in registros_sono
                      if _instante(r['fim_sono']).date() <= dia]
    if historico_sono:
        ultimo = max(historico_sono, key=lambda r: _instante(r['fim_sono']).timestamp())
        areas[0]['ultimo_registro'] = {'registrado_em': ultimo['fim_sono'], 'valor': ultimo['duracao_horas'],
                                       'unidade': 'h', 'origem': ultimo['origem']}

    referencias = {linha[0]: {'valor': linha[1], 'unidade': linha[2], 'origem': linha[3]}
                   for linha in conexao.execute(
                       'SELECT area, valor, unidade, origem FROM referencias_areas WHERE astronauta_id = ?',
                       (astronauta_id,))}
    for chave, unidade in (('coracao', 'bpm'), ('exercicio', 'min')):
        base = referencias.get(chave)
        registros = {}
        anteriores = []
        for valor, un, instante, origem in conexao.execute(
                'SELECT valor, unidade, registrado_em, origem FROM indicadores_areas WHERE astronauta_id = ? AND area = ?',
                (astronauta_id, chave)):
            data_local = _instante(instante).date().isoformat()
            if data_local <= dia.isoformat():
                anteriores.append({'data': data_local, 'valor': valor, 'unidade': un,
                                  'registrado_em': instante, 'origem': origem})
            if data_local not in dias:
                continue
            if (data_local in registros or un != unidade or not isinstance(valor, (int, float))
                    or not isfinite(valor) or valor < 0 or (chave == 'coracao' and valor == 0)):
                raise ValueError('Indicadores inconsistentes.')
            registros[data_local] = {'data': data_local, 'valor': valor, 'unidade': un,
                                     'registrado_em': instante, 'origem': origem}
        if (base is None or base['unidade'] != unidade or not isinstance(base['valor'], (int, float))
                or not isfinite(base['valor']) or base['valor'] <= 0 or any(d not in registros for d in dias)):
            area = _area(chave, 'dados_insuficientes',
                         'A fictional baseline and records for three consecutive dates are required.',
                         [registros[d] for d in dias if d in registros])
            if base is not None:
                area['linha_base'] = base
            if anteriores:
                area['ultimo_registro'] = max(anteriores, key=lambda r: _instante(r['registrado_em']).timestamp())
            areas.append(area)
            continue
        dados = [registros[d] for d in dias]
        if chave == 'coracao':
            alterado = all(r['valor'] >= base['valor'] + 10 for r in dados)
            resumo = ('Three simulated readings are at least 10 bpm above the fictional baseline.' if alterado
                      else 'The demonstration rule for three readings 10 bpm above baseline was not triggered.')
        else:
            alterado = all(r['valor'] < base['valor'] for r in dados)
            resumo = ('Three simulated durations are below the fictional plan.' if alterado
                      else 'The demonstration rule for three days below the fictional plan was not triggered.')
        area = _area(chave, 'amarelo' if alterado else 'verde', resumo, dados,
                     'Review the records and speak with the responsible team if you are concerned.' if alterado else None)
        area['linha_base'] = base
        area['ultimo_registro'] = dados[-1]
        areas.append(area)

    todos_checkins = [c for c in database.buscar_checkins_noite(conexao, astronauta_id) if c['data'] <= dia.isoformat()]
    checkins = {c['data']: c for c in todos_checkins if c['data'] in dias}
    if any(d not in checkins for d in dias):
        dados = [{'data': d, 'estresse': checkins[d]['estresse'], 'origem': checkins[d]['origem'],
                  'registrado_em': checkins[d]['registrado_em']} for d in dias if d in checkins]
        area = _area('mente', 'dados_insuficientes', 'Check-ins for three consecutive dates are required.', dados)
        if todos_checkins:
            ultimo = todos_checkins[-1]
            area['ultimo_registro'] = {'registrado_em': ultimo['registrado_em'], 'valor': ultimo['estresse'],
                                       'unidade': 'de 5', 'origem': ultimo['origem']}
        areas.append(area)
    else:
        dados = [{'data': d, 'estresse': checkins[d]['estresse'], 'origem': checkins[d]['origem'],
                  'registrado_em': checkins[d]['registrado_em']} for d in dias]
        alterado = all(c['estresse'] >= 4 for c in dados)
        area = _area('mente', 'amarelo' if alterado else 'verde',
                     'Three fictional stress responses were 4 or 5 out of 5.' if alterado else
                     'The demonstration rule for three stress responses was not triggered.', dados,
                     'Review the check-ins and consider speaking with the responsible team.' if alterado else None)
        area['ultimo_registro'] = {'registrado_em': dados[-1]['registrado_em'], 'valor': dados[-1]['estresse'],
                                   'unidade': 'de 5', 'origem': dados[-1]['origem']}
        areas.append(area)

    testes = []
    testes_anteriores = []
    for linha in conexao.execute(
            '''SELECT id, realizado_em, mediana_ms, origem FROM testes_reacao WHERE astronauta_id = ?''',
            (astronauta_id,)):
        instante = _instante(linha[1])
        if instante.date() <= dia:
            testes_anteriores.append({'id': linha[0], 'registrado_em': linha[1], 'valor': linha[2],
                                      'unidade': 'ms', 'origem': linha[3]})
        if instante.date() == dia:
            testes.append({'id': linha[0], 'registrado_em': linha[1], 'valor': linha[2],
                           'unidade': 'ms', 'origem': linha[3]})
    testes.sort(key=lambda t: (_instante(t['registrado_em']).timestamp(), t['id']))
    base = referencias.get('cognicao')
    if (not testes or base is None or base['unidade'] != 'ms' or not isinstance(base['valor'], (int, float))
            or not isfinite(base['valor']) or base['valor'] <= 0):
        area = _area('cognicao', 'dados_insuficientes', 'A test on the selected date and a fictional baseline are required.', testes[-1:])
        if base is not None:
            area['linha_base'] = base
        if testes_anteriores:
            area['ultimo_registro'] = max(testes_anteriores, key=lambda t: (_instante(t['registrado_em']).timestamp(), t['id']))
        areas.append(area)
    else:
        teste = testes[-1]
        alterado = teste['valor'] >= base['valor'] * 1.25
        area = _area('cognicao', 'amarelo' if alterado else 'verde',
                     'The demonstration test median is at least 25% above the fictional baseline.' if alterado else
                     'The demonstration rule for a median 25% above baseline was not triggered.', [teste],
                     'Review the result and speak with the responsible team if you are concerned.' if alterado else None)
        area['linha_base'] = base
        area['ultimo_registro'] = teste
        areas.append(area)

    areas.sort(key=lambda a: list(NOMES).index(a['id']))
    for area in areas:
        area['data_avaliacao'] = dia.isoformat()
        area['historico'] = dia != hoje
    if dia != hoje:
        geral = {'estado': 'dados_insuficientes', 'explicacao': 'Historical assessment: it does not determine the current situation.'}
    elif any(a['estado'] == 'amarelo' for a in areas):
        geral = {'estado': 'amarelo', 'explicacao': 'At least one demonstration rule was triggered; other areas may have insufficient data.'}
    elif any(a['estado'] == 'dados_insuficientes' for a in areas):
        geral = {'estado': 'dados_insuficientes', 'explicacao': 'There is not enough data to assess every area; missing data is not green.'}
    else:
        geral = {'estado': 'verde', 'explicacao': 'No demonstration rule was triggered by the available data; this does not prove health.'}
    return {'data_avaliacao': dia.isoformat(), 'estado_geral': geral, 'areas': areas}
