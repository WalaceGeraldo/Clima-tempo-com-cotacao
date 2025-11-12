// functions/getClima.js
const axios = require('axios');
const API_KEY = process.env.WEATHERAPI_API_KEY; 

// --- MAPA DE TRADUÇÃO DE ÍCONES (WeatherAPI Code -> OpenWeatherMap Code) ---
const ICON_MAP = {
    1000: { day: '01d', night: '01n' }, 1003: { day: '02d', night: '02n' }, 
    1006: { day: '03d', night: '03n' }, 1009: { day: '04d', night: '04n' }, 
    1030: { day: '50d', night: '50n' }, 1135: { day: '50d', night: '50n' }, 
    1147: { day: '50d', night: '50n' }, 1063: { day: '09d', night: '09n' }, 
    1150: { day: '09d', night: '09n' }, 1153: { day: '09d', night: '09n' }, 
    1180: { day: '09d', night: '09n' }, 1183: { day: '10d', night: '10n' }, 
    1186: { day: '10d', night: '10n' }, 1189: { day: '10d', night: '10n' }, 
    1192: { day: '10d', night: '10n' }, 1195: { day: '10d', night: '10n' }, 
    1087: { day: '11d', night: '11n' }, 1273: { day: '11d', night: '11n' }, 
    1276: { day: '11d', night: '11n' }, 1210: { day: '13d', night: '13n' }, 
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
    // Agora aceita city, lat, ou lon
    const { city, lat, lon, lang = 'pt' } = event.queryStringParameters;

    if (!API_KEY) {
         return { statusCode: 500, body: JSON.stringify({ error: "Erro de configuração: Chave da API (WEATHERAPI_API_KEY) não está configurada." })};
    }

    // --- Lógica para construir a URL (Nova) ---
    let qParam;
    
    if (lat && lon) {
        // Se recebeu coordenadas, usa-as como parâmetro 'q' da API
        qParam = `${lat},${lon}`;
    } else if (city) {
        // Se recebeu cidade (busca manual), usa o nome
        qParam = city;
    } else {
        return { statusCode: 400, body: JSON.stringify({ error: "Parâmetros de cidade ou coordenadas são obrigatórios." }) };
    }
    // ------------------------------------------

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(qParam)}&days=7&lang=${lang}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        
        // --- EXTRAÇÃO E MAPEAMENTO ---
        const current = data.current;
        const currentDayForecast = data.forecast.forecastday[0]; 
        
        const isDay = current.is_day;
        const currentConditionCode = current.condition.code;
        
        // 🚀 CORREÇÃO DO FUSO HORÁRIO: Pega a hora local da API
        const locationTime = data.location.localtime;
        const nowHour = parseInt(locationTime.split(' ')[1].split(':')[0]); 
        
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
                vento: Math.round(current.wind_kph), 
                pressao: current.pressure_mb, 
                hourlyForecast: hourlyForecast,
                dailyForecast: dailyForecast,
            })
        };

    } catch (error) {
        // Bloco de tratamento de erro
        let statusCode = (error.response && error.response.status) ? error.response.status : 500;
        let errorMessage = `Erro na API. Verifique a chave WeatherAPI: ${error.message}`;
        
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