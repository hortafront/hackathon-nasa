"""Inicialização e acesso ao banco local de leituras."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


# Caminhos relativos a este arquivo funcionam mesmo ao executar de outra pasta.
PASTA_PROJETO = Path(__file__).resolve().parent
CAMINHO_BANCO = PASTA_PROJETO / "instance" / "saude.db"
CAMINHO_SCHEMA = PASTA_PROJETO / "schema.sql"
CAMINHO_DADOS = PASTA_PROJETO / "data" / "astronautas-ficticios.json"
CAMINHO_INDICADORES = PASTA_PROJETO / "data" / "indicadores-ficticios.json"
CAMINHO_TRIPULACAO = PASTA_PROJETO / "data" / "tripulacao-ficticia.json"


def _instante_com_fuso(valor, campo):
    """Valida um instante ISO 8601 com fuso e retorna o datetime convertido."""
    if not isinstance(valor, str):
        raise ValueError(f"{campo} deve ser texto ISO 8601 com fuso.")
    try:
        instante = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    except ValueError as erro:
        raise ValueError(f"{campo} deve ser ISO 8601 válido.") from erro
    if instante.utcoffset() is None:
        raise ValueError(f"{campo} deve incluir fuso horário.")
    return instante.astimezone(timezone.utc)


def _exigir_numero(valor, campo, minimo=None):
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{campo} deve ser numérico.")
    if minimo is not None and valor < minimo:
        raise ValueError(f"{campo} deve ser maior ou igual a {minimo}.")


def salvar_astronauta(conexao, astronauta):
    campos = ("id", "identificacao", "nome_exibicao", "origem")
    valores = tuple(astronauta[campo] for campo in campos)
    if not isinstance(valores[0], int) or valores[0] <= 0:
        raise ValueError("id deve ser um inteiro positivo.")
    if any(not isinstance(valor, str) or not valor.strip() for valor in valores[1:]):
        raise ValueError("identificação, nome e origem são obrigatórios.")
    with conexao:
        conexao.execute(
            """INSERT INTO astronautas (id, identificacao, nome_exibicao, origem)
               VALUES (?, ?, ?, ?)""",
            valores,
        )
    return dict(zip(campos, valores))


def salvar_linha_base_sono(conexao, linha_base):
    campos = ("astronauta_id", "duracao_media_horas", "qualidade_media",
              "periodo_inicio", "periodo_fim", "origem")
    valores = tuple(linha_base[campo] for campo in campos)
    if not isinstance(valores[0], int) or valores[0] <= 0:
        raise ValueError("astronauta_id deve ser um inteiro positivo.")
    _exigir_numero(valores[1], "duracao_media_horas", 0)
    _exigir_numero(valores[2], "qualidade_media", 0)
    _instante_com_fuso(valores[3], "periodo_inicio")
    _instante_com_fuso(valores[4], "periodo_fim")
    if not isinstance(valores[5], str) or not valores[5].strip():
        raise ValueError("origem é obrigatória.")
    with conexao:
        conexao.execute(
            """INSERT INTO linhas_base_sono
               (astronauta_id, duracao_media_horas, qualidade_media,
                periodo_inicio, periodo_fim, origem)
               VALUES (?, ?, ?, ?, ?, ?)""",
            valores,
        )
    return dict(zip(campos, valores))


def salvar_registro_sono(conexao, registro):
    campos = ("astronauta_id", "noite_em", "inicio_sono", "fim_sono",
              "duracao_horas", "qualidade", "interrupcoes", "origem", "observacao")
    valores = tuple(registro.get(campo) for campo in campos)
    if not isinstance(valores[0], int) or valores[0] <= 0:
        raise ValueError("astronauta_id deve ser um inteiro positivo.")
    _instante_com_fuso(valores[1], "noite_em")
    inicio = _instante_com_fuso(valores[2], "inicio_sono")
    fim = _instante_com_fuso(valores[3], "fim_sono")
    if fim <= inicio:
        raise ValueError("fim_sono deve ser posterior a inicio_sono.")
    _exigir_numero(valores[4], "duracao_horas", 0)
    _exigir_numero(valores[5], "qualidade", 0)
    if not isinstance(valores[6], int) or isinstance(valores[6], bool) or valores[6] < 0:
        raise ValueError("interrupcoes deve ser um inteiro não negativo.")
    if not isinstance(valores[7], str) or not valores[7].strip():
        raise ValueError("origem é obrigatória.")
    with conexao:
        cursor = conexao.execute(
            """INSERT INTO registros_sono
               (astronauta_id, noite_em, inicio_sono, fim_sono, duracao_horas,
                qualidade, interrupcoes, origem, observacao)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            valores,
        )
    return {"id": cursor.lastrowid, **dict(zip(campos, valores))}


def buscar_linha_base_sono(conexao, astronauta_id):
    cursor = conexao.execute(
        """SELECT astronauta_id, duracao_media_horas, qualidade_media,
                  periodo_inicio, periodo_fim, origem
           FROM linhas_base_sono WHERE astronauta_id = ?""",
        (astronauta_id,),
    )
    linha = cursor.fetchone()
    if linha is None:
        return None
    return dict(zip([coluna[0] for coluna in cursor.description], linha))


def buscar_historico_sono(conexao, astronauta_id):
    cursor = conexao.execute(
        """SELECT id, astronauta_id, noite_em, inicio_sono, fim_sono,
                  duracao_horas, qualidade, interrupcoes, origem, observacao
           FROM registros_sono WHERE astronauta_id = ?""",
        (astronauta_id,),
    )
    campos = [coluna[0] for coluna in cursor.description]
    registros = [dict(zip(campos, linha)) for linha in cursor.fetchall()]
    registros.sort(key=lambda registro: (
        _instante_com_fuso(registro["noite_em"], "noite_em"), registro["id"]
    ))
    return registros


def buscar_checkins_noite(conexao, astronauta_id):
    cursor = conexao.execute(
        """SELECT id, astronauta_id, data, humor, estresse, convivencia,
                  diario, registrado_em, origem
           FROM checkins_noite WHERE astronauta_id = ? ORDER BY data, id""",
        (astronauta_id,),
    )
    campos = [coluna[0] for coluna in cursor.description]
    return [dict(zip(campos, linha)) for linha in cursor.fetchall()]


def salvar_checkin_noite(conexao, checkin):
    campos = ("astronauta_id", "data", "humor", "estresse", "convivencia",
              "diario", "registrado_em", "origem")
    with conexao:
        cursor = conexao.execute(
            """INSERT INTO checkins_noite
               (astronauta_id, data, humor, estresse, convivencia, diario, registrado_em, origem)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            tuple(checkin[campo] for campo in campos),
        )
    return {"id": cursor.lastrowid, **{campo: checkin[campo] for campo in campos}}


def conectar_banco(caminho=CAMINHO_BANCO):
    """Abre o banco; quem chamar esta função deve fechar a conexão."""
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    conexao = sqlite3.connect(caminho)
    conexao.execute("PRAGMA foreign_keys = ON")
    return conexao


def inicializar_banco(caminho=CAMINHO_BANCO):
    """Cria as tabelas ausentes sem apagar as leituras existentes."""
    esquema = CAMINHO_SCHEMA.read_text(encoding="utf-8")
    conexao = conectar_banco(caminho)
    try:
        conexao.executescript(esquema)
        conexao.commit()
    finally:
        conexao.close()


def _ler_fixture(caminho):
    caminho = Path(caminho)
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as erro:
        raise ValueError("Nao foi possivel ler a fixture de dados ficticios.") from erro
    astronautas = dados.get("astronautas") if isinstance(dados, dict) else None
    if not isinstance(astronautas, list) or not astronautas:
        raise ValueError("A fixture deve conter uma lista nao vazia de astronautas.")
    return astronautas


def _inserir_ou_confirmar(conexao, tabela, chaves, colunas, valores):
    """Insere uma entidade ou confirma que a copia existente e identica."""
    placeholders = ", ".join("?" for _ in colunas)
    conexao.execute(
        f"INSERT OR IGNORE INTO {tabela} ({', '.join(colunas)}) VALUES ({placeholders})",
        valores,
    )
    where = " AND ".join(f"{campo} = ?" for campo in chaves)
    atual = conexao.execute(
        f"SELECT {', '.join(colunas)} FROM {tabela} WHERE {where}",
        tuple(valores[colunas.index(campo)] for campo in chaves),
    ).fetchone()
    if atual != tuple(valores):
        raise ValueError(f"Conflito ao carregar {tabela}.")


def carregar_dados_ficticios(conexao, caminho=CAMINHO_DADOS):
    """Carrega a fixture de forma idempotente e transacional.

    A funcao nao inicializa o banco. Qualquer erro desfaz a carga inteira.
    """
    astronautas = _ler_fixture(caminho)
    inseridos = {"astronautas": 0, "linhas_base_sono": 0, "registros_sono": 0}
    ignorados = {tabela: 0 for tabela in inseridos}
    with conexao:
        for astronauta in astronautas:
            astro = (astronauta["id"], astronauta["identificacao"],
                     astronauta["nome_exibicao"], astronauta["origem"])
            antes = conexao.total_changes
            _inserir_ou_confirmar(
                conexao, "astronautas", ("id",),
                ("id", "identificacao", "nome_exibicao", "origem"), astro,
            )
            (inseridos if conexao.total_changes > antes else ignorados)["astronautas"] += 1

            base = astronauta["linha_base_sono"]
            valores_base = (astro[0], base["duracao_media_horas"], base["qualidade_media"],
                            base["periodo_inicio"], base["periodo_fim"], base["origem"])
            _instante_com_fuso(valores_base[3], "periodo_inicio")
            _instante_com_fuso(valores_base[4], "periodo_fim")
            antes = conexao.total_changes
            _inserir_ou_confirmar(
                conexao, "linhas_base_sono", ("astronauta_id",),
                ("astronauta_id", "duracao_media_horas", "qualidade_media",
                 "periodo_inicio", "periodo_fim", "origem"), valores_base,
            )
            (inseridos if conexao.total_changes > antes else ignorados)["linhas_base_sono"] += 1

            for registro in astronauta["registros_sono"]:
                colunas = ("astronauta_id", "noite_em", "inicio_sono", "fim_sono",
                           "duracao_horas", "qualidade", "interrupcoes", "origem", "observacao")
                valores = tuple(
                    registro.get("astronauta_id", astro[0]) if campo == "astronauta_id"
                    else registro.get(campo)
                    for campo in colunas
                )
                if valores[0] != astro[0]:
                    raise ValueError("O registro de sono referencia outro astronauta.")
                _instante_com_fuso(valores[1], "noite_em")
                inicio = _instante_com_fuso(valores[2], "inicio_sono")
                fim = _instante_com_fuso(valores[3], "fim_sono")
                if fim <= inicio:
                    raise ValueError("fim_sono deve ser posterior a inicio_sono.")
                antes = conexao.total_changes
                _inserir_ou_confirmar(conexao, "registros_sono",
                                      ("astronauta_id", "noite_em"), colunas, valores)
                (inseridos if conexao.total_changes > antes else ignorados)["registros_sono"] += 1
    return {"inseridos": inseridos, "ignorados": ignorados}


def carregar_indicadores_ficticios(conexao, caminho=CAMINHO_INDICADORES):
    """Carga explícita, idempotente e transacional; conflitos não são sobrescritos."""
    try:
        dados = json.loads(Path(caminho).read_text(encoding='utf-8'))
        referencias, registros = dados['referencias'], dados['registros']
        checkins, testes = dados['checkins'], dados['testes']
        if not all(isinstance(lista, list) for lista in (referencias, registros, checkins, testes)):
            raise ValueError
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as erro:
        raise ValueError('Fixture de indicadores inválida.') from erro
    contagem = {'inseridos': 0, 'ignorados': 0}
    with conexao:
        for tabela, lista, colunas, chaves in (
            ('referencias_areas', referencias, ('astronauta_id', 'area', 'valor', 'unidade', 'origem'), ('astronauta_id', 'area')),
            ('indicadores_areas', registros, ('astronauta_id', 'area', 'valor', 'unidade', 'registrado_em', 'origem'), ('astronauta_id', 'area', 'registrado_em')),
        ):
            for item in lista:
                valores = tuple(item[campo] for campo in colunas)
                if item['area'] not in ('coracao', 'exercicio', 'cognicao') or item['origem'] != 'simulada':
                    raise ValueError('Indicador fictício inválido.')
                if tabela == 'indicadores_areas':
                    _instante_com_fuso(item['registrado_em'], 'registrado_em')
                antes = conexao.total_changes
                _inserir_ou_confirmar(conexao, tabela, chaves, colunas, valores)
                contagem['inseridos' if conexao.total_changes > antes else 'ignorados'] += 1
        colunas = ('astronauta_id', 'data', 'humor', 'estresse', 'convivencia', 'diario', 'registrado_em', 'origem')
        for item in checkins:
            _instante_com_fuso(item['registrado_em'], 'registrado_em')
            if item['origem'] != 'simulada':
                raise ValueError('Check-in fictício inválido.')
            antes = conexao.total_changes
            _inserir_ou_confirmar(conexao, 'checkins_noite', ('astronauta_id', 'data'), colunas,
                                  tuple(item[c] for c in colunas))
            contagem['inseridos' if conexao.total_changes > antes else 'ignorados'] += 1
        import servico_reacao
        colunas = ('astronauta_id', 'realizado_em', 'tentativas', 'mediana_ms', 'mais_rapida_ms',
                   'mais_lenta_ms', 'acima_500ms', 'antecipacoes', 'tempos_ms', 'origem')
        for item in testes:
            teste = servico_reacao.validar({k: v for k, v in item.items() if k != 'astronauta_id'}, item['astronauta_id'])
            teste['origem'] = 'simulada'
            valores = tuple(json.dumps(teste[c]) if c == 'tempos_ms' else teste[c] for c in colunas)
            antes = conexao.total_changes
            _inserir_ou_confirmar(conexao, 'testes_reacao', ('astronauta_id', 'realizado_em'), colunas, valores)
            contagem['inseridos' if conexao.total_changes > antes else 'ignorados'] += 1
    return contagem


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Inicializa o banco local do Raga.")
    parser.add_argument("--carregar-ficticios", action="store_true",
                        help="carrega explicitamente os dados de demonstração")
    argumentos = parser.parse_args()
    inicializar_banco()
    print("Banco inicializado em instance/saude.db.")
    if argumentos.carregar_ficticios:
        conexao = conectar_banco()
        try:
            resultado = carregar_dados_ficticios(conexao)
            print("Carga fictícia:", resultado)
            print("Tripulação fictícia:", carregar_dados_ficticios(conexao, CAMINHO_TRIPULACAO))
            print("Indicadores fictícios:", carregar_indicadores_ficticios(conexao))
        finally:
            conexao.close()
