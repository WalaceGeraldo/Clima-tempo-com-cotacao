// functions/getClima.js
// Importa o axios para fazer chamadas HTTP externas
const axios = require('axios'); 

// O 'handler' é a função principal que o Netlify Functions executa
exports.handler = async (event, context) => {
    // 1. Acesso Seguro à Chave de API
    const apiKey = process.env.CLIMA_API_KEY; 
    
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Chave de API do clima não configurada no .env' }),
        };
    }

    // 2. Parâmetros do Front-end
    const { city = 'Sao Paulo' } = event.queryStringParameters;

    // URL da API de Clima (você pode usar o OpenWeatherMap, por exemplo)
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=pt`;

    try {
        // 3. Chamada à API Externa
        const response = await axios.get(weatherApiUrl);

        // 4. Retorna APENAS os dados necessários
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                temperatura: response.data.main.temp,
                temperaturaMin: response.data.main.temp_min,
                temperaturaMax: response.data.main.temp_max,
                descricao: response.data.weather[0].description,
                icone: response.data.weather[0].icon,
                cidade: response.data.name,
                pais: response.data.sys.country,
            }),
        };
    } catch (error) {
        console.error('Erro na API de Clima:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha ao buscar dados para a cidade: ${city}. Verifique a chave de API e o nome da cidade.` }),
        };
    }
};