
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const pastaUploads = path.join(
    __dirname,
    '..',
    'uploads',
    'games'
);

fs.mkdirSync(pastaUploads, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaUploads);
    },

    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname)
            .toLowerCase();

        cb(
            null,
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`
        );
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 3 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (tiposPermitidos.includes(file.mimetype)) {
            return cb(null, true);
        }

        cb(new Error('Formato de imagem não permitido.'));
    }
});

// =========================================================
// LISTAR JOGOS
// =========================================================

router.get('/', async (req, res) => {
    try {
        const {
            busca,
            categoria,
            idade
        } = req.query;

        let sql = `
            SELECT
                J.ID_JOGO,
                J.TITULO,
                J.LINK_EXECUCAO,
                J.LINK_DOWNLOAD,
                J.IMAGEM_URL,
                J.FAI_ETA,
                J.DESCRICAO,
                J.DESENVOLVEDOR,
                C.NOME_CAT AS CATEGORIA
            FROM JOGO J
            INNER JOIN CATEGORIA C
                ON J.ID_CAT = C.ID_CAT
            WHERE 1 = 1
        `;

        const params = [];

        if (busca) {
            sql += `
                AND (
                    J.TITULO LIKE ?
                    OR J.DESCRICAO LIKE ?
                    OR C.NOME_CAT LIKE ?
                    OR J.DESENVOLVEDOR LIKE ?
                )
            `;

            const termo = `%${busca}%`;

            params.push(
                termo,
                termo,
                termo,
                termo
            );
        }

        if (categoria) {
            sql += ` AND C.NOME_CAT = ?`;
            params.push(categoria);
        }

        if (idade) {
            sql += ` AND J.FAI_ETA = ?`;
            params.push(idade);
        }

        sql += ` ORDER BY J.TITULO ASC`;

        const [jogos] = await pool.execute(
            sql,
            params
        );

        res.json(jogos);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: 'Erro ao consultar jogos.'
        });
    }
});

// =========================================================
// CONSULTAR JOGO
// =========================================================

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido.'
        });
    }

    try {
        const [jogos] = await pool.execute(
            `SELECT
                J.ID_JOGO,
                J.TITULO,
                J.LINK_EXECUCAO,
                J.LINK_DOWNLOAD,
                J.IMAGEM_URL,
                J.FAI_ETA,
                J.DESCRICAO,
                J.DESENVOLVEDOR,
                J.ID_CONTA,
                J.ID_CAT,
                C.NOME_CAT AS CATEGORIA
             FROM JOGO J
             INNER JOIN CATEGORIA C
                ON J.ID_CAT = C.ID_CAT
             WHERE J.ID_JOGO = ?`,
            [id]
        );

        if (jogos.length === 0) {
            return res.status(404).json({
                erro: 'Jogo não encontrado.'
            });
        }

        res.json(jogos[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: 'Erro ao consultar jogo.'
        });
    }
});

// =========================================================
// CADASTRAR JOGO
// =========================================================

router.post(
    '/',
    auth,
    upload.single('imagem'),
    async (req, res) => {
        const {
            titulo,
            categoria,
            desenvolvedor,
            faixaEtaria,
            linkExecucao,
            linkDownload,
            descricao
        } = req.body;

        if (!titulo || !categoria || !desenvolvedor) {
            return res.status(400).json({
                erro: 'Título, categoria e desenvolvedor são obrigatórios.'
            });
        }

        try {
            const [categorias] = await pool.execute(
                `SELECT ID_CAT FROM CATEGORIA
                 WHERE NOME_CAT = ?`,
                [categoria]
            );

            if (categorias.length === 0) {
                return res.status(400).json({
                    erro: 'Categoria inválida.'
                });
            }

            const imagem = req.file
                ? `/uploads/games/${req.file.filename}`
                : null;

            await pool.execute(
                `INSERT INTO JOGO (
                    TITULO,
                    LINK_EXECUCAO,
                    LINK_DOWNLOAD,
                    IMAGEM_URL,
                    FAI_ETA,
                    DESCRICAO,
                    DESENVOLVEDOR,
                    ID_CONTA,
                    ID_CAT
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    titulo.trim(),
                    linkExecucao || null,
                    linkDownload || null,
                    imagem,
                    faixaEtaria || 'LIVRE',
                    descricao || '',
                    desenvolvedor,
                    req.admin.id,
                    categorias[0].ID_CAT
                ]
            );

            res.status(201).json({
                mensagem: 'Jogo cadastrado.'
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                erro: 'Erro ao cadastrar jogo.'
            });
        }
    }
);

// =========================================================
// SUGERIR ALTERAÇÃO DE JOGO
// =========================================================

router.put(
    '/:id',
    auth,
    upload.single('imagem'),
    async (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID inválido.'
            });
        }

        const {
            titulo,
            categoria,
            desenvolvedor,
            faixaEtaria,
            linkExecucao,
            linkDownload,
            descricao
        } = req.body;

        try {
            const [jogos] = await pool.execute(
                `SELECT * FROM JOGO WHERE ID_JOGO = ?`,
                [id]
            );

            if (jogos.length === 0) {
                return res.status(404).json({
                    erro: 'Jogo não encontrado.'
                });
            }

            const jogo = jogos[0];

            const [categorias] = await pool.execute(
                `SELECT ID_CAT FROM CATEGORIA
                 WHERE NOME_CAT = ?`,
                [categoria]
            );

            if (categorias.length === 0) {
                return res.status(400).json({
                    erro: 'Categoria inválida.'
                });
            }

            const dados = {
                TITULO: titulo || jogo.TITULO,
                LINK_EXECUCAO: linkExecucao || null,
                LINK_DOWNLOAD: linkDownload || null,
                IMAGEM_URL: req.file
                    ? `/uploads/games/${req.file.filename}`
                    : jogo.IMAGEM_URL,
                FAI_ETA: faixaEtaria || 'LIVRE',
                DESCRICAO: descricao || '',
                DESENVOLVEDOR:
                    desenvolvedor || jogo.DESENVOLVEDOR,
                ID_CAT: categorias[0].ID_CAT
            };

            // A descrição é aplicada diretamente.
            // Os demais campos são submetidos à aprovação.

            const descricaoAlterada =
                dados.DESCRICAO !== jogo.DESCRICAO;

            const outrosCamposAlterados =
                dados.TITULO !== jogo.TITULO ||
                dados.LINK_EXECUCAO !== jogo.LINK_EXECUCAO ||
                dados.LINK_DOWNLOAD !== jogo.LINK_DOWNLOAD ||
                dados.IMAGEM_URL !== jogo.IMAGEM_URL ||
                dados.FAI_ETA !== jogo.FAI_ETA ||
                dados.DESENVOLVEDOR !== jogo.DESENVOLVEDOR ||
                dados.ID_CAT !== jogo.ID_CAT;

            if (descricaoAlterada) {
                await pool.execute(
                    `UPDATE JOGO
                     SET DESCRICAO = ?
                     WHERE ID_JOGO = ?`,
                    [dados.DESCRICAO, id]
                );
            }

            if (!outrosCamposAlterados) {
                return res.json({
                    mensagem: descricaoAlterada
                        ? 'Descrição atualizada diretamente.'
                        : 'Nenhuma alteração detectada.'
                });
            }

            const dadosPropostos = {
                TITULO: dados.TITULO,
                LINK_EXECUCAO: dados.LINK_EXECUCAO,
                LINK_DOWNLOAD: dados.LINK_DOWNLOAD,
                IMAGEM_URL: dados.IMAGEM_URL,
                FAI_ETA: dados.FAI_ETA,
                DESENVOLVEDOR: dados.DESENVOLVEDOR,
                ID_CAT: dados.ID_CAT
            };

            const alteracao = JSON.stringify(dadosPropostos);

            await pool.execute(
                `INSERT INTO SUGESTAO (
                    ID_JOGO,
                    DES_ALTERACAO,
                    DADOS_PROPOSTOS,
                    STATUS,
                    ID_CONTA
                )
                VALUES (?, ?, ?, 'pendente', ?)`,
                [
                    id,
                    `Alteração sugerida para o jogo ${jogo.TITULO}`,
                    alteracao,
                    req.admin.id
                ]
            );

            res.json({
                mensagem:
                    'Alterações enviadas para aprovação. ' +
                    'A descrição, se alterada, foi aplicada diretamente.'
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                erro: 'Erro ao sugerir alteração.'
            });
        }
    }
);

// =========================================================
// EXCLUIR JOGO
// =========================================================

router.delete('/:id', auth, async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido.'
        });
    }

    try {
        const [jogos] = await pool.execute(
            `SELECT ID_JOGO FROM JOGO WHERE ID_JOGO = ?`,
            [id]
        );

        if (jogos.length === 0) {
            return res.status(404).json({
                erro: 'Jogo não encontrado.'
            });
        }

        await pool.execute(
            `DELETE FROM JOGO WHERE ID_JOGO = ?`,
            [id]
        );

        res.json({
            mensagem: 'Jogo excluído.'
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: 'Erro ao excluir jogo.'
        });
    }
});

module.exports = router;
