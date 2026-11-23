
const nodemailer = require('nodemailer');

let transporter;

async function getTransporter() {
    if (!transporter) {
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.smtp.user,
                pass: testAccount.smtp.pass
            }
        });

        console.log('Conta de teste Ethereal configurada.');
        console.log('Usuário SMTP:', testAccount.smtp.user);
    }

    return transporter;
}

async function enviarNotificacaoBloqueio(email, bloqueadoAte) {
    const mailer = await getTransporter();

    const info = await mailer.sendMail({
        from: 'Bit-By-Bit <no-reply@bitbybit.local>',
        to: email,
        subject: 'Conta administrativa bloqueada',
        text:
            `Sua conta foi bloqueada após três tentativas ` +
            `de login inválidas.\n\n` +
            `Bloqueio válido até: ${bloqueadoAte}\n\n` +
            `Caso não tenha sido você, entre em contato com o administrador.`
    });

    const url = nodemailer.getTestMessageUrl(info);

    console.log('Notificação de bloqueio enviada.');
    console.log('Ethereal Preview:', url || 'URL indisponível');

    return url;
}

module.exports = {
    enviarNotificacaoBloqueio
};
