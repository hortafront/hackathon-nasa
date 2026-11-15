"""Persistência e validação do teste interativo demonstrativo."""

import json
from datetime import datetime, timedelta, timezone


def _instante(texto):
    if not isinstance(texto, str):
        raise ValueError
    instante = datetime.fromisoformat(texto.replace('Z', '+00:00'))
    if instante.utcoffset() is None:
        raise ValueError
    return instante


def validar(dados, astronauta_id):
    campos = {'realizado_em', 'tentativas', 'mediana_ms', 'mais_rapida_ms', 'mais_lenta_ms',
              'acima_500ms', 'antecipacoes', 'tempos_ms'}
    if not isinstance(dados, dict) or set(dados) != campos:
        raise ValueError
    instante = _instante(dados['realizado_em'])
    if instante.astimezone(timezone.utc) > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError
    tempos = dados['tempos_ms']
    if (not isinstance(tempos, list) or len(tempos) != 10 or dados['tentativas'] != 10
            or type(dados['tentativas']) is not int
            or any(type(t) is not int or not 100 <= t <= 3600000 for t in tempos)
            or type(dados['antecipacoes']) is not int or not 0 <= dados['antecipacoes'] <= 100000):
        raise ValueError
    ordenados = sorted(tempos)
    return {'astronauta_id': astronauta_id, 'realizado_em': dados['realizado_em'], 'tentativas': 10,
            'mediana_ms': (ordenados[4] + ordenados[5] + 1) // 2,
            'mais_rapida_ms': ordenados[0], 'mais_lenta_ms': ordenados[-1],
            'acima_500ms': sum(t > 500 for t in tempos), 'antecipacoes': dados['antecipacoes'],
            'tempos_ms': tempos, 'origem': 'teste_interativo_demonstrativo'}


def salvar(conexao, dados):
    campos = ('astronauta_id', 'realizado_em', 'tentativas', 'mediana_ms', 'mais_rapida_ms',
              'mais_lenta_ms', 'acima_500ms', 'antecipacoes', 'tempos_ms', 'origem')
    valores = [json.dumps(dados[c]) if c == 'tempos_ms' else dados[c] for c in campos]
    with conexao:
        cursor = conexao.execute(
            '''INSERT INTO testes_reacao (astronauta_id, realizado_em, tentativas, mediana_ms,
               mais_rapida_ms, mais_lenta_ms, acima_500ms, antecipacoes, tempos_ms, origem)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', valores)
    return {'id': cursor.lastrowid, **dados}


def listar(conexao, astronauta_id):
    cursor = conexao.execute(
        '''SELECT id, astronauta_id, realizado_em, tentativas, mediana_ms, mais_rapida_ms,
                  mais_lenta_ms, acima_500ms, antecipacoes, tempos_ms, origem
           FROM testes_reacao WHERE astronauta_id = ?''', (astronauta_id,))
    campos = [c[0] for c in cursor.description]
    testes = [dict(zip(campos, linha)) for linha in cursor.fetchall()]
    for teste in testes:
        teste['tempos_ms'] = json.loads(teste['tempos_ms'])
    testes.sort(key=lambda t: (_instante(t['realizado_em']).astimezone(timezone.utc), t['id']))
    return testes
