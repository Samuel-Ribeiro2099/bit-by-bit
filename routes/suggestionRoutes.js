
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// =========================================================
// LISTAR SUGESTÕES
// =========================================================

router.get('/', auth, async (req, res) => {
    try {
        const [sugestoes] = await pool.execute(
            `SELECT
                S.ID_SUG,
                S.ID_JOGO,
                S.DES_ALTERACAO,
                S.DADOS_PROPOSTOS,
                S.STATUS,
                S.ID_CONTA,
                S.CRIADO_EM,
                A.EMAIL AS AUTOR,
                J.TITULO AS TITULO_JOGO
             FROM SUGESTAO S
             INNER JOIN ADMIN A
                ON S.ID_CONTA = A.ID_CONTA
             INNER JOIN JOGO J
                ON S.ID_JOGO = J.ID_JOGO
             WHERE S.STATUS = 'pendente'
             ORDER BY S.CRIADO_EM DESC`
        );

        res.json(sugestoes);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: 'Erro ao listar sugestões.'
        });
    }
});

// =========================================================
// APROVAR SUGESTÃO
// =========================================================

router.post('/:id/aprovar', auth, async (req, res) => {
    const idSug = Number(req.params.id);

    if (!Number.isInteger(idSug) || idSug <= 0) {
        return res.status(400).json({
            erro: 'ID de sugestão inválido.'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [sugestoes] = await connection.execute(
            `SELECT *
             FROM SUGESTAO
             WHERE ID_SUG = ?
             FOR UPDATE`,
            [idSug]
        );

        if (sugestoes.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                erro: 'Sugestão não encontrada.'
            });
        }

        const sugestao = sugestoes[0];

        if (sugestao.STATUS !== 'pendente') {
            await connection.rollback();

            return res.status(409).json({
                erro: 'Esta sugestão já foi processada.'
            });
        }

        if (sugestao.ID_CONTA === req.admin.id) {
            await connection.rollback();

            return res.status(403).json({
                erro:
                    'O autor não pode aprovar a própria sugestão.'
            });
        }

        const dados = typeof sugestao.DADOS_PROPOSTOS === 'string'
            ? JSON.parse(sugestao.DADOS_PROPOSTOS)
            : sugestao.DADOS_PROPOSTOS;

        await connection.execute(
            `UPDATE JOGO
             SET TITULO = ?,
                 LINK_EXECUCAO = ?,
                 LINK_DOWNLOAD = ?,
                 IMAGEM_URL = ?,
                 FAI_ETA = ?,
                 DESENVOLVEDOR = ?,
                 ID_CAT = ?
             WHERE ID_JOGO = ?`,
            [
                dados.TITULO,
                dados.LINK_EXECUCAO,
                dados.LINK_DOWNLOAD,
                dados.IMAGEM_URL,
                dados.FAI_ETA || 'LIVRE',
                dados.DESENVOLVEDOR,
                dados.ID_CAT,
                sugestao.ID_JOGO
            ]
        );

        await connection.execute(
            `UPDATE SUGESTAO
             SET STATUS = 'aprovada'
             WHERE ID_SUG = ?`,
            [idSug]
        );

        await connection.execute(
            `INSERT INTO APROVACAO
                (ID_SUG, ID_CONTA, DATA_APROVACAO)
             VALUES (?, ?, NOW())`,
            [idSug, req.admin.id]
        );

        await connection.commit();

        res.json({
            mensagem: 'Sugestão aprovada e aplicada.'
        });

    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            erro: 'Erro ao aprovar sugestão.'
        });
    } finally {
        connection.release();
    }
});

// =========================================================
// REJEITAR SUGESTÃO
// =========================================================

router.post('/:id/rejeitar', auth, async (req, res) => {
    const idSug = Number(req.params.id);

    if (!Number.isInteger(idSug) || idSug <= 0) {
        return res.status(400).json({
            erro: 'ID inválido.'
        });
    }

    try {
        const [sugestoes] = await pool.execute(
            `SELECT ID_CONTA, STATUS
             FROM SUGESTAO
             WHERE ID_SUG = ?`,
            [idSug]
        );

        if (sugestoes.length === 0) {
            return res.status(404).json({
                erro: 'Sugestão não encontrada.'
            });
        }

        if (sugestoes[0].STATUS !== 'pendente') {
            return res.status(409).json({
                erro: 'Sugestão já processada.'
            });
        }

        if (sugestoes[0].ID_CONTA === req.admin.id) {
            return res.status(403).json({
                erro:
                    'O autor não pode rejeitar ' +
                    'a própria sugestão.'
            });
        }

        await pool.execute(
            `UPDATE SUGESTAO
             SET STATUS = 'rejeitada'
             WHERE ID_SUG = ?`,
            [idSug]
        );

        res.json({
            mensagem: 'Sugestão rejeitada.'
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: 'Erro ao rejeitar sugestão.'
        });
    }
});

module.exports = router;
