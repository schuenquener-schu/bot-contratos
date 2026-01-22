console.log('>>> INICIANDO SISTEMA VISUAL WEB (VERSÃO FINAL) <<<');

const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCodeImage = require('qrcode');
const { checkEmails } = require('./src/services/email');
const { extractTextFromPDF } = require('./src/services/parser');
const { fetchServerList, findServerInPDF } = require('./src/services/sheets');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const express = require('express');
require('dotenv').config();

// -- VARIÁVEIS DE ESTAD --
let currentQR = null;
let isReady = false;
let startupTime = new Date().toLocaleTimeString();

// --- SERVIDOR WEB VISUAL ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    // 1. Robô Conectado
    if (isReady) {
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; padding:50px; background:#d4edda; color:#155724; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h1 style="font-size:3em;">✅</h1>
                <h1>Robô Conectado!</h1>
                <p>Status: <strong>ONLINE</strong></p>
                <p>Iniciado às: ${startupTime}</p>
            </div>
        `);
    }

    // 2. QR Code Disponível (Gera a imagem)
    if (currentQR) {
        const url = await QRCodeImage.toDataURL(currentQR);
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; padding:20px; background:#f0f2f5; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h1 style="color:#128C7E;">WhatsApp Web</h1>
                <p>Abra o WhatsApp no seu celular > Menu > Aparelhos conectados > Conectar</p>
                <div style="background:white; padding:20px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                    <img src="${url}" style="width: 300px; height: 300px;" />
                </div>
                <p style="margin-top:20px; color:#555;">⚠️ A página recarrega em 5s para manter o código atualizado.</p>
                <script>setTimeout(() => window.location.reload(), 5000);</script>
            </div>
        `);
    }

    // 3. Iniciando
    return res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#fff3cd; color:#856404; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <h1>⏳ Iniciando...</h1>
            <p>Conectando ao MongoDB e preparando o navegador...</p>
            <div style="margin-top:20px; border: 4px solid #f3f3f3; border-top: 4px solid #856404; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite;"></div>
            <style>@keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>
            <script>setTimeout(() => window.location.reload(), 3000);</script>
        </div>
    `);
});

app.listen(port, () => {
    console.log(`🌍 WEB-VIEW RENDERIZADO NA PORTA ${port}`);
});

// --- LÓGICA DO ROBÔ ---
(async () => {
    let authStrategy;
    if (process.env.MONGODB_URI) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            const store = new MongoStore({ mongoose: mongoose });
            authStrategy = new RemoteAuth({
                store: store,
                clientId: 'client_render_webview_v2', // Mudei para v2 para limpar cache
                backupSyncIntervalMs: 60000
            });
            console.log('✅ MongoDB OK!');
        } catch (err) {
            console.error('❌ Erro MongoDB:', err);
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
        console.log('📸 QR CODE GERADO! ACESSE O SITE PARA VER.');
        currentQR = qr;
        isReady = false;
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ TUDO PRONTO!');
        isReady = true;
        currentQR = null;
        startEmailMonitoring();
    });

    async function startEmailMonitoring() {
        console.log('📧 Monitorando E-mails...');
        // Loop dummy
        const runCycle = async () => { try { await checkEmails(async () => { }); } catch (e) { } setTimeout(runCycle, 60000); };
        runCycle();
    }

    client.initialize();

})();
