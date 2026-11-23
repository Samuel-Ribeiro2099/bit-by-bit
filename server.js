
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');

const app = express();

const PORT = process.env.PORT || 3000;

// =========================================================
// MIDDLEWARES
// =========================================================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(express.json({
    limit: '1mb'
}));

app.use(express.urlencoded({
    extended: false,
    limit: '1mb'
}));

// =========================================================
// ARQUIVOS ESTÁTICOS
// =========================================================

app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);

app.use(
    '/uploads/games',
    express.static(
        path.join(__dirname, 'uploads', 'games')
    )
);

// =========================================================
// ROTAS
// =========================================================

app.use('/api/auth', authRoutes);
app.use('/api/jogos', gameRoutes);
app.use('/api/sugestoes', suggestionRoutes);

// =========================================================
// ERROS
// =========================================================

app.use((err, req, res, next) => {
    console.error(err);

    if (err instanceof Error) {
        return res.status(400).json({
            erro: err.message
        });
    }

    res.status(500).json({
        erro: 'Erro interno.'
    });
});

// =========================================================
// INICIALIZAÇÃO
// =========================================================

app.listen(PORT, () => {
    console.log(
        `Bit-By-Bit rodando em http://localhost:${PORT}`
    );
});
