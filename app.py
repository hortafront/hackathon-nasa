from flask import Flask, jsonify, render_template, request
from datetime import date, datetime, timedelta, timezone
from math import isfinite
from pathlib import Path
import sqlite3

import database
import acompanhamento_sono
import avaliacao_areas
import servico_reacao
from servico_sono import avaliar_com_historico, avaliar_sono_do_astronauta, preparar_historico

app = Flask(__name__)
app.config['CAMINHO_BANCO'] = database.CAMINHO_BANCO


@app.get('/')
@app.get('/index.html')
def pagina_painel():
    return render_template('index.html')


@app.get('/equipe-medica.html')
def pagina_equipe_medica():
    return render_template('equipe-medica.html')


@app.get('/checkins.html')
def pagina_checkins():
    return render_template('checkins.html')


@app.get('/teste-reacao.html')
def pagina_teste_reacao():
    return render_template('teste-reacao.html')


@app.get('/api/astronautas/<int:astronauta_id>/areas')
def obter_areas(astronauta_id):
    texto = request.args.get('data')
    try:
        dia = date.fromisoformat(texto)
        if dia.isoformat() != texto or dia.toordinal() < 3 or dia > date.today():
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(erro='Informe data válida, não futura, em AAAA-MM-DD.'), 400
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            if not conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (astronauta_id,)).fetchone():
                return jsonify(erro='Astronauta não encontrado.'), 404
            return jsonify(avaliacao_areas.avaliar(conexao, astronauta_id, dia))
        finally:
            conexao.close()
    except (ValueError, TypeError, OverflowError):
        return jsonify(erro='Dados inconsistentes; avaliação indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.post('/api/astronautas/<int:astronauta_id>/indicadores')
def registrar_indicador(astronauta_id):
    dados = request.get_json(silent=True)
    try:
        if not isinstance(dados, dict) or set(dados) != {'area', 'valor', 'registrado_em'}:
            raise ValueError
        area, valor, texto = dados['area'], dados['valor'], dados['registrado_em']
        if area not in ('coracao', 'exercicio') or isinstance(valor, bool) or not isinstance(valor, (int, float)) or not isfinite(valor):
            raise ValueError
        if not ((area == 'coracao' and 0 < valor <= 300) or (area == 'exercicio' and 0 <= valor <= 1440)):
            raise ValueError
        if not isinstance(texto, str):
            raise ValueError
        instante = datetime.fromisoformat(texto.replace('Z', '+00:00'))
        if instante.utcoffset() is None or instante.astimezone(timezone.utc) > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError
    except (TypeError, ValueError, OverflowError):
        return jsonify(erro='Indicador inválido. Informe área, valor e horário com fuso.'), 400
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            with conexao:
                conexao.execute('BEGIN IMMEDIATE')
                if not conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (astronauta_id,)).fetchone():
                    return jsonify(erro='Astronauta não encontrado.'), 404
                anteriores = conexao.execute(
                    'SELECT registrado_em FROM indicadores_areas WHERE astronauta_id = ? AND area = ?',
                    (astronauta_id, area)).fetchall()
                for (anterior,) in anteriores:
                    registrado = datetime.fromisoformat(anterior.replace('Z', '+00:00'))
                    if registrado.utcoffset() is None:
                        raise ValueError
                    if registrado.date() == instante.date():
                        return jsonify(erro='Já existe indicador desta área nessa data.'), 409
                unidade = 'bpm' if area == 'coracao' else 'min'
                cursor = conexao.execute(
                    '''INSERT INTO indicadores_areas (astronauta_id, area, valor, unidade, registrado_em, origem)
                       VALUES (?, ?, ?, ?, ?, 'simulada')''', (astronauta_id, area, valor, unidade, texto))
                registro = {'id': cursor.lastrowid, 'astronauta_id': astronauta_id, 'area': area,
                            'valor': valor, 'unidade': unidade, 'registrado_em': texto, 'origem': 'simulada'}
            return jsonify(registro=registro), 201
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Indicadores existentes inconsistentes.'), 422
    except sqlite3.IntegrityError:
        return jsonify(erro='Já existe indicador desta área nessa data.'), 409
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.route('/api/astronautas/<int:astronauta_id>/cognicao/testes', methods=['GET', 'POST'])
def testes_reacao(astronauta_id):
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    if request.method == 'POST':
        try:
            teste = servico_reacao.validar(request.get_json(silent=True), astronauta_id)
        except (ValueError, TypeError, OverflowError):
            return jsonify(erro='Teste inválido. Confira horário e as dez tentativas.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            linha = conexao.execute('SELECT id, identificacao, nome_exibicao, origem FROM astronautas WHERE id = ?',
                                   (astronauta_id,)).fetchone()
            if not linha:
                return jsonify(erro='Astronauta não encontrado.'), 404
            if request.method == 'POST':
                return jsonify(teste=servico_reacao.salvar(conexao, teste)), 201
            base = conexao.execute("SELECT valor FROM referencias_areas WHERE astronauta_id = ? AND area = 'cognicao' AND unidade = 'ms'",
                                   (astronauta_id,)).fetchone()
            return jsonify(astronauta=dict(zip(('id', 'identificacao', 'nome_exibicao', 'origem'), linha)),
                           linha_base_ms=base[0] if base else None,
                           testes=servico_reacao.listar(conexao, astronauta_id),
                           atualizado_em=datetime.now().astimezone().isoformat())
        finally:
            conexao.close()
    except (ValueError, TypeError, OverflowError):
        return jsonify(erro='Dados de testes inconsistentes.'), 422
    except sqlite3.IntegrityError:
        return jsonify(erro='Já existe um teste com este horário.'), 409
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


def _operacao_acompanhamento(operacao, sucesso):
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            return jsonify(operacao(conexao)), sucesso
        finally:
            conexao.close()
    except acompanhamento_sono.ErroAcompanhamento as erro:
        return jsonify(erro=str(erro)), erro.status
    except (ValueError, OverflowError, TypeError, KeyError):
        return jsonify(erro='Dados de sono inconsistentes; acompanhamento indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.route('/api/astronautas/<int:astronauta_id>/sono/acompanhamentos', methods=['GET', 'POST'])
def acompanhamentos_sono(astronauta_id):
    if request.method == 'GET':
        return _operacao_acompanhamento(
            lambda conexao: {'acompanhamentos': acompanhamento_sono.listar(conexao, astronauta_id)}, 200)
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict) or set(dados) != {'data_avaliacao'}:
        return jsonify(erro='Informe a data da avaliação.'), 400
    return _operacao_acompanhamento(
        lambda conexao: {'acompanhamento': acompanhamento_sono.iniciar(conexao, astronauta_id, dados['data_avaliacao'])}, 201)


@app.post('/api/astronautas/<int:astronauta_id>/sono/acompanhamentos/<int:acompanhamento_id>/acoes')
def acao_acompanhamento_sono(astronauta_id, acompanhamento_id):
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict) or set(dados) != {'acao'}:
        return jsonify(erro='Informe a ação demonstrativa.'), 400
    return _operacao_acompanhamento(
        lambda conexao: {'acompanhamento': acompanhamento_sono.registrar_acao(
            conexao, astronauta_id, acompanhamento_id, dados['acao'])}, 201)


@app.post('/api/astronautas/<int:astronauta_id>/sono/acompanhamentos/<int:acompanhamento_id>/reavaliacoes')
def reavaliacao_acompanhamento_sono(astronauta_id, acompanhamento_id):
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict) or set(dados) != {'data_avaliacao'}:
        return jsonify(erro='Informe a data da reavaliação.'), 400
    return _operacao_acompanhamento(
        lambda conexao: {'acompanhamento': acompanhamento_sono.reavaliar(
            conexao, astronauta_id, acompanhamento_id, dados['data_avaliacao'])}, 201)


@app.route('/api/astronautas/<int:astronauta_id>/mente/checkins', methods=['GET', 'POST'])
def checkins_noite(astronauta_id):
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    if request.method == 'POST':
        dados = request.get_json(silent=True)
        campos = {'data', 'humor', 'estresse', 'convivencia', 'diario', 'registrado_em'}
        try:
            if not isinstance(dados, dict) or not campos <= set(dados) or set(dados) - campos - {'diario_compartilhado'}:
                raise ValueError
            if type(dados.get('diario_compartilhado', False)) is not bool:
                raise ValueError
            dia = date.fromisoformat(dados['data'])
            if dia.isoformat() != dados['data'] or dia > date.today():
                raise ValueError
            instante = datetime.fromisoformat(dados['registrado_em'].replace('Z', '+00:00'))
            if instante.utcoffset() is None:
                raise ValueError
            if any(type(dados[campo]) is not int or not 1 <= dados[campo] <= 5
                   for campo in ('humor', 'estresse', 'convivencia')):
                raise ValueError
            if not isinstance(dados['diario'], str) or len(dados['diario']) > 1000:
                raise ValueError
            dados['diario_compartilhado'] = dados.get('diario_compartilhado', False)
            if not dados['diario_compartilhado']:
                dados['diario'] = ''
        except (TypeError, ValueError, AttributeError, OverflowError):
            return jsonify(erro='Check-in inválido. Confira data, escalas, diário e horário.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            linha = conexao.execute(
                'SELECT id, identificacao, nome_exibicao, origem FROM astronautas WHERE id = ?',
                (astronauta_id,),
            ).fetchone()
            if not linha:
                return jsonify(erro='Astronauta não encontrado.'), 404
            if request.method == 'GET':
                return jsonify(astronauta=dict(zip(('id', 'identificacao', 'nome_exibicao', 'origem'), linha)),
                               checkins=database.buscar_checkins_noite(conexao, astronauta_id))
            registro = database.salvar_checkin_noite(conexao, {
                **dados, 'astronauta_id': astronauta_id, 'origem': 'autorrelato_simulado',
            })
            return jsonify(checkin=registro), 201
        finally:
            conexao.close()
    except sqlite3.IntegrityError:
        return jsonify(erro='Já existe check-in para esta data.'), 409
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.get('/api/equipe-medica/sono')
def visao_medica():
    # Nesta demonstração local, a visão médica inclui os check-ins e o diário.
    texto = request.args.get('data')
    try:
        dia = date.fromisoformat(texto) if texto else date.today()
        if (texto and dia.isoformat() != texto) or dia.toordinal() < 3 or dia > date.today():
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(erro='Informe data válida, não futura, em AAAA-MM-DD.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            linhas = conexao.execute(
                'SELECT id, identificacao, nome_exibicao, origem FROM astronautas ORDER BY id'
            ).fetchall()
            tripulantes = []
            for linha in linhas:
                astronauta = dict(zip(('id', 'identificacao', 'nome_exibicao', 'origem'), linha))
                registros = database.buscar_historico_sono(conexao, linha[0])
                resumo = avaliacao_areas.avaliar(conexao, linha[0], dia, registros_sono=registros)
                estado = resumo['estado_geral']['estado']
                amarelas = [a['nome'] for a in resumo['areas'] if a['estado'] == 'amarelo']
                motivo = resumo['estado_geral']['explicacao']
                if amarelas:
                    motivo += ' Demonstration indications for the selected date: ' + ', '.join(amarelas) + '.'
                tripulantes.append({
                    **astronauta, 'area': None, 'estado': estado,
                    'motivo': motivo,
                    'dados_compartilhados': [a['nome'] + ': ' + a['resumo'] for a in resumo['areas']],
                    'areas': resumo['areas'],
                    'data_avaliacao': resumo['data_avaliacao'],
                    'reavaliar_em_horas': None,
                    'linha_base_sono': database.buscar_linha_base_sono(conexao, linha[0]),
                    'registros_sono': registros,
                    'checkins_noite': database.buscar_checkins_noite(conexao, linha[0]),
                    'testes_reacao': servico_reacao.listar(conexao, linha[0]),
                    '_prioridade': 0 if amarelas else (1 if estado == 'dados_insuficientes' else 2),
                })
            tripulantes.sort(key=lambda item: (item['_prioridade'], item['id']))
            for item in tripulantes:
                item.pop('_prioridade')
            return jsonify(atualizado_em=datetime.now().astimezone().isoformat(),
                           ordem='Ordered by demonstration indications for ' + dia.isoformat() +
                           ': yellow indications first, then insufficient data and green. Past dates are historical; this is not clinical triage.',
                           tripulantes=tripulantes, nao_exibido=[])
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Dados de sono inconsistentes; consulta indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.post('/api/astronautas/<int:astronauta_id>/sono/registros')
def registrar_sono(astronauta_id):
    # O formulário serve apenas para demonstrações com dados fictícios.
    dados = request.get_json(silent=True)
    campos = {'noite_em', 'inicio_sono', 'fim_sono', 'duracao_horas', 'qualidade', 'interrupcoes'}
    try:
        if not isinstance(dados, dict) or set(dados) != campos:
            raise ValueError
        instantes = []
        for campo in ('noite_em', 'inicio_sono', 'fim_sono'):
            texto = dados[campo]
            if not isinstance(texto, str):
                raise ValueError
            instante = datetime.fromisoformat(texto.replace('Z', '+00:00'))
            if instante.utcoffset() is None:
                raise ValueError
            instantes.append(instante)
        noite, inicio, fim = instantes
        duracao = (fim - inicio).total_seconds() / 3600
        if (noite.date() != fim.date() or noite.time().isoformat() != '00:00:00'
                or fim.date() > datetime.now(fim.tzinfo).date() or not 0 < duracao <= 16
                or type(dados['qualidade']) is not int or not 1 <= dados['qualidade'] <= 5
                or type(dados['interrupcoes']) is not int or not 0 <= dados['interrupcoes'] <= 30):
            raise ValueError
        if (isinstance(dados['duracao_horas'], bool)
                or not isinstance(dados['duracao_horas'], (int, float))
                or not 0 < dados['duracao_horas'] <= 16):
            raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify(erro='Dados de sono inválidos. Confira horários, data, qualidade e interrupções.'), 400

    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            # Serializa a verificação e inserção mesmo com dois envios simultâneos.
            conexao.execute('BEGIN IMMEDIATE')
            if not conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (astronauta_id,)).fetchone():
                return jsonify(erro='Astronauta não encontrado.'), 404
            registros = database.buscar_historico_sono(conexao, astronauta_id)
            for registro in registros:
                despertar = datetime.fromisoformat(registro['fim_sono'].replace('Z', '+00:00'))
                if despertar.utcoffset() is None:
                    raise ValueError
                if despertar.date() == fim.date():
                    return jsonify(erro='Já existe registro para esta data de despertar.'), 409
            registro = {
                'astronauta_id': astronauta_id, 'noite_em': dados['noite_em'],
                'inicio_sono': dados['inicio_sono'], 'fim_sono': dados['fim_sono'],
                'duracao_horas': round(duracao, 2), 'qualidade': dados['qualidade'],
                'interrupcoes': dados['interrupcoes'], 'origem': 'autorrelato_simulado',
            }
            registro = database.salvar_registro_sono(conexao, registro)
            registro.pop('observacao', None)
            return jsonify(registro=registro), 201
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Dados de sono inconsistentes; gravação indisponível.'), 422
    except sqlite3.IntegrityError:
        return jsonify(erro='Já existe registro para esta data de despertar.'), 409
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.get('/api/astronautas/<int:astronauta_id>/sono/registros')
def listar_registros_sono(astronauta_id):
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            linha = conexao.execute(
                'SELECT id, identificacao, nome_exibicao, origem FROM astronautas WHERE id = ?',
                (astronauta_id,),
            ).fetchone()
            if not linha:
                return jsonify(erro='Astronauta não encontrado.'), 404
            registros = database.buscar_historico_sono(conexao, astronauta_id)
            # Observações livres aguardam definição de política de acesso.
            for registro in registros:
                registro.pop('observacao', None)
            return jsonify(
                astronauta=dict(zip(('id', 'identificacao', 'nome_exibicao', 'origem'), linha)),
                linha_base=database.buscar_linha_base_sono(conexao, astronauta_id),
                registros=registros,
            )
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Dados de sono inconsistentes; consulta indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503


@app.get('/api/astronautas/<int:astronauta_id>/sono/avaliacao')
def obter_avaliacao_sono(astronauta_id):
    texto = request.args.get('data')
    try:
        data_avaliacao = date.fromisoformat(texto)
        if data_avaliacao.isoformat() != texto or data_avaliacao.toordinal() < 3:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(erro='Informe data válida em AAAA-MM-DD.'), 400

    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            existe = conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (astronauta_id,)).fetchone()
            if not existe:
                return jsonify(erro='Astronauta não encontrado.'), 404
            resultado = avaliar_sono_do_astronauta(conexao, astronauta_id, data_avaliacao)
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Dados de sono inconsistentes; avaliação indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503
    return jsonify(resultado), 200


@app.get('/api/astronautas/<int:astronauta_id>/sono/avaliacoes')
def listar_avaliacoes_sono(astronauta_id):
    try:
        texto = request.args.get('data')
        limite = date.fromisoformat(texto)
        if limite.isoformat() != texto or limite.toordinal() < 3:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(erro='Informe data válida em AAAA-MM-DD.'), 400
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    caminho = Path(app.config['CAMINHO_BANCO'])
    if not caminho.is_file():
        return jsonify(erro='Banco indisponível.'), 503
    try:
        conexao = database.conectar_banco(caminho)
        try:
            if not conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (astronauta_id,)).fetchone():
                return jsonify(erro='Astronauta não encontrado.'), 404
            registros = database.buscar_historico_sono(conexao, astronauta_id)
            por_data = preparar_historico(registros)
            linha_base = database.buscar_linha_base_sono(conexao, astronauta_id)
            datas = {dia for dia in por_data if dia <= limite and dia.toordinal() >= 3}
            datas.add(limite)
            avaliacoes = [avaliar_com_historico(astronauta_id, linha_base, por_data, dia) for dia in sorted(datas)]
            return jsonify(avaliacoes=avaliacoes)
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Dados de sono inconsistentes; avaliação indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503

if __name__ =='__main__':
    app.run(debug=True)
