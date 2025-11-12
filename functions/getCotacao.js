// functions/getCotacao.js
const axios = require('axios');
const API_KEY = process.env.ALPHAVANTAGE_API_KEY; 
const BASE_URL = 'https://www.alphavantage.co/query?';

// Dados de Ativos que queremos buscar
const ASSET_SYMBOLS = [
    { symbol: 'PETR4.SA', pair: 'PETR4' },
    { symbol: 'VALE3.SA', pair: 'VALE3' },
    { symbol: 'ITUB4.SA', pair: 'ITUB4' },
    { symbol: 'BBDC4.SA', pair: 'BBDC4' }, // NOVO: Bradesco
    { symbol: 'ABEV3.SA', pair: 'ABEV3' }, // NOVO: Ambev
    { symbol: 'MGLU3.SA', pair: 'MGLU3' }
];

// Dados Mockados para IBOV e Câmbio (Alpha Vantage Free Tier é limitado para índices/câmbio)
const MOCKED_INDEX_FOREX = [
    { pair: "IBOV", price: "128.500", change: 0.17, volume: "105.4M" }, 
    { pair: "EUR/USD", price: "1.0095", change: -0.32, volume: "1.2M" },
    { pair: "XRP/BRL", price: "4.32", change: 0.85, volume: "2.1M" },
    
    // Ações que serão buscadas (MOCKED para fallback)
    { pair: "PETR4", price: "30.50", change: 0.50, volume: "65.1M" }, 
    { pair: "VALE3", price: "64.62", change: -1.12, volume: "42.0M" },
    { pair: "ITUB4", price: "30.96", change: -0.30, volume: "39.7M" },
    { pair: "BBDC4", price: "20.15", change: 0.25, volume: "35.0M" }, // NOVO MOCK
    { pair: "ABEV3", price: "14.50", change: -0.10, volume: "22.5M" }, // NOVO MOCK
    { pair: "MGLU3", price: "3.20", change: 1.50, volume: "80.0M" }
];


// Função auxiliar para buscar o histórico de preços diários
async function fetchDailyHistory(symbol) {
    // Usamos a função TIME_SERIES_DAILY para obter o histórico (preços de fechamento)
    const url = `${BASE_URL}function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}&outputsize=compact`;
    const response = await axios.get(url);
    const data = response.data['Time Series (Daily)'];
    
    if (!data) return null;

    const labels = [];
    const prices = [];
    
    // Pega os últimos 7 dias de dados
    const dates = Object.keys(data).slice(0, 7).reverse(); // Reverse para ordenar do mais antigo ao mais novo
    
    for (const date of dates) {
        // Usa o preço de fechamento (4. close)
        labels.push(new Date(date).toLocaleDateString('pt-BR', { month: 'numeric', day: 'numeric' }));
        prices.push(parseFloat(data[date]['4. close']));
    }

    return { labels, prices };
}


// Função principal para buscar cotações
exports.handler = async (event, context) => {
    if (!API_KEY) { /* ... */ }
    
    try {
        const fetchPromises = ASSET_SYMBOLS.map(asset => 
            // 1. Busca a COTAÇÃO ATUAL (Global Quote)
            axios.get(`${BASE_URL}function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${API_KEY}`)
        );

        const responses = await Promise.all(fetchPromises);
        let realData = [];
        let allHistoryData = {}; // Objeto para armazenar dados de histórico para o gráfico

        // 1. Processar dados atuais e buscar o histórico
        for (let index = 0; index < responses.length; index++) {
            const response = responses[index];
            const asset = ASSET_SYMBOLS[index];
            const quote = response.data['Global Quote'];

            if (quote && quote['05. price']) {
                const price = parseFloat(quote['05. price']).toFixed(2);
                const changePercent = parseFloat(quote['10. change in percent'].replace('%', ''));
                const volume = parseFloat(quote['06. volume']);
                
                realData.push({
                    pair: asset.pair,
                    price: price,
                    change: changePercent,
                    volume: (volume / 1000000).toFixed(1) + 'M'
                });
                
                // 2. Busca e armazena o histórico diário
                const history = await fetchDailyHistory(asset.symbol);
                if (history) {
                    allHistoryData[asset.pair] = history;
                }
            }
        }
        
        // 3. Combinar com dados mockados para IBOV/Câmbio
        const combinedData = [...MOCKED_INDEX_FOREX, ...realData].filter(item => item !== null);

        // 4. Retornar dados combinados
        return {
            statusCode: 200,
            body: JSON.stringify({
                marketData: combinedData, 
                marketHistory: allHistoryData, // ENVIAMOS O HISTÓRICO PARA O FRONTEND
            }),
        };

    } catch (error) {
        console.error('Erro na função de cotação:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha ao buscar dados de mercado: ${error.message}` }),
        };
    }
};