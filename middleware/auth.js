
const jwt = require('jsonwebtoken');
const pool = require('../db');

async function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({
            erro: 'Autenticação necessária.'
        });
    }

    const token = header.slice(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [admins] = await pool.execute(
            `SELECT ID_CONTA, EMAIL, STATUS, BLOQUEADO_ATE
             FROM ADMIN
             WHERE ID_CONTA = ?`,
            [decoded.id]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                erro: 'Administrador não encontrado.'
            });
        }

        const admin = admins[0];

        if (admin.STATUS === 'bloqueado') {
            if (
                admin.BLOQUEADO_ATE &&
                new Date(admin.BLOQUEADO_ATE) > new Date()
            ) {
                return res.status(403).json({
                    erro: 'Conta bloqueada temporariamente.'
                });
            }
        }

        if (admin.STATUS !== 'ativo') {
            return res.status(403).json({
                erro: 'Conta administrativa não está ativa.'
            });
        }

        req.admin = {
            id: admin.ID_CONTA,
            email: admin.EMAIL
        };

        next();
    } catch (error) {
        return res.status(401).json({
            erro: 'Token inválido ou expirado.'
        });
    }
}

module.exports = auth;
