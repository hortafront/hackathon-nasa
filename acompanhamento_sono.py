"""Ciclo persistido do caso fictício de sono; não representa cuidado clínico."""

import json
import sqlite3
from datetime import date, datetime, timedelta, timezone

import database
from servico_sono import avaliar_sono_do_astronauta


class ErroAcompanhamento(Exception):
    def __init__(self, mensagem, status):
        super().__init__(mensagem)
        self.status = status


def _data(texto):
    try:
        dia = date.fromisoformat(texto)
        if dia.isoformat() != texto or dia.toordinal() < 3 or dia > date.today():
            raise ValueError
        return dia
    except (TypeError, ValueError) as erro:
        raise ErroAcompanhamento('Informe data válida, não futura, em AAAA-MM-DD.', 400) from erro


def _agora():
    return datetime.now(timezone.utc).isoformat()


def _exigir_astronauta(conexao, astronauta_id):
    if astronauta_id < 1:
        raise ErroAcompanhamento('Identificador inválido.', 400)
    if not conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (astronauta_id,)).fetchone():
        raise ErroAcompanhamento('Astronauta não encontrado.', 404)


def _despertar(conexao, astronauta_id, dia):
    encontrados = []
    for registro in database.buscar_historico_sono(conexao, astronauta_id):
        fim = datetime.fromisoformat(registro['fim_sono'].replace('Z', '+00:00'))
        if fim.utcoffset() is None:
            raise ValueError('Horário sem fuso.')
        if fim.date() == dia:
            encontrados.append(fim)
    if len(encontrados) > 1:
        raise ValueError('Despertar duplicado.')
    if not encontrados:
        raise ErroAcompanhamento('Não há registro de despertar para a data escolhida.', 409)
    return encontrados[0]


def listar(conexao, astronauta_id):
    _exigir_astronauta(conexao, astronauta_id)
    cursor = conexao.execute(
        '''SELECT id, astronauta_id, data_indicacao, avaliacao_inicial,
                  reavaliar_a_partir_de, criado_em, encerrado_em
           FROM acompanhamentos_sono WHERE astronauta_id = ? ORDER BY id''',
        (astronauta_id,),
    )
    campos = [coluna[0] for coluna in cursor.description]
    acompanhamentos = [dict(zip(campos, linha)) for linha in cursor.fetchall()]
    for acompanhamento in acompanhamentos:
        acompanhamento['avaliacao_inicial'] = json.loads(acompanhamento['avaliacao_inicial'])
        cursor = conexao.execute(
            '''SELECT id, tipo, registrado_em, data_avaliacao, conteudo
               FROM eventos_acompanhamento_sono WHERE acompanhamento_id = ? ORDER BY id''',
            (acompanhamento['id'],),
        )
        campos = [coluna[0] for coluna in cursor.description]
        acompanhamento['eventos'] = [dict(zip(campos, linha)) for linha in cursor.fetchall()]
        for evento in acompanhamento['eventos']:
            evento['conteudo'] = json.loads(evento['conteudo'])
    return acompanhamentos


def _aberto(conexao, astronauta_id, acompanhamento_id):
    _exigir_astronauta(conexao, astronauta_id)
    acompanhamento = next((item for item in listar(conexao, astronauta_id)
                           if item['id'] == acompanhamento_id), None)
    if acompanhamento is None:
        raise ErroAcompanhamento('Acompanhamento não encontrado.', 404)
    if acompanhamento['encerrado_em'] is not None:
        raise ErroAcompanhamento('Este acompanhamento já foi encerrado.', 409)
    return acompanhamento


def iniciar(conexao, astronauta_id, data_avaliacao):
    dia = _data(data_avaliacao)
    try:
        with conexao:
            conexao.execute('BEGIN IMMEDIATE')
            _exigir_astronauta(conexao, astronauta_id)
            anteriores = listar(conexao, astronauta_id)
            if any(item['encerrado_em'] is None for item in anteriores):
                raise ErroAcompanhamento('Já existe acompanhamento de sono em aberto.', 409)
            datas_registradas = [item['data_indicacao'] for item in anteriores]
            datas_registradas.extend(evento['data_avaliacao'] for item in anteriores
                                     for evento in item['eventos'] if evento['tipo'] == 'reavaliacao')
            if datas_registradas and dia.isoformat() <= max(datas_registradas):
                raise ErroAcompanhamento('A indicação deve ser posterior ao último acompanhamento registrado.', 409)
            despertar = _despertar(conexao, astronauta_id, dia)
            avaliacao = avaliar_sono_do_astronauta(conexao, astronauta_id, dia)
            if avaliacao['estado'] != 'amarelo':
                raise ErroAcompanhamento('A data precisa ter avaliação amarela de sono.', 409)
            avaliacao['despertar_registrado_em'] = despertar.isoformat()
            cursor = conexao.execute(
                '''INSERT INTO acompanhamentos_sono
                   (astronauta_id, data_indicacao, avaliacao_inicial, reavaliar_a_partir_de, criado_em)
                   VALUES (?, ?, ?, ?, ?)''',
                (astronauta_id, dia.isoformat(), json.dumps(avaliacao, ensure_ascii=False),
                 (despertar + timedelta(hours=24)).isoformat(), _agora()),
            )
            identificador = cursor.lastrowid
    except sqlite3.IntegrityError as erro:
        raise ErroAcompanhamento('Já existe acompanhamento para esta indicação ou um acompanhamento aberto.', 409) from erro
    return next(item for item in listar(conexao, astronauta_id) if item['id'] == identificador)


def registrar_acao(conexao, astronauta_id, acompanhamento_id, acao):
    if acao != 'revisar_registros':
        raise ErroAcompanhamento('Ação demonstrativa inválida.', 400)
    with conexao:
        conexao.execute('BEGIN IMMEDIATE')
        acompanhamento = _aberto(conexao, astronauta_id, acompanhamento_id)
        if any(evento['tipo'] == 'acao' for evento in acompanhamento['eventos']):
            raise ErroAcompanhamento('A ação já foi registrada.', 409)
        conteudo = {'acao': acao, 'descricao': 'Revisão fictícia dos registros de sono.'}
        conexao.execute(
            '''INSERT INTO eventos_acompanhamento_sono
               (acompanhamento_id, tipo, registrado_em, conteudo) VALUES (?, 'acao', ?, ?)''',
            (acompanhamento_id, _agora(), json.dumps(conteudo, ensure_ascii=False)),
        )
    return next(item for item in listar(conexao, astronauta_id) if item['id'] == acompanhamento_id)


def reavaliar(conexao, astronauta_id, acompanhamento_id, data_avaliacao):
    dia = _data(data_avaliacao)
    with conexao:
        conexao.execute('BEGIN IMMEDIATE')
        acompanhamento = _aberto(conexao, astronauta_id, acompanhamento_id)
        if not any(evento['tipo'] == 'acao' for evento in acompanhamento['eventos']):
            raise ErroAcompanhamento('Registre a ação antes da reavaliação.', 409)
        datas_anteriores = [acompanhamento['data_indicacao']] + [
            evento['data_avaliacao'] for evento in acompanhamento['eventos']
            if evento['tipo'] == 'reavaliacao'
        ]
        if dia.isoformat() <= max(datas_anteriores):
            raise ErroAcompanhamento('A reavaliação exige uma data posterior à última avaliação registrada.', 409)
        despertar = _despertar(conexao, astronauta_id, dia)
        anteriores = [evento for evento in acompanhamento['eventos'] if evento['tipo'] == 'reavaliacao']
        ultima_avaliacao = anteriores[-1]['conteudo'] if anteriores else acompanhamento['avaliacao_inicial']
        despertar_anterior = datetime.fromisoformat(ultima_avaliacao['despertar_registrado_em'])
        if despertar.astimezone(timezone.utc) <= despertar_anterior.astimezone(timezone.utc):
            raise ErroAcompanhamento('O novo despertar deve ser posterior ao último avaliado.', 409)
        avaliacao = avaliar_sono_do_astronauta(conexao, astronauta_id, dia)
        avaliacao['despertar_registrado_em'] = despertar.isoformat()
        agora = _agora()
        conexao.execute(
            '''INSERT INTO eventos_acompanhamento_sono
               (acompanhamento_id, tipo, registrado_em, data_avaliacao, conteudo)
               VALUES (?, 'reavaliacao', ?, ?, ?)''',
            (acompanhamento_id, agora, dia.isoformat(), json.dumps(avaliacao, ensure_ascii=False)),
        )
        # Verde encerra somente esta regra ilustrativa; não comprova melhora clínica.
        if avaliacao['estado'] == 'verde':
            conexao.execute('UPDATE acompanhamentos_sono SET encerrado_em = ? WHERE id = ?',
                            (agora, acompanhamento_id))
    return next(item for item in listar(conexao, astronauta_id) if item['id'] == acompanhamento_id)
