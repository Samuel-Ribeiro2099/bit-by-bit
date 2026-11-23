
require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const admins = [
        {
            email: 'admin1@bitbybit.local',
            password: 'BitByBitAdmin123!'
        },
        {
            email: 'admin2@bitbybit.local',
            password: 'BitByBitAdmin456!'
        }
    ];

    try {
        for (const admin of admins) {
            const hash = await bcrypt.hash(admin.password, 10);

            await connection.execute(
                `UPDATE ADMIN
                 SET SENHA = ?, TENT_LOGIN = 0,
                     STATUS = 'ativo', BLOQUEADO_ATE = NULL
                 WHERE EMAIL = ?`,
                [hash, admin.email]
            );
        }

        console.log('Hashes dos administradores configurados.');
        console.log('Admin 1: admin1@bitbybit.local');
        console.log('Admin 2: admin2@bitbybit.local');
        console.log('Execute apenas em ambiente de teste.');
    } finally {
        await connection.end();
    }
}

main().catch(err => {
    console.error('Erro ao configurar administradores:', err);
    process.exit(1);
});
