from flask import Flask, jsonify, request
from datetime import date
from pathlib import Path
import sqlite3

import database
from servico_sono import avaliar_sono_do_astronauta

app = Flask(__name__)
app.config['CAMINHO_BANCO'] = database.CAMINHO_BANCO


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
