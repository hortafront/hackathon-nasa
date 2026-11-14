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

-- Entidades fictícias do primeiro caso de demonstração do Project Raga.
CREATE TABLE IF NOT EXISTS astronautas (
    id INTEGER PRIMARY KEY,
    identificacao TEXT NOT NULL UNIQUE,
    nome_exibicao TEXT NOT NULL,
    origem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS linhas_base_sono (
    astronauta_id INTEGER PRIMARY KEY,
    duracao_media_horas REAL NOT NULL,
    qualidade_media REAL NOT NULL,
    periodo_inicio TEXT NOT NULL,
    periodo_fim TEXT NOT NULL,
    origem TEXT NOT NULL,
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id)
);

CREATE TABLE IF NOT EXISTS registros_sono (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronauta_id INTEGER NOT NULL,
    noite_em TEXT NOT NULL,
    inicio_sono TEXT NOT NULL,
    fim_sono TEXT NOT NULL,
    duracao_horas REAL NOT NULL,
    qualidade REAL NOT NULL,
    interrupcoes INTEGER NOT NULL,
    origem TEXT NOT NULL,
    observacao TEXT,
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id)
);

CREATE INDEX IF NOT EXISTS idx_registros_sono_astronauta_noite
    ON registros_sono (astronauta_id, noite_em);

-- Uma noite por astronauta e por data local de despertar.
-- Bases antigas com duplicatas devem ser corrigidas conscientemente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_registros_sono_astronauta_noite
    ON registros_sono (astronauta_id, noite_em);
