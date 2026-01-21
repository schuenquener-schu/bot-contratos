const axios = require('axios');
const csv = require('csv-parser');
const { Readable } = require('stream');

async function fetchServerList() {
    try {
        console.log('Baixando lista atualizada de servidores...');
        const url = process.env.CSV_URL;
        const response = await axios.get(url);

        const servers = [];
        const stream = Readable.from(response.data);

        return new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (row) => {
                    // Normaliza as chaves (remove espaços extras dos nomes das colunas)
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        cleanRow[key.trim()] = row[key];
                    });

                    // Verifica se a linha tem conteúdo válido
                    if (Object.values(cleanRow).some(val => val && val.trim() !== '')) {
                        servers.push(cleanRow);
                    }
                })
                .on('end', () => {
                    console.log(`Lista carregada: ${servers.length} servidores encontrados.`);
                    resolve(servers);
                })
                .on('error', (err) => reject(err));
        });
    } catch (error) {
        console.error('Erro ao baixar CSV:', error.message);
        return [];
    }
}

module.exports = { fetchServerList };
