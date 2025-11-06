// netlify/functions/getClima.js
const axios = require('axios');
// --- CORREÇÃO FINAL: Usando CLIMA_API_KEY ---
const API_KEY = process.env.CLIMA_API_KEY; 

// --- MAPA DE TRADUÇÃO DE ÍCONES (WeatherAPI Code -> OpenWeatherMap Code) ---
// Mapeia códigos da WeatherAPI para códigos que o seu frontend (usando URLs do OWM) entende.
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

// Função auxiliar para obter o código do ícone OWM
function getOwmIconCode(isDay, conditionCode) {
    const map = ICON_MAP[conditionCode];
    if (map) {
        // isDay: 1 = dia, 0 = noite
        return isDay === 1 ? map.day : map.night;
    }
    // Fallback padrão: nublado
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

    // URL da WeatherAPI
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
            const owmIconCode = getOwmIconCode(1, conditionCode); // Sempre usa o ícone diurno para a previsão do dia

            return {
                day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3), 
                icon: owmIconCode, 
                high: Math.round(day.day.maxtemp_c),
                low: Math.round(day.day.mintemp_c)
            };
        });

        // --- MAPEAMENTO DA PREVISÃO HORÁRIA (PRÓXIMAS 7 HORAS) ---
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
                label: `${hourData.time.split(' ')[1].split(':')[0]}h`, // Ex: "18:00" -> "18h"
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
                
                // DADOS CRÍTICOS (TEMPO REAL)
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
        // Bloco de tratamento de erro para cair no MOCK do frontend
        console.error('Erro na função Netlify:', error.message);
        if (error.response) {
            console.error('Dados de erro da API:', error.response.data);
            return {
                statusCode: error.response.status,
                body: JSON.stringify({ 
                    error: `Erro de API WeatherAPI (${error.response.status}): ${error.response.data.error.message}`, 
                    details: error.message 
                })
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Falha geral ao buscar dados de clima.", details: error.message })
        };
    }
};