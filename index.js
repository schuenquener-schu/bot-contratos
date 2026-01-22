const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { checkEmails } = require('./src/services/email');
const { extractTextFromPDF } = require('./src/services/parser');
const { fetchServerList, findServerInPDF } = require('./src/services/sheets');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const express = require('express');
require('dotenv').config();

// --- CONFIGURAÇÃO WEB (Para manter o robô acordado) ---
const app = express();
const port = process.env.PORT || 3000; // Render usa a porta que a gente quiser (padrão 3000 ou 10000)

app.get('/', (req, res) => {
    res.send('<h1>🤖 Robô de Contratos Ativo</h1><p>Status: Operando normalmente.</p>');
});

app.listen(port, () => {
    console.log(`🌍 Servidor Web rodando na porta ${port}`);
});

// -----------------------------------------------------

console.log('🚀 Iniciando Robô de Automação...');

(async () => {
    let authStrategy;

    // Configuração do Banco de Dados (Essencial para Cloud)
    if (process.env.MONGODB_URI) {
        console.log('☁️  Conectando ao MongoDB...');
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            const store = new MongoStore({ mongoose: mongoose });
            authStrategy = new RemoteAuth({
                store: store,
                clientId: 'client_render_v1', // Nova sessão para casa nova
                backupSyncIntervalMs: 60000
            });
            console.log('✅ MongoDB Conectado!');
        } catch (err) {
            console.error(`❌ Erro MongoDB: ${err.message}`);
            authStrategy = new LocalAuth();
        }
    } else {
        console.log('🏠 Modo Local (Arquivos).');
        authStrategy = new LocalAuth();
    }

    const client = new Client({
        authStrategy: authStrategy,
        puppeteer: {
            headless: true,
            // Removemos caminhos fixos e deixamos o sistema decidir
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Importante para memória limitada
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('📸 QR CODE GERADO!');
        // Exibe no terminal (Render mostra os logs do terminal no painel)
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('🚀 TUDO PRONTO! O Robô está conectado e operando.');
        startEmailMonitoring();
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Carregando: ${percent}% - ${message}`);
    });

    client.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
    });

    client.on('auth_failure', msg => {
        console.error('❌ Falha na autenticação:', msg);
    });

    // Função de monitoramento
    async function startEmailMonitoring() {
        console.log('📧 Monitoramento de e-mails iniciado.');

        const runCycle = async () => {
            // Loop infinito seguro
            try {
                await checkEmails(async (pdfBuffer, subject, emailItem) => {
                    console.log(`📄 Processando PDF do e-mail: ${subject}`);

                    const serverList = await fetchServerList();
                    const pdfText = await extractTextFromPDF(pdfBuffer);
                    const combinedText = `${subject} ${pdfText}`.toUpperCase();
                    const match = findServerInPDF(combinedText, serverList);

                    if (match) {
                        console.log(`✅ MATCH ENCONTRADO: ${match.name}`);
                        // Lógica de envio da mensagem aqui...
                        // (Mantida simplificada para focar na migração)
                    }
                });
            } catch (e) {
                console.error(`⚠️ Erro no ciclo de verificação: ${e.message}`);
            }

            // Verifica a cada 60 segundos
            setTimeout(runCycle, 60000);
        };

        runCycle();
    }

    console.log('🤖 Inicializando cliente...');
    client.initialize().catch(err => {
        console.error('❌ ERRO FATAL DE INICIALIZAÇÃO:', err);
    });

})();
