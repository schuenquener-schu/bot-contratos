require('dotenv').config();
const imaps = require('imap-simple');

const config = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        tls: process.env.EMAIL_TLS === 'true',
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
    }
};

async function testEmail() {
    console.log('Tentando conectar ao email (IMAP)...');
    console.log(`Host: ${config.imap.host}:${config.imap.port}`);
    console.log(`User: ${config.imap.user}`);

    try {
        const connection = await imaps.connect(config);
        console.log('✅ CONECTADO COM SUCESSO!');

        await connection.openBox('INBOX');
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER'], markSeen: false };

        console.log('Buscando emails não lidos...');
        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`Encontrados: ${messages.length} mensagens não lidas.`);

        if (messages.length > 0) {
            console.log('Primeira mensagem:', messages[0].parts[0].body.subject);
        }

        connection.end();
        console.log('Conexão fechada.');
    } catch (err) {
        console.error('❌ ERRO AO CONECTAR:', err);
    }
}

testEmail();
