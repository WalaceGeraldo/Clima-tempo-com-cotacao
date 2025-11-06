// netlify/functions/getClima.js
const axios = require('axios');
// A API_KEY é lida da variável de ambiente (WEATHERAPI_API_KEY no .env e no painel Netlify)
const API_KEY = process.env.WEATHERAPI_API_KEY; 

// --- MAPA DE TRADUÇÃO DE ÍCONES (WeatherAPI Code -> OpenWeatherMap Code) ---
const ICON_MAP = {
    // Céu Limpo
    1000: { day: '01d', night: '01n' }, 
    // Nublado
    1003: { day: '02d', night: '02n' }, 
    1006: { day: '03d', night: '03n' }, 
    1009: { day: '04d', night: '04n' }, 
    // Nevoeiro
    1030: { day: '50d', night: '50n' }, 
    1135: { day: '50d', night: '50n' }, 
    1147: { day: '50d', night: '50n' }, 
    // Chuva Fraca/Leve
    1063: { day: '09d', night: '09n' }, 
    1150: { day: '09d', night: '09n' }, 
    1153: { day: '09d', night: '09n' }, 
    1180: { day: '09d', night: '09n' }, 
    // Chuva Moderada/Forte
    1183: { day: '10d', night: '10n' }, 
    1186: { day: '10d', night: '10n' }, 
    1189: { day: '10d', night: '10n' }, 
    1192: { day: '10d', night: '10n' }, 
    1195: { day: '10d', night: '10n' }, 
    // Trovoadas
    1087: { day: '11d', night: '11n' }, 
    1273: { day: '11d', night: '11n' }, 
    1276: { day: '11d', night: '11n' }, 
    // Neve, Granizo, etc.
    1210: { day: '13d', night: '13n' }, 
    1237: { day: '13d', night: '13n' }, 
};

function getOwmIconCode(isDay, conditionCode) {
    const map = ICON_MAP[conditionCode];
    if (map) {
        return isDay === 1 ? map.day : map.night;
    }
    return isDay === 1 ? '04d' : '04n'; 
}


exports.handler = async (event, context) => {
    const { city, lang = 'pt' } = event.queryStringParameters;

    if (!API_KEY) {
         console.error('WEATHERAPI_API_KEY não está configurada! Retornando erro 500.');
         return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erro de configuração: Chave da API não configurada. Use WEATHERAPI_API_KEY." })
        };
    }

    if (!city) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parâmetro 'city' é obrigatório." })
        };
    }

    // Chamada à API WeatherAPI
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=7&lang=${lang}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        
        // --- EXTRAÇÃO E MAPEAMENTO ---
        const current = data.current;
        const currentDayForecast = data.forecast.forecastday[0]; 
        
        const isDay = current.is_day;
        const currentConditionCode = current.condition.code;
        
        // Mapeamento da previsão diária
        const dailyForecast = data.forecast.forecastday.slice(0, 7).map(day => {
            const date = new Date(day.date);
            const conditionCode = day.day.condition.code;
            const owmIconCode = getOwmIconCode(1, conditionCode); 

            return {
                day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3), 
                icon: owmIconCode, 
                high: Math.round(day.day.maxtemp_c),
                low: Math.round(day.day.mintemp_c)
            };
        });

        // Mapeamento da previsão horária
        const nowHour = new Date().getHours();
        let hourlyForecast = [];
        const rawHourly = currentDayForecast.hour;

        for (let i = 0; i < 7; i++) {
            const index = (nowHour + i) % 24; 
            const hourData = rawHourly[index];
            
            const hourIsDay = hourData.is_day;
            const hourConditionCode = hourData.condition.code;
            const owmIconCode = getOwmIconCode(hourIsDay, hourConditionCode);

            hourlyForecast.push({
                label: `${hourData.time.split(' ')[1].split(':')[0]}h`, 
                temp: Math.round(hourData.temp_c),
                icon: owmIconCode 
            });
        }

        // --- RETORNAR DADOS AO FRONTEND ---
        return {
            statusCode: 200, 
            body: JSON.stringify({
                cidade: data.location.name,
                pais: data.location.country,
                temp_atual: Math.round(current.temp_c), 
                descricao_atual: current.condition.text,
                icone_atual: getOwmIconCode(isDay, currentConditionCode), 
                umidade: current.humidity,
                vento: Math.round(current.wind_kph), // Vento já está em km/h
                pressao: current.pressure_mb, 
                hourlyForecast: hourlyForecast,
                dailyForecast: dailyForecast,
            })
        };

    } catch (error) {
        // Bloco de tratamento de erro para evitar erro 500 genérico
        let statusCode = (error.response && error.response.status) ? error.response.status : 500;
        let errorMessage = `Erro na API. Verifique a chave WeatherAPI: ${error.message}`;
        
        // Tenta obter a mensagem clara da API para o frontend
        if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
            errorMessage = error.response.data.error.message;
        }

        console.error('Erro na função Netlify (WeatherAPI):', errorMessage);

        return { 
            statusCode: statusCode, 
            body: JSON.stringify({ error: `Falha na API: ${errorMessage}` })
        };
    }
};