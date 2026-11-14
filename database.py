"""Inicialização e acesso ao banco local de leituras."""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path


# Caminhos relativos a este arquivo funcionam mesmo ao executar de outra pasta.
PASTA_PROJETO = Path(__file__).resolve().parent
CAMINHO_BANCO = PASTA_PROJETO / "instance" / "saude.db"
CAMINHO_SCHEMA = PASTA_PROJETO / "schema.sql"


def conectar_banco(caminho=CAMINHO_BANCO):
    """Abre o banco; quem chamar esta função deve fechar a conexão."""
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(caminho)


def inicializar_banco(caminho=CAMINHO_BANCO):
    """Cria as tabelas ausentes sem apagar as leituras existentes."""
    esquema = CAMINHO_SCHEMA.read_text(encoding="utf-8")
    conexao = conectar_banco(caminho)
    try:
        conexao.executescript(esquema)
        conexao.commit()
    finally:
        conexao.close()


def salvar_leitura(conexao, leitura):
    """Salva uma leitura já validada e retorna seus campos, incluindo o id."""
    campos = ("astronauta_id", "indicador", "valor", "unidade", "registrado_em", "origem")
    valores = tuple(leitura[campo] for campo in campos)
    with conexao:
        cursor = conexao.execute(
            """INSERT INTO leituras
               (astronauta_id, indicador, valor, unidade, registrado_em, origem)
               VALUES (?, ?, ?, ?, ?, ?)""",
            valores,
        )
    return {"id": cursor.lastrowid, **dict(zip(campos, valores))}


def _ordenar_leituras(cursor):
    """Ordena instantes em UTC, preservando microssegundos e desempate por id."""
    campos = [coluna[0] for coluna in cursor.description]
    leituras = [dict(zip(campos, linha)) for linha in cursor.fetchall()]

    def chave(leitura):
        instante = datetime.fromisoformat(leitura["registrado_em"].replace("Z", "+00:00"))
        if instante.utcoffset() is None:
            raise ValueError("O horário da leitura deve incluir fuso.")
        return instante.astimezone(timezone.utc), leitura["id"]

    return sorted(leituras, key=chave)


def buscar_ultima_leitura(conexao, astronauta_id):
    """Retorna a leitura mais recente do astronauta, ou None se não houver."""
    cursor = conexao.execute(
        """SELECT id, astronauta_id, indicador, valor, unidade, registrado_em, origem
           FROM leituras WHERE astronauta_id = ?""",
        (astronauta_id,),
    )
    leituras = _ordenar_leituras(cursor)
    return leituras[-1] if leituras else None


def buscar_historico(conexao, astronauta_id, indicador):
    """Retorna leituras do indicador, da mais antiga para a mais recente."""
    cursor = conexao.execute(
        """SELECT id, astronauta_id, indicador, valor, unidade, registrado_em, origem
           FROM leituras WHERE astronauta_id = ? AND indicador = ?""",
        (astronauta_id, indicador),
    )
    return _ordenar_leituras(cursor)


if __name__ == "__main__":
    inicializar_banco()
    print("Banco inicializado em instance/saude.db.")
