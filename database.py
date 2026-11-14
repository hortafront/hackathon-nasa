"""Inicialização e acesso ao banco local de leituras."""

import sqlite3
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


if __name__ == "__main__":
    inicializar_banco()
    print("Banco inicializado em instance/saude.db.")
