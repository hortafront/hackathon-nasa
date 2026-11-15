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

-- Uma noite por astronauta e por data local de despertar.
-- Bases antigas com duplicatas devem ser corrigidas conscientemente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_registros_sono_astronauta_noite
    ON registros_sono (astronauta_id, noite_em);

-- Somente dados fictícios: o diário acompanha o check-in compartilhado.
CREATE TABLE IF NOT EXISTS checkins_noite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronauta_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    humor INTEGER NOT NULL,
    estresse INTEGER NOT NULL,
    convivencia INTEGER NOT NULL,
    diario TEXT NOT NULL DEFAULT '',
    diario_compartilhado INTEGER NOT NULL DEFAULT 0 CHECK (diario_compartilhado IN (0, 1)),
    registrado_em TEXT NOT NULL,
    origem TEXT NOT NULL,
    UNIQUE (astronauta_id, data),
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id)
);

-- Acompanhamento demonstrativo: o resultado guardado é uma fotografia da regra.
CREATE TABLE IF NOT EXISTS acompanhamentos_sono (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronauta_id INTEGER NOT NULL,
    data_indicacao TEXT NOT NULL,
    avaliacao_inicial TEXT NOT NULL,
    reavaliar_a_partir_de TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    encerrado_em TEXT,
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id),
    UNIQUE (astronauta_id, data_indicacao)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_acompanhamento_sono_aberto
    ON acompanhamentos_sono (astronauta_id) WHERE encerrado_em IS NULL;

CREATE TABLE IF NOT EXISTS eventos_acompanhamento_sono (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acompanhamento_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('acao', 'reavaliacao')),
    registrado_em TEXT NOT NULL,
    data_avaliacao TEXT,
    conteudo TEXT NOT NULL,
    FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos_sono (id)
);

-- Referências e indicadores fictícios para regras ilustrativas das áreas.
CREATE TABLE IF NOT EXISTS referencias_areas (
    astronauta_id INTEGER NOT NULL,
    area TEXT NOT NULL,
    valor REAL NOT NULL,
    unidade TEXT NOT NULL,
    origem TEXT NOT NULL,
    PRIMARY KEY (astronauta_id, area),
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id)
);

CREATE TABLE IF NOT EXISTS indicadores_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronauta_id INTEGER NOT NULL,
    area TEXT NOT NULL,
    valor REAL NOT NULL,
    unidade TEXT NOT NULL,
    registrado_em TEXT NOT NULL,
    origem TEXT NOT NULL,
    UNIQUE (astronauta_id, area, registrado_em),
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id)
);

CREATE TABLE IF NOT EXISTS testes_reacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    astronauta_id INTEGER NOT NULL,
    realizado_em TEXT NOT NULL,
    tentativas INTEGER NOT NULL,
    mediana_ms INTEGER NOT NULL,
    mais_rapida_ms INTEGER NOT NULL,
    mais_lenta_ms INTEGER NOT NULL,
    acima_500ms INTEGER NOT NULL,
    antecipacoes INTEGER NOT NULL,
    tempos_ms TEXT NOT NULL,
    origem TEXT NOT NULL,
    UNIQUE (astronauta_id, realizado_em),
    FOREIGN KEY (astronauta_id) REFERENCES astronautas (id)
);
