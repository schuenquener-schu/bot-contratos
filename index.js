console.log('>>> RESTAURANDO O ROBÔ OFICIAL (VERSÃO ESTÁVEL) <<<');

const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCodeImage = require('qrcode');
const { checkEmails } = require('./src/services/email');
const { extractTextFromPDF, findServerInPDF } = require('./src/services/parser');
const { fetchServerList } = require('./src/services/sheets');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const express = require('express');
require('dotenv').config();

// -- VARIÁVEIS DE ESTADO --
let currentQR = null;
let isReady = false;
let startupTime = new Date().toLocaleTimeString();
let mongoStatus = "Desconectado";

// --- SERVIDOR WEB ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    // 1. Robô Pronto
    if (isReady) {
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; padding:50px; background:#d4edda; color:#155724; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h1 style="font-size:3em;">✅</h1>
                <h1>Robô Operando!</h1>
                <p>Status: <strong>CONECTADO</strong></p>
                <p>Banco de Dados: ${mongoStatus}</p>
                <p>Iniciado às: ${startupTime}</p>
            </div>
        `);
    }

    // 2. QR Code (Scanner)
    if (currentQR) {
        const url = await QRCodeImage.toDataURL(currentQR);
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; padding:20px; background:#f0f2f5; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h1 style="color:#128C7E;">Conectar WhatsApp</h1>
                <p>Abra o WhatsApp no celular > Menu > Aparelhos conectados > Conectar</p>
                <div style="background:white; padding:15px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1); margin: 20px;">
                    <img src="${url}" style="width: 250px; height: 250px;" />
                </div>
                <p style="color:#555;">⚠️ A página atualiza a cada 5s.</p>
                <script>setTimeout(() => window.location.reload(), 5000);</script>
            </div>
        `);
    }

    // 3. Carregando
    return res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#fff3cd; color:#856404; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <h1>⏳ Carregando...</h1>
            <p>Iniciando sistemas...</p>
            <script>setTimeout(() => window.location.reload(), 3000);</script>
        </div>
    `);
});

app.listen(port, () => {
    console.log(`🌍 SISTEMA VISUAL ONLINE NA PORTA ${port}`);
});

// --- LÓGICA DO ROBÔ ---
(async () => {
    let authStrategy;

    // Configuração MongoDB Segura (Não derruba o robô se falhar)
    if (process.env.MONGODB_URI) {
        try {
            console.log('🔄 Tentando conectar ao MongoDB...');
            await mongoose.connect(process.env.MONGODB_URI);
            const store = new MongoStore({ mongoose: mongoose });
            authStrategy = new RemoteAuth({
                store: store,
                clientId: 'client_render_stable_v1',
                backupSyncIntervalMs: 60000
            });
            mongoStatus = "Conectado ✅";
            console.log('✅ MongoDB Conectado!');
        } catch (err) {
            console.error('⚠️ Falha no MongoDB (Usando modo local temporário):', err.message);
            mongoStatus = "Erro (Usando Local) ⚠️";
            authStrategy = new LocalAuth();
        }
    } else {
        authStrategy = new LocalAuth();
    }

    const client = new Client({
        authStrategy: authStrategy,
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu']
        }
    });

    client.on('qr', (qr) => {
        console.log('📸 QR CODE GERADO NO SITE');
        currentQR = qr;
        isReady = false;
        qrcode.generate(qr, { small: true }); // Backup no terminal
    });

    client.on('ready', () => {
        console.log('✅ ROBÔ PRONTO!');
        isReady = true;
        currentQR = null;
        startEmailMonitoring();
    });

    client.on('authenticated', () => console.log('✅ Autenticado'));

    async function startEmailMonitoring() {
        console.log('📧 Monitor Ativo');

        const runCycle = async () => {
            try {
                await checkEmails(async (pdfBuffer, emailSubject, emailItem) => {
                    console.log(`📄 Processando: ${emailSubject}`);

                    // 1. Extrair Texto
                    const pdfText = await extractTextFromPDF(pdfBuffer);
                    if (!pdfText || pdfText.length < 10) {
                        console.log('⚠️ Texto do PDF vazio ou muito curto.');
                        return;
                    }

                    // 2. Baixar Lista Atualizada
                    const serverList = await fetchServerList();
                    if (!serverList.length) {
                        console.log('⚠️ Lista de servidores vazia ou falha ao baixar.');
                        return;
                    }

                    // 3. Buscar Match
                    const match = findServerInPDF(pdfText, serverList);

                    if (match) {
                        console.log(`✅ MATCH ENCONTRADO: ${match.name}`);

                        // 4. Formatar Mensagem
                        const d = match.data;
                        const nome = d['Nome'] || d['Servidor'] || match.name;
                        const contrato = d['Contrato'] || d['Numero'] || 'N/A';
                        const objeto = d['Objeto'] || d['Descricao'] || 'N/A';
                        const valor = d['Valor'] || d['Valor Total'] || 'N/A';
                        const vigencia = d['Vigencia'] || d['Data'] || 'N/A';

                        let message = `🚨 *MONITORAMENTO DE CONTRATOS* 🚨\n\n`;
                        message += `✅ *Contrato Identificado!*\n\n`;
                        message += `📄 *Origem:* ${emailSubject}\n`;
                        message += `👤 *Nome/Empresa:* ${nome}\n`;
                        message += `🔢 *Contrato:* ${contrato}\n`;
                        message += `💰 *Valor:* ${valor}\n`;
                        message += `📅 *Vigência:* ${vigencia}\n`;
                        message += `📝 *Objeto:* ${objeto}\n\n`;
                        message += `_Mensagem automática do Robô_`;

                        // 5. Enviar WhatsApp
                        const targetNumber = process.env.WHATSAPP_NUMBER;
                        if (targetNumber) {
                            const chatId = targetNumber.includes('@') ? targetNumber : `${targetNumber}@c.us`;
                            await client.sendMessage(chatId, message);
                            console.log(`📤 Mensagem enviada para ${chatId}`);
                        } else {
                            // Envia para si mesmo se não tiver número definido
                            if (client.info && client.info.wid) {
                                console.log('⚠️ WHATSAPP_NUMBER não configurado. Enviando para mim mesmo.');
                                await client.sendMessage(client.info.wid._serialized, message);
                            } else {
                                console.log('❌ Não foi possível enviar mensagem: Destinatário indefinido.');
                            }
                        }
                    } else {
                        console.log('❌ Nenhum registro correspondente encontrado no Excel.');
                    }
                });
            } catch (e) {
                console.error("Erro no ciclo de verificação:", e);
            }
            setTimeout(runCycle, 60000);
        };
        runCycle();
    }

    client.initialize().catch(err => console.error("Erro fatal cliente:", err));

})();
