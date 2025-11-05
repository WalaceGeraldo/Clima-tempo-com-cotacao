// functions/getCotacao.js
const axios = require('axios');

exports.handler = async (event, context) => {
    // API que não requer chave de autenticação!
    const cotacaoApiUrl = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL';

    try {
        const response = await axios.get(cotacaoApiUrl);
        const data = response.data;
        
        // A API retorna um objeto com as moedas. Vamos formatar.
        const cotacoes = {
            dolar: data.USDBRL ? {
                valor: parseFloat(data.USDBRL.bid).toFixed(4),
                variacao: data.USDBRL.pctChange
            } : null,
            euro: data.EURBRL ? {
                valor: parseFloat(data.EURBRL.bid).toFixed(4),
                variacao: data.EURBRL.pctChange
            } : null,
            bitcoin: data.BTCBRL ? {
                valor: parseFloat(data.BTCBRL.bid).toFixed(2),
                variacao: data.BTCBRL.pctChange
            } : null,
        };

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cotacoes),
        };
    } catch (error) {
        console.error('Erro na API de Cotação:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao buscar dados de cotação. A AwesomeAPI pode estar temporariamente fora do ar.' }),
        };
    }
};