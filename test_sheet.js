
require('dotenv').config();
const axios = require('axios');

const csv = require('csv-parser');
const { Readable } = require('stream');

async function testSheet() {
    try {
        const url = process.env.CSV_URL;
        console.log(`Fetching URL: ${url}`);
        const response = await axios.get(url);

        let count = 0;
        const stream = Readable.from(response.data);
        stream.pipe(csv())
            .on('data', (row) => {
                if (count === 0) {
                    console.log('--- COLUNAS (Cabeçalhos) ---');
                    console.log(Object.keys(row));
                    console.log('--- EXEMPLO ---');
                    console.log(row);
                }
                count++;
            })
            .on('end', () => console.log('Finished reading sample.'));

    } catch (error) {
        console.error('Error fetching sheet:', error.message);
    }
}

testSheet();
