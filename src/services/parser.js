const pdf = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await pdf(pdfBuffer);
        // Retorna o texto todo em caixa alta para facilitar a busca (case insensitive)
        return data.text.toUpperCase();
    } catch (error) {
        console.error('Erro ao ler PDF:', error.message);
        return '';
    }
}

/**
 * Tenta encontrar um servidor na lista baseado no conteúdo do PDF
 * @param {string} pdfText - Texto extraído do PDF
 * @param {Array} serverList - Lista de objetos (linhas do CSV)
 */
function findServerInPDF(pdfText, serverList) {
    // Ordena por tamanho do nome (do maior para o menor) para evitar falsos positivos
    // Ex: Evitar achar "Ana Silva" quando o nome é "Mariana Silva"
    // (Lógica simples, pode ser refinada)

    // Assumindo que a coluna do CSV com o nome possa ter variados headers, 
    // vamos tentar identificar colunas que pareçam nomes ou usar uma busca genérica nos valores da linha.

    let matchFound = false;
    console.log(`[MATCH] Verificando conteúdo contra ${serverList.length} registros da planilha...`);

    // Debug: Imprime os 50 primeiros caracteres do PDF para ver se leu algo
    console.log(`[PDF START] "${pdfText.substring(0, 50)}..."`);

    for (const server of serverList) {
        // Tenta achar o nome em alguma das colunas. 
        // Adapte 'Nome' ou 'Servidor' conforme o cabeçalho real do seu CSV.
        // Vou varrer todos os valores da linha por garantia.
        const values = Object.values(server);

        for (const val of values) {
            if (!val) continue; // Pula valores nulos/undefined
            const serverName = String(val).trim().toUpperCase();

            // Ignora valores muito curtos para não dar match errado (ex: "S", "1", "NAO")
            if (serverName.length < 5) continue;

            if (pdfText.includes(serverName)) {
                console.log(`[MATCH SUCCESSO] Valor encontrado: "${serverName}"`);
                return {
                    name: serverName,
                    data: server // Retorna todos os dados da linha
                };
            }
        }
    }

    console.log('[MATCH FALHA] Nenhum valor da planilha foi encontrado no texto deste PDF.');
    return null;
}

module.exports = { extractTextFromPDF, findServerInPDF };
