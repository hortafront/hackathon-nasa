from flask import Flask, jsonify, render_template, request
from datetime import date, datetime
from pathlib import Path
import sqlite3

import database
from servico_sono import avaliar_sono_do_astronauta

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


@app.route('/api/astronautas/<int:astronauta_id>/mente/checkins', methods=['GET', 'POST'])
def checkins_noite(astronauta_id):
    if astronauta_id < 1:
        return jsonify(erro='Identificador inválido.'), 400
    if request.method == 'POST':
        dados = request.get_json(silent=True)
        campos = {'data', 'humor', 'estresse', 'convivencia', 'diario', 'registrado_em'}
        try:
            if not isinstance(dados, dict) or set(dados) != campos:
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
                avaliacao = None
                if registros:
                    fim = datetime.fromisoformat(registros[-1]['fim_sono'].replace('Z', '+00:00'))
                    if fim.utcoffset() is None:
                        raise ValueError
                    avaliacao = avaliar_sono_do_astronauta(conexao, linha[0], fim.date())
                estado = avaliacao['estado'] if avaliacao else 'dados_insuficientes'
                tripulantes.append({
                    **astronauta, 'area': 'Sono', 'estado': estado,
                    'motivo': avaliacao['explicacao'] if avaliacao else 'Sem dados de sono para avaliar.',
                    'dados_compartilhados': [],
                    'data_avaliacao': avaliacao['data_avaliacao'] if avaliacao else None,
                    'reavaliar_em_horas': avaliacao['reavaliar_em_horas'] if avaliacao else None,
                    'linha_base_sono': database.buscar_linha_base_sono(conexao, linha[0]),
                    'registros_sono': registros,
                    'checkins_noite': database.buscar_checkins_noite(conexao, linha[0]),
                })
            ordem = {'amarelo': 0, 'dados_insuficientes': 1, 'verde': 2}
            tripulantes.sort(key=lambda item: (ordem.get(item['estado'], 1), item['id']))
            return jsonify(atualizado_em=datetime.now().astimezone().isoformat(),
                           ordem='Ordenado pela avaliação demonstrativa de sono: amarelo, dados insuficientes e verde. Não é triagem clínica.',
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
            datas = set()
            for registro in registros:
                fim = datetime.fromisoformat(registro['fim_sono'].replace('Z', '+00:00'))
                if fim.utcoffset() is None:
                    raise ValueError
                if fim.date() <= limite and fim.date().toordinal() >= 3:
                    datas.add(fim.date())
            datas.add(limite)
            avaliacoes = [avaliar_sono_do_astronauta(conexao, astronauta_id, dia) for dia in sorted(datas)]
            return jsonify(avaliacoes=avaliacoes)
        finally:
            conexao.close()
    except ValueError:
        return jsonify(erro='Dados de sono inconsistentes; avaliação indisponível.'), 422
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503

@app.route('/api/leituras/recentes', methods=['GET'])
def obter_leitura_recente():
    astrounata_id = request.args.get('astrounata_id', type=int)

    if astrounata_id != 1:
        return jsonify({
            'erro': 'Astrounatas não encontrados'
            }), 404

    leitura = {
        'astrounata_id': 1,
        'indicador': 'frequencia_cardiaca',
        'valor': 72,
        'unidade': 'bpm',
        'registrado_em': '2026-11-14T13:00:00-03:00',
        'origem': 'simulada'
    }

    return jsonify(leitura), 200

if __name__ =='__main__':
    app.run(debug=True)
