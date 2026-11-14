-- A criação pode ser repetida sem apagar leituras existentes.
CREATE TABLE IF NOT EXISTS leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronauta_id INTEGER NOT NULL,
    indicador TEXT NOT NULL,
    valor REAL NOT NULL,
    unidade TEXT NOT NULL,
    -- Texto em formato ISO 8601, incluindo o fuso horário.
    registrado_em TEXT NOT NULL,
    -- Identifica a fonte da leitura, por exemplo, "simulada".
    origem TEXT NOT NULL
);
