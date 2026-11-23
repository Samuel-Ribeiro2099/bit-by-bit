
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const rateLimit = require('express-rate-limit');

const {
    enviarNotificacaoBloqueio
} = require('../utils/email');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        erro: 'Muitas requisições de login. Tente novamente mais tarde.'
    }
});

// =========================================================
// ADICIONAR 3 DIAS ÚTEIS
// =========================================================

function adicionarDiasUteis(data, quantidade) {
    const resultado = new Date(data);
    let adicionados = 0;

    while (adicionados < quantidade) {
        resultado.setDate(resultado.getDate() + 1);

        const dia = resultado.getDay();

        if (dia !== 0 && dia !== 6) {
            adicionados++;
        }
    }

    return resultado;
}

// =========================================================
// CADASTRO
// =========================================================

router.post('/cadastro', async (req, res) => {
    const { email, senha, chaveCadastro } = req.body;

    if (
        !email ||
        !senha ||
        !chaveCadastro
    ) {
        return res.status(400).json({
            erro: 'Preencha todos os campos.'
        });
    }

    if (chaveCadastro !== process.env.ADMIN_REGISTRATION_KEY) {
        return res.status(403).json({
            erro: 'Chave de cadastro inválida.'
        });
    }

    if (senha.length < 8) {
        return res.status(400).json({
            erro: 'A senha deve ter pelo menos 8 caracteres.'
        });
    }

    const emailNormalizado = String(email)
        .trim()
        .toLowerCase();

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)
    ) {
        return res.status(400).json({
            erro: 'E-mail inválido.'
        });
    }

    try {
        const [existentes] = await pool.execute(
            'SELECT ID_CONTA FROM ADMIN WHERE EMAIL = ?',
            [emailNormalizado]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        const hash = await bcrypt.hash(senha, 10);

        await pool.execute(
            `INSERT INTO ADMIN
                (EMAIL, SENHA, STATUS, TENT_LOGIN)
             VALUES (?, ?, 'ativo', 0)`,
            [emailNormalizado, hash]
        );

        return res.status(201).json({
            mensagem: 'Administrador cadastrado com sucesso.'
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: 'Erro ao cadastrar administrador.'
        });
    }
});

// =========================================================
// LOGIN
// =========================================================

router.post('/login', loginLimiter, async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: 'Informe e-mail e senha.'
        });
    }

    const emailNormalizado = String(email)
        .trim()
        .toLowerCase();

    try {
        const [admins] = await pool.execute(
            'SELECT * FROM ADMIN WHERE EMAIL = ?',
            [emailNormalizado]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        const admin = admins[0];

        // Verifica bloqueio

        if (
            admin.STATUS === 'bloqueado' &&
            admin.BLOQUEADO_ATE
        ) {
            const agora = new Date();
            const bloqueadoAte = new Date(admin.BLOQUEADO_ATE);

            if (bloqueadoAte > agora) {
                return res.status(403).json({
                    erro: 'Sua conta está bloqueada temporariamente.'
                });
            }

            // Bloqueio expirado

            await pool.execute(
                `UPDATE ADMIN
                 SET STATUS = 'ativo',
                     TENT_LOGIN = 0,
                     BLOQUEADO_ATE = NULL
                 WHERE ID_CONTA = ?`,
                [admin.ID_CONTA]
            );

            admin.STATUS = 'ativo';
            admin.TENT_LOGIN = 0;
        }

        if (admin.STATUS !== 'ativo') {
            return res.status(403).json({
                erro: 'Conta administrativa bloqueada.'
            });
        }

        // Verifica senha

        const senhaCorreta = await bcrypt.compare(
            senha,
            admin.SENHA
        );

        if (!senhaCorreta) {
            const tentativas = admin.TENT_LOGIN + 1;

            if (tentativas >= 3) {
                const bloqueadoAte = adicionarDiasUteis(
                    new Date(),
                    3
                );

                await pool.execute(
                    `UPDATE ADMIN
                     SET TENT_LOGIN = 3,
                         STATUS = 'bloqueado',
                         BLOQUEADO_ATE = ?
                     WHERE ID_CONTA = ?`,
                    [
                        bloqueadoAte,
                        admin.ID_CONTA
                    ]
                );

                try {
                    await enviarNotificacaoBloqueio(
                        admin.EMAIL,
                        bloqueadoAte.toISOString()
                    );
                } catch (emailError) {
                    console.error(
                        'Erro no e-mail de bloqueio:',
                        emailError
                    );
                }

                return res.status(403).json({
                    erro:
                        'Conta bloqueada após três ' +
                        'tentativas inválidas.'
                });
            }

            await pool.execute(
                `UPDATE ADMIN
                 SET TENT_LOGIN = ?
                 WHERE ID_CONTA = ?`,
                [tentativas, admin.ID_CONTA]
            );

            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.',
                tentativasRestantes: 3 - tentativas
            });
        }

        // Login correto: zerar contador

        await pool.execute(
            `UPDATE ADMIN
             SET TENT_LOGIN = 0,
                 STATUS = 'ativo',
                 BLOQUEADO_ATE = NULL
             WHERE ID_CONTA = ?`,
            [admin.ID_CONTA]
        );

        const token = jwt.sign(
            {
                id: admin.ID_CONTA,
                email: admin.EMAIL
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES || '8h'
            }
        );

        return res.json({
            mensagem: 'Login realizado.',
            token,
            admin: {
                id: admin.ID_CONTA,
                email: admin.EMAIL
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: 'Erro ao realizar login.'
        });
    }
});

// =========================================================
// RECUPERAÇÃO DE SENHA — DEMONSTRAÇÃO
// =========================================================

router.post('/recuperar', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            erro: 'Informe o e-mail.'
        });
    }

    const emailNormalizado = String(email)
        .trim()
        .toLowerCase();

    try {
        const [admins] = await pool.execute(
            `SELECT ID_CONTA FROM ADMIN
             WHERE EMAIL = ?`,
            [emailNormalizado]
        );

        // Resposta igual para e-mail existente ou inexistente

        if (admins.length > 0) {
            console.log(
                'Solicitação de recuperação para:',
                emailNormalizado
            );
        }

        return res.json({
            mensagem:
                'Se o e-mail estiver cadastrado, ' +
                'a solicitação será processada.'
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: 'Erro na recuperação.'
        });
    }
});

module.exports = router;
