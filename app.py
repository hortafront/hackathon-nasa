from flask import Flask, jsonify, request

app = Flask(__name__)

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
