const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const _ = require('lodash');

const config = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        tls: process.env.EMAIL_TLS === 'true',
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 20000
    }
};

async function checkEmails(onContractFound) {
    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Busca e-mails NÃO LIDOS (UNSEEN) e RECENTES (últimas 48h)
        const delay = 48 * 3600 * 1000;
        const yesterday = new Date();
        yesterday.setTime(Date.now() - delay);

        const searchCriteria = [
            'UNSEEN',
            ['SINCE', yesterday.toISOString().split('T')[0]] // Formato YYYY-MM-DD para IMAP
        ];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            struct: true,
            markSeen: false // Só marca como lido se processar com sucesso (podemos mudar isso)
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length === 0) {
            console.log('Nenhum e-mail novo.');
            connection.end();
            return;
        }

        console.log(`${messages.length} novos e-mails encontrados.`);

        for (const item of messages) {
            const all = _.find(item.parts, { "which": "" });
            const id = item.attributes.uid;

            const idHeader = "Imap-Id: " + id + "\r\n";
            const mail = await simpleParser(idHeader + all.body);

            // Verifica anexos
            if (mail.attachments && mail.attachments.length > 0) {
                console.log(`[EMAIL] Processando: "${mail.subject}" | Anexos: ${mail.attachments.length}`);

                let hasPDF = false;
                for (const attachment of mail.attachments) {
                    if (attachment.contentType === 'application/pdf') {
                        hasPDF = true;
                        console.log(`  -> PDF encontrado: ${attachment.filename}`);
                        // Envia para o processamento (callback)
                        await onContractFound(attachment.content, mail.subject, item);
                    }
                }
                if (!hasPDF) console.log('  -> Nenhum PDF encontrado neste e-mail.');
            } else {
                console.log(`[EMAIL] Ignorado (Sem anexo): "${mail.subject}"`);
            }

            // Marca como lido após processar
            await connection.addFlags(id, '\\Seen');
        }

        connection.end();
    } catch (error) {
        console.error('Erro na verificação de e-mail:', error.message);
    }
}

module.exports = { checkEmails };
