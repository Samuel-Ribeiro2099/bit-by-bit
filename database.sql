
CREATE DATABASE IF NOT EXISTS bit_by_bit
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bit_by_bit;

-- =========================================================
-- TABELA ADMIN
-- =========================================================

CREATE TABLE ADMIN (
    ID_CONTA INT AUTO_INCREMENT PRIMARY KEY,
    EMAIL VARCHAR(100) NOT NULL UNIQUE,
    SENHA VARCHAR(255) NOT NULL,
    TENT_LOGIN INT NOT NULL DEFAULT 0,
    STATUS ENUM('ativo', 'bloqueado')
        NOT NULL DEFAULT 'ativo',
    BLOQUEADO_ATE DATETIME NULL,
    CRIADO_EM DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TABELA CATEGORIA
-- =========================================================

CREATE TABLE CATEGORIA (
    ID_CAT INT AUTO_INCREMENT PRIMARY KEY,
    NOME_CAT VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO CATEGORIA (NOME_CAT) VALUES
('Matemática'),
('Português'),
('Ciências'),
('História'),
('Geografia'),
('Inglês'),
('Artes'),
('Tecnologia'),
('Educação Física');

-- =========================================================
-- TABELA JOGO
-- =========================================================

CREATE TABLE JOGO (
    ID_JOGO INT AUTO_INCREMENT PRIMARY KEY,
    TITULO VARCHAR(100) NOT NULL,
    LINK_EXECUCAO VARCHAR(255),
    LINK_DOWNLOAD VARCHAR(255),
    IMAGEM_URL VARCHAR(255),
    FAI_ETA VARCHAR(20) NOT NULL DEFAULT 'LIVRE',
    DESCRICAO TEXT,
    DESENVOLVEDOR VARCHAR(100) NOT NULL DEFAULT 'Outros',
    ID_CONTA INT NOT NULL,
    ID_CAT INT NOT NULL,
    CRIADO_EM DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_JOGO_ADMIN
        FOREIGN KEY (ID_CONTA)
        REFERENCES ADMIN(ID_CONTA),

    CONSTRAINT FK_JOGO_CATEGORIA
        FOREIGN KEY (ID_CAT)
        REFERENCES CATEGORIA(ID_CAT)
);

-- =========================================================
-- TABELA SUGESTAO
-- =========================================================

CREATE TABLE SUGESTAO (
    ID_SUG INT AUTO_INCREMENT PRIMARY KEY,
    ID_JOGO INT NOT NULL,
    DES_ALTERACAO TEXT NOT NULL,
    DADOS_PROPOSTOS JSON NOT NULL,
    STATUS ENUM('pendente', 'aprovada', 'rejeitada')
        NOT NULL DEFAULT 'pendente',
    ID_CONTA INT NOT NULL,
    CRIADO_EM DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_SUGESTAO_JOGO
        FOREIGN KEY (ID_JOGO)
        REFERENCES JOGO(ID_JOGO)
        ON DELETE CASCADE,

    CONSTRAINT FK_SUGESTAO_ADMIN
        FOREIGN KEY (ID_CONTA)
        REFERENCES ADMIN(ID_CONTA)
);

-- =========================================================
-- TABELA APROVACAO
-- =========================================================

CREATE TABLE APROVACAO (
    ID_SUG INT NOT NULL,
    ID_CONTA INT NOT NULL,
    DATA_APROVACAO DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (ID_SUG, ID_CONTA),

    CONSTRAINT FK_APROVACAO_SUG
        FOREIGN KEY (ID_SUG)
        REFERENCES SUGESTAO(ID_SUG)
        ON DELETE CASCADE,

    CONSTRAINT FK_APROVACAO_ADMIN
        FOREIGN KEY (ID_CONTA)
        REFERENCES ADMIN(ID_CONTA)
);

-- =========================================================
-- ADMINISTRADORES DE TESTE
-- =========================================================

-- As senhas serão geradas por seed-admin.js após a instalação.
-- Os registros temporários abaixo não permitem login.

INSERT INTO ADMIN (EMAIL, SENHA) VALUES
('admin1@bitbybit.local', 'SEED_PASSWORD_1'),
('admin2@bitbybit.local', 'SEED_PASSWORD_2');


-- =========================================================
-- JOGOS INICIAIS
-- =========================================================

INSERT INTO JOGO (
    TITULO,
    LINK_EXECUCAO,
    LINK_DOWNLOAD,
    IMAGEM_URL,
    FAI_ETA,
    DESCRICAO,
    DESENVOLVEDOR,
    ID_CONTA,
    ID_CAT
) VALUES

(
    '2048',
    'https://play2048.co/',
    NULL,
    NULL,
    'LIVRE',
    'Jogo de lógica matemática no qual o jogador combina números iguais para formar valores maiores. Estimula raciocínio lógico, planejamento e cálculo.',
    'Outros',
    1,
    (SELECT ID_CAT FROM CATEGORIA WHERE NOME_CAT = 'Matemática')
),

(
    'Scratch',
    'https://scratch.mit.edu/',
    NULL,
    NULL,
    'LIVRE',
    'Plataforma interativa que permite criar animações, histórias e jogos utilizando programação visual. Pode ser utilizada para introduzir conceitos de lógica e programação.',
    'Outros',
    1,
    (SELECT ID_CAT FROM CATEGORIA WHERE NOME_CAT = 'Tecnologia')
),

(
    'Wordwall',
    'https://wordwall.net/',
    NULL,
    NULL,
    'LIVRE',
    'Plataforma que oferece atividades educativas interativas, incluindo jogos de associação, questionários, palavras e desafios.',
    'Outros',
    1,
    (SELECT ID_CAT FROM CATEGORIA WHERE NOME_CAT = 'Português')
),

(
    'GeoGuessr',
    'https://www.geoguessr.com/',
    NULL,
    NULL,
    'LIVRE',
    'Jogo de exploração geográfica no qual os jogadores tentam identificar locais do mundo a partir de imagens de paisagens e ruas.',
    'Outros',
    1,
    (SELECT ID_CAT FROM CATEGORIA WHERE NOME_CAT = 'Geografia')
),

(
    'Chess.com',
    'https://www.chess.com/',
    NULL,
    NULL,
    'LIVRE',
    'Plataforma de xadrez que permite jogar partidas, resolver desafios e aprender estratégias. Pode auxiliar no desenvolvimento do raciocínio lógico e planejamento.',
    'Outros',
    1,
    (SELECT ID_CAT FROM CATEGORIA WHERE NOME_CAT = 'Matemática')
);
