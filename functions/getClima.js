// netlify/functions/getClima.js
const axios = require('axios');
const API_KEY = process.env.WEATHERAPI_API_KEY; 

// --- MAPA DE TRADUÇÃO DE ÍCONES (WeatherAPI Code -> OpenWeatherMap Code) ---
const ICON_MAP = {
    1000: { day: '01d', night: '01n' }, // Clear
    1003: { day: '02d', night: '02n' }, // Partly cloudy
    1006: { day: '03d', night: '03n' }, // Cloudy
    1009: { day: '04d', night: '04n' }, // Overcast
    1030: { day: '50d', night: '50n' }, // Mist
    1135: { day: '50d', night: '50n' }, // Fog
    1147: { day: '50d', night: '50n' }, // Freezing fog
    1063: { day: '09d', night: '09n' }, // Patchy rain possible
    1150: { day: '09d', night: '09n' }, // Light drizzle
    1153: { day: '09d', night: '09n' }, // Drizzle
    1180: { day: '09d', night: '09n' }, // Patchy light rain
    1183: { day: '10d', night: '10n' }, // Light rain
    1186: { day: '10d', night: '10n' }, // Moderate rain at times
    1189: { day: '10d', night: '10n' }, // Moderate rain
    1192: { day: '10d', night: '10n' }, // Heavy rain at times
    1195: { day: '10d', night: '10n' }, // Heavy rain
    1087: { day: '11d', night: '11n' }, // Thundery outbreaks possible
    1273: { day: '11d', night: '11n' }, // Patchy light rain with thunder
    1276: { day: '11d', night: '11n' }, // Moderate or heavy rain with thunder
    1210: { day: '13d', night: '13n' }, // Light snow
    1237: { day: '13d', night: '13n' }, // Ice pellets
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

    if (!city) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parâmetro 'city' é obrigatório." })
        };
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=7&lang=${lang}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        
        // --- EXTRAÇÃO DE DADOS ATUAIS (TEMPO REAL) ---
        const current = data.current;
        const currentDayForecast = data.forecast.forecastday[0]; 
        
        const isDay = current.is_day;
        const currentConditionCode = current.condition.code;
        
        // --- MAPEAMENTO DA PREVISÃO DIÁRIA (7 DIAS) ---
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

        // --- MAPEAMENTO DA PREVISÃO HORÁRIA (PRÓXIMAS HORAS) ---
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


        // --- RETORNAR OS DADOS ESTRUTURADOS PARA O FRONTEND ---
        return {
            statusCode: 200,
            body: JSON.stringify({
                cidade: data.location.name,
                pais: data.location.country,
                
                // CAMPO CRÍTICO: temp_atual
                temp_atual: Math.round(current.temp_c), 
                descricao_atual: current.condition.text,
                icone_atual: getOwmIconCode(isDay, currentConditionCode), 
                umidade: current.humidity,
                vento: Math.round(current.wind_kph), 
                pressao: current.pressure_mb, 
                
                // PREVISÃO
                hourlyForecast: hourlyForecast,
                dailyForecast: dailyForecast,
            })
        };

    } catch (error) {
        // Bloco de tratamento de erro
        console.error('Erro na função Netlify:', error.message);
        if (error.response) {
            // Se a API retornar um erro (ex: chave inválida, cidade não encontrada)
            console.error('Dados de erro da API:', error.response.data);
            return {
                statusCode: error.response.status,
                body: JSON.stringify({ 
                    error: `Erro de API WeatherAPI (${error.response.status}): ${error.response.data.error.message}`, 
                    details: error.message 
                })
            };
        }
        // Erro de rede ou outro problema de conexão
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Falha geral ao buscar dados de clima.", details: error.message })
        };
    }
};