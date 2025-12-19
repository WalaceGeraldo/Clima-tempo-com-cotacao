// public/js/scripts.js

let forecastChartInstance = null;
let marketChartInstance = null;
let marketHistoryData = {}; // Variável global para armazenar histórico de mercado
let nextPageCursor = null; // Token para paginação
let isLoadingNews = false; // Flag para evitar múltiplas requisições


// --- DADOS MOCKADOS FINAIS (Usados como Fallback e para Câmbio/IBOV estático temporário) ---
const MOCKED_MARKET_DATA = [
    { pair: "IBOV", price: "128.500", change: 0.17, volume: "105.4M" },
    { pair: "EUR/USD", price: "1.0095", change: -0.32, volume: "1.2M" },
    { pair: "XRP/BRL", price: "4.32", change: 0.85, volume: "2.1M" },
    { pair: "PETR4", price: "30.50", change: 0.50, volume: "65.1M" },
    { pair: "VALE3", price: "64.62", change: -1.12, volume: "42.0M" },
    { pair: "ITUB4", price: "30.96", change: -0.30, volume: "39.7M" },
];

const MOCKED_NEWS_DATA = [
    { title: "Moraes autoriza PF a interrogar Bolsonaro sobre cofres achados", source: "G1", description: "Moraes libera visitas permanentes de Michelle", imageUrl: "https://via.placeholder.com/300x160/334155/ffffff?text=POLITICA" },
    { title: "'Se tiver filho meu envolvido, será investigado', diz Lula", source: "UOL", description: "PF vê senador como 'sócio oculto' de organização", imageUrl: "https://via.placeholder.com/300x160/334155/ffffff?text=LULA" },
    { title: "Quem é a herdeira de banqueiro alvo em ação sobre INSS", source: "Folha", description: "Blog: filho de nº2 trabalha no gabinete de Weverton", imageUrl: "https://via.placeholder.com/300x160/334155/ffffff?text=MERCADO" },
    { title: "Lula faz convite para Gustavo Feliciano comandar o Turismo", source: "CNN", description: "Convite foi formalizado na presença de Hugo Motta", imageUrl: "https://via.placeholder.com/300x160/334155/ffffff?text=GOVERNO" },
    { title: "TikTok assina acordo para venda nos EUA, diz site americano", source: "TechCrunch", description: "Empresa de Trump fecha fusão bilionária: confira", imageUrl: "https://via.placeholder.com/300x160/334155/ffffff?text=TIKTOK" },
    { title: "Piloto da Nascar morre em queda de avião nos EUA; vídeo", source: "Globo Esporte", description: "Piloto da Nascar, mulher e filhos estavam no avião", imageUrl: "https://via.placeholder.com/300x160/334155/ffffff?text=ESPORTE" }
];

const iconImages = {};
const iconUrls = [
    { name: 'sun', url: 'http://openweathermap.org/img/wn/01d.png' },
    { name: 'cloud-sun', url: 'http://openweathermap.org/img/wn/02d.png' },
    { name: 'clouds', url: 'http://openweathermap.org/img/wn/04d.png' },
    { name: 'rain', url: 'http://openweathermap.org/img/wn/10d.png' }
];

function loadIcons() {
    return Promise.all(iconUrls.map(item => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                img.width = 32;
                img.height = 32;
                iconImages[item.name] = img;
                resolve();
            };
            img.onerror = () => {
                iconImages[item.name] = null;
                resolve();
            };
            img.src = item.url;
        });
    }));
}

// --- VARIÁVEIS GLOBAIS DE LOCALIZAÇÃO E DADOS ---
let currentCityName = '';
let currentCountry = '';
let currentForecastData = {};


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicia o Front-end exibindo os loaders
    document.getElementById('clima-data').innerHTML = `
        <div class="animate-pulse flex items-center space-x-4">
            <div class="h-16 w-16 bg-gray-700 rounded-full"></div>
            <div class="space-y-2">
                <div class="h-6 bg-gray-700 rounded w-48"></div>
                <div class="h-4 bg-gray-600 rounded w-32"></div>
            </div>
        </div>
        <div class="h-24 bg-gray-700 rounded mt-4"></div>
    `;

    await loadIcons();

    // 2. Tenta Auto-Detecção de Localização
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Sucesso: Chama fetchClima com as coordenadas
                fetchClima({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            (error) => {
                // Falha ou Usuário Negou: Chama a busca padrão
                console.warn('Geolocalização negada ou falhou. Carregando local padrão: Rio de Janeiro.');
                fetchClima('Rio de Janeiro, BR');
            },
            { timeout: 5000 } // Tempo limite de 5 segundos
        );
    } else {
        // Navegador não suporta Geolocalização: Chama a busca padrão
        fetchClima('Rio de Janeiro, BR');
    }

    renderMarketData();
    renderNewsData();

    // 3. Configura o botão de busca (CORREÇÃO DE FUNCIONALIDADE CRÍTICA)
    const searchButton = document.getElementById('search-button');
    const cityInput = document.getElementById('city-input');

    // Função de Busca Reutilizável
    const performSearch = () => {
        const cityName = cityInput.value.trim();
        if (cityName) {
            // CORREÇÃO: Adicionamos ', BR' se o usuário não o incluiu (para geocodificação mais precisa)
            const query = cityName.includes(',') ? cityName : `${cityName}, BR`;
            fetchClima(query);
        } else {
            alert('Por favor, digite o nome de uma cidade.');
        }
    };

    // Anexar evento de clique ao botão
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    } else {
        console.error("ERRO CRÍTICO: ID 'search-button' não encontrado no HTML.");
    }

    // Anexar evento de tecla Enter ao input
    if (cityInput) {
        cityInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    } else {
        console.error("ERRO CRÍTICO: ID 'city-input' não encontrado no HTML.");
    }
});

// --- FUNÇÃO AUXILIAR PARA FORMATAR TEMPO UNIX (HH:MM) ---
function formatUnixTime(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000);

    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Formato 24h
    });
}


// --- FUNÇÃO DE CRIAÇÃO DE GRÁFICO DE HORA ---
function createHourlyChart(hourlyForecast) {
    if (forecastChartInstance) {
        forecastChartInstance.destroy();
    }

    const canvas = document.getElementById('forecast-chart-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const hourlyTemps = hourlyForecast.map(h => h.temp);
    const hourlyLabels = hourlyForecast.map(h => h.label);
    const iconSet = hourlyForecast.map(h => {
        if (h.icon.includes('01')) return iconImages.sun;
        if (h.icon.includes('02')) return iconImages['cloud-sun'];
        if (h.icon.includes('04')) return iconImages.clouds;
        if (h.icon.includes('09') || h.icon.includes('10')) return iconImages.rain;
        return iconImages.clouds;
    });

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyLabels,
            datasets: [{
                label: 'Temperatura Horária (°C)',
                data: hourlyTemps,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                fill: 'start',
                tension: 0.4,
                pointRadius: 16,
                pointStyle: iconSet,
                pointBackgroundColor: 'rgba(0,0,0,0)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    reverse: false,
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                },
                y: { display: false, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                title: { display: false }
            }
        }
    });
}

// --- FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO DO CLIMA AO CLICAR NO DIA ---
function updateMainWeatherDetails(dayIndex) {
    const dayData = currentForecastData.dailyForecast[dayIndex];

    const mainDetailsDiv = document.getElementById('current-main-details');

    if (!mainDetailsDiv || !dayData) return;

    // Captura os dados ATUAIS injetados na carga inicial (fetchClima)
    const currentTemp = mainDetailsDiv.querySelector('.current-temp').textContent;
    const currentIcon = mainDetailsDiv.querySelector('.weather-icon').src;
    const currentDesc = mainDetailsDiv.querySelector('.current-desc').textContent;

    // AQUI: Injetamos o HTML completo da seção principal.
    mainDetailsDiv.innerHTML = `
        <img src="${currentIcon}" alt="Ícone do Clima" class="weather-icon flex-shrink-0">
        <div class="weather-info-main">
            <p class="current-location-name">${currentCityName}, ${currentCountry}</p> 
            <p class="current-temp">${currentTemp}</p>
            <p class="current-desc">${currentDesc}</p>
            <p class="current-location">Máx: ${dayData.high}°C | Mín: ${dayData.low}°C</p>
        </div>
    `;

    // Atualizar destaque do dia
    document.querySelectorAll('.day-selector-btn').forEach(b => b.classList.remove('active-day-selector'));
    document.querySelector(`[data-day-index="${dayIndex}"]`)?.classList.add('active-day-selector');
}


// ===========================================
// FUNÇÃO DE CLIMA (SUPORTE A COORDENADAS E BUSCA MANUAL)
// ===========================================
async function fetchClima(query) {
    const climaDiv = document.getElementById('clima-data');

    if (forecastChartInstance) {
        forecastChartInstance.destroy();
    }

    // --- DADOS MOCKADOS DE FALLBACK (PARA CASO DE ERRO NA API) ---
    const FALLBACK_MOCKED_HOURLY_FORECAST = [
        { label: '14h', temp: 25, icon: '01d' }, { label: '15h', temp: 22, icon: '02d' },
        { label: '16h', temp: 24, icon: '04d' }, { label: '17h', temp: 23, icon: '01d' },
        { label: '18h', temp: 21, icon: '03d' }, { label: '19h', temp: 19, icon: '09d' },
    ];
    const diaAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
    const FALLBACK_MOCKED_DAILY_FORECAST = [
        { day: diaAtual, icon: '01d', high: 36, low: 20 }, { day: 'Sex', icon: '02d', high: 35, low: 19 },
        { day: 'Sáb', icon: '04d', high: 32, low: 18 }, { day: 'Dom', icon: '09d', high: 28, low: 15 },
        { day: 'Seg', icon: '10d', high: 30, low: 17 }, { day: 'Ter', icon: '03d', high: 33, low: 21 },
        { day: 'Qua', icon: '01d', high: 34, low: 22 },
    ];
    const FALLBACK_MOCKED_CURRENT = { temp_atual: 36, icone_atual: '01d', descricao_atual: 'DADOS MOCKADOS', umidade: 75, vento: 3.3, pressao: 1012, sunrise: '06:00', sunset: '18:00' };
    // -------------------------------------------------------------

    // --- LÓGICA DE DETECÇÃO DE TIPO DE REQUISIÇÃO ---
    let url;
    let fallbackCity = 'Rio de Janeiro, BR';

    if (typeof query === 'object' && query.lat && query.lon) {
        // GeoLocalização: Passa Lat/Lon para o backend
        url = `/.netlify/functions/getClima?lat=${query.lat}&lon=${query.lon}&lang=pt`;
        fallbackCity = `${query.lat}, ${query.lon}`;
    } else if (typeof query === 'string' && query.trim() !== '') {
        // Busca Manual: Passa a cidade
        fallbackCity = query;
        url = `/.netlify/functions/getClima?city=${encodeURIComponent(query)}&lang=pt`;
    } else {
        return;
    }

    // Configura o loader antes de buscar
    climaDiv.innerHTML = `<p class="text-gray-400 mt-4">Buscando clima para ${typeof query === 'string' ? query : 'sua localização'}...</p>`;


    try {
        const response = await fetch(url);
        let data;

        if (!response.ok) {
            climaDiv.innerHTML = `<p class="text-red-400">Erro de rede (${response.status}) ao buscar a função.</p>`;
            throw new Error("Falha na rede da função Netlify.");
        }

        data = await response.json();

        if (data.error) {
            climaDiv.innerHTML = `<p class="text-red-400 font-semibold mt-4">
                🚨 Erro de API: ${data.error}<br>
                Verifique o nome da cidade ou a chave.
            </p>`;
            throw new Error(`Erro da API: ${data.error}`);
        }

        // --- 1. ARMAZENAR DADOS GLOBAIS REAIS ---
        currentCityName = data.cidade || fallbackCity;
        currentCountry = data.pais || 'BR';
        currentForecastData.hourlyForecast = data.hourlyForecast;
        currentForecastData.dailyForecast = data.dailyForecast;

        // **VARIÁVEIS CHAVE PARA O DISPLAY INICIAL (DIA ATUAL E TEMP ATUAL)**
        const currentDayData = currentForecastData.dailyForecast[0];
        const currentTemp = data.temp_atual;
        const currentIcon = data.icone_atual;
        const currentDesc = data.descricao_atual.toUpperCase();

        // 2. INJEÇÃO DE DADOS ASTRONÔMICOS (Novo)
        const sunriseTime = data.sunrise || FALLBACK_MOCKED_CURRENT.sunrise; // Assume que o backend retorna a hora formatada
        const sunsetTime = data.sunset || FALLBACK_MOCKED_CURRENT.sunset;

        // Injeta os horários na seção DETALHES ASTRONÔMICOS
        if (document.getElementById('sunrise-value')) {
            document.getElementById('sunrise-value').textContent = sunriseTime;
        }
        if (document.getElementById('sunset-value')) {
            document.getElementById('sunset-value').textContent = sunsetTime;
        }


        // 3. ESTRUTURA HTML FINAL
        climaDiv.innerHTML = `
            <div id="current-main-details" class="weather-current-details">
                <img src="http://openweathermap.org/img/wn/${currentIcon}@4x.png" alt="Ícone do Clima" class="weather-icon flex-shrink-0">
                <div class="weather-info-main">
                    <p class="current-location-name">${currentCityName}, ${currentCountry}</p> 
                    <p class="current-temp">${currentTemp}°C</p>
                    <p class="current-desc">${currentDesc}</p>
                    <p class="current-location">Máx: ${currentDayData.high}°C | Mín: ${currentDayData.low}°C</p>
                </div>
            </div>

            <h4 class="forecast-title">PREVISÃO PRÓXIMAS HORAS</h4>
            <div class="forecast-chart-wrap"> 
                <canvas id="forecast-chart-canvas"></canvas>
            </div>
            
            <h4 class="forecast-title" style="margin-top: 1.5rem; padding-top: 1rem;">PREVISÃO 7 DIAS</h4>
            <div id="daily-selector-container" class="daily-selector-grid">
                ${currentForecastData.dailyForecast.map((day, index) => `
                    <button class="day-selector-btn ${index === 0 ? 'active-day-selector' : ''}" data-day-index="${index}" data-temp-max="${day.high}" data-temp-min="${day.low}" data-day="${day.day}" data-icon="${day.icon}">
                        <span class="day-label">${day.day}</span>
                        <img src="http://openweathermap.org/img/wn/${day.icon}.png" alt="${day.day}" class="day-icon">
                        <span class="temp-range"><span class="temp-high">${day.high}°C</span> / <span class="temp-low">${day.low}°C</span></span>
                    </button>
                `).join('')}
            </div>

            <div class="weather-stats-grid-wrap">
                <div class="stat-item-grid">
                    <p class="stat-label">Amplitude Térmica</p>
                    <span class="stat-value-highlight">
                        <span class="stat-value-high">${currentDayData.high}°C</span> / 
                        <span class="stat-value-low">${currentDayData.low}°C</span>
                    </span>
                </div>
                <div class="stat-item-grid">
                    <p class="stat-label">Umidade</p>
                    <span class="stat-value-highlight">${data.umidade}%</span>
                </div>
                <div class="stat-item-grid">
                    <p class="stat-label">Vento</p>
                    <span class="stat-value-highlight">${Math.round(data.vento)} km/h</span> 
                </div>
                <div class="stat-item-grid empty-stat">
                    <p class="stat-label">Pressão</p>
                    <span class="stat-value-highlight">${data.pressao} hPa</span>
                </div>
            </div>
        `;

        // 4. Configurar Listeners e Gráfico
        createHourlyChart(currentForecastData.hourlyForecast);

        document.querySelectorAll('.day-selector-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIndex = btn.getAttribute('data-day-index');
                updateMainWeatherDetails(dayIndex);
            });
        });

    } catch (error) {
        // --- Lógica de Fallback (Em caso de erro na API/Rede) ---
        console.warn('Usando dados mockados devido a erro:', error);

        currentCityName = fallbackCity;
        currentCountry = 'BR';
        currentForecastData.hourlyForecast = FALLBACK_MOCKED_HOURLY_FORECAST;
        currentForecastData.dailyForecast = FALLBACK_MOCKED_DAILY_FORECAST;

        const currentMock = FALLBACK_MOCKED_CURRENT;
        const currentDayData = currentForecastData.dailyForecast[0];

        // Recarrega o HTML com o fallback (usando dados de índice 0 dos mocks para o topo)
        climaDiv.innerHTML = `
            <div id="current-main-details" class="weather-current-details">
                <img src="http://openweathermap.org/img/wn/${currentMock.icone_atual}@4x.png" alt="Ícone do Clima" class="weather-icon flex-shrink-0">
                <div class="weather-info-main">
                    <p class="current-location-name">${currentCityName}, ${currentCountry} (MOCK)</p> 
                    <p class="current-temp">${currentMock.temp_atual}°C</p>
                    <p class="current-desc">${currentMock.descricao_atual}</p>
                    <p class="current-location">Máx: ${currentDayData.high}°C | Mín: ${currentDayData.low}°C</p>
                </div>
            </div>
            
            <h4 class="forecast-title">PREVISÃO PRÓXIMAS HORAS</h4>
            <div class="forecast-chart-wrap"> 
                <canvas id="forecast-chart-canvas"></canvas>
            </div>
            
            <h4 class="forecast-title" style="margin-top: 1.5rem; padding-top: 1rem;">PREVISÃO 7 DIAS</h4>
            <div id="daily-selector-container" class="daily-selector-grid">
                ${currentForecastData.dailyForecast.map((day, index) => `
                    <button class="day-selector-btn ${index === 0 ? 'active-day-selector' : ''}" data-day-index="${index}" data-temp-max="${day.high}" data-temp-min="${day.low}" data-day="${day.day}" data-icon="${day.icon}">
                        <span class="day-label">${day.day}</span>
                        <img src="http://openweathermap.org/img/wn/${day.icon}.png" alt="${day.day}" class="day-icon">
                        <span class="temp-range"><span class="temp-high">${day.high}°C</span> / <span class="temp-low">${day.low}°C</span></span>
                    </button>
                `).join('')}
            </div>

            <div class="weather-stats-grid-wrap">
                <div class="stat-item-grid">
                    <p class="stat-label">Amplitude Térmica</p>
                    <span class="stat-value-highlight">
                        <span class="stat-value-high">${currentDayData.high}°C</span> / 
                        <span class="stat-value-low">${currentDayData.low}°C</span>
                    </span>
                </div>
                <div class="stat-item-grid">
                    <p class="stat-label">Umidade</p>
                    <span class="stat-value-highlight">${currentMock.umidade}%</span>
                </div>
                <div class="stat-item-grid">
                    <p class="stat-label">Vento</p>
                    <span class="stat-value-highlight">${Math.round(currentMock.vento * 3.6)} km/h</span>
                </div>
                <div class="stat-item-grid empty-stat">
                    <p class="stat-label">Pressão</p>
                    <span class="stat-value-highlight">${currentMock.pressao} hPa</span>
                </div>
            </div>
        `;
        // Injeta Mocks nos detalhes Astronômicos se o clima falhar
        if (document.getElementById('sunrise-value')) {
            document.getElementById('sunrise-value').textContent = FALLBACK_MOCKED_CURRENT.sunrise;
        }
        if (document.getElementById('sunset-value')) {
            document.getElementById('sunset-value').textContent = FALLBACK_MOCKED_CURRENT.sunset;
        }

        createHourlyChart(currentForecastData.hourlyForecast);
        document.querySelectorAll('.day-selector-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIndex = btn.getAttribute('data-day-index');
                updateMainWeatherDetails(dayIndex);
            });
        });
    }
}


// ===========================================
// FUNÇÃO PARA GERAR DADOS MOCKADOS DE MERCADO (CORRIGIDO ERRO DE REPLACE)
// ===========================================
function generateMockedDataForAsset(assetPair) {
    // CORREÇÃO: Garante que o valor exista antes de tentar usar .replace()
    const priceItem = MOCKED_MARKET_DATA.find(item => item.pair === assetPair);
    const priceStr = priceItem ? priceItem.price : "0.00";

    // Agora o replace é seguro, pois priceStr é sempre uma string
    const basePrice = parseFloat(priceStr.replace('.', '').replace(',', '.')) || 50;

    const dataPoints = [];
    let currentPrice = basePrice * (1 + (Math.random() * 0.02 - 0.01));

    for (let i = 0; i < 6; i++) {
        dataPoints.push(Math.round(currentPrice * 100) / 100);
        currentPrice += (Math.random() * 0.05 - 0.025) * basePrice;
    }

    return {
        labels: ['9h', '10h', '11h', '12h', '13h', '14h'],
        data: dataPoints
    };
}


// ===========================================
// FUNÇÃO PARA RENDERIZAR DADOS DE MERCADO (AGORA COM API DE COTAÇÃO)
// ===========================================
async function renderMarketData() {
    const marketTableDiv = document.getElementById('market-table-data');
    let data;

    try {
        // Chama a função Serverless getCotacao para dados reais
        const response = await fetch('/.netlify/functions/getCotacao');
        const apiData = await response.json();

        if (apiData.error || !response.ok) {
            console.error("Erro na API de Cotação:", apiData.error || response.statusText);
            // Fallback para dados mockados se a API falhar
            data = MOCKED_MARKET_DATA;
            marketHistoryData = {};
        } else {
            // Usa os dados REAIS retornados da função Netlify
            data = apiData.marketData;
            marketHistoryData = apiData.marketHistory || {};
        }

    } catch (e) {
        console.error("Falha ao se comunicar com o Servidor de Cotação.");
        // Fallback total
        data = MOCKED_MARKET_DATA;
        marketHistoryData = {};
    }

    // ------------------------------------------------------------------
    // CORREÇÃO CRÍTICA: Se data for vazio ou nulo, saia e mostre mensagem.
    if (!data || data.length === 0) {
        marketTableDiv.innerHTML = "<p class='text-red-400 mt-4'>Não foi possível carregar dados de mercado.</p>";
        // Limpa o gráfico também
        const marketChartDiv = document.getElementById('market-chart');
        marketChartDiv.innerHTML = "";
        return;
    }
    // ------------------------------------------------------------------


    // Inicializa o gráfico do primeiro ativo (usando o primeiro da API)
    renderAssetChart(data[0].pair);

    // Renderizar Tabela de Dados de Mercado
    let tableHtml = '';
    data.forEach(item => {
        const variacaoClass = item.change > 0 ? 'up-text' : (item.change < 0 ? 'down-text' : 'neutral-text');
        const simbolo = item.change > 0 ? '▲' : (item.change < 0 ? '▼' : '—');

        tableHtml += `
            <div class="market-table-row clickable-asset" data-asset="${item.pair}">
                <span class="market-pair">${item.pair}</span>
                <span class="market-price">${item.price}</span>
                <span class="market-change ${variacaoClass}">${simbolo} ${Math.abs(item.change).toFixed(2)}%</span>
                <span class="market-volume">${item.volume}</span>
            </div>
        `;
    });
    marketTableDiv.innerHTML = tableHtml;

    // Adicionar event listeners após a renderização da tabela
    document.querySelectorAll('.clickable-asset').forEach(row => {
        row.addEventListener('click', () => {
            const asset = row.getAttribute('data-asset');
            renderAssetChart(asset);
            document.querySelectorAll('.clickable-asset').forEach(r => r.classList.remove('active-asset'));
            row.classList.add('active-asset');
        });
    });

    // Define o IBOV como ativo ativo por padrão no carregamento
    document.querySelector(`[data-asset="${data[0].pair}"]`)?.classList.add('active-asset');
}


function renderAssetChart(assetPair) {
    const marketChartDiv = document.getElementById('market-chart');
    marketChartDiv.innerHTML = '<canvas id="market-chart-canvas"></canvas>';
    const ctx = document.getElementById('market-chart-canvas').getContext('2d');

    // 1. Tenta usar dados históricos reais ou volta para o mock
    let chartLabels;
    let chartData;
    let isRealData = false;

    if (marketHistoryData[assetPair]) {
        chartLabels = marketHistoryData[assetPair].labels;
        chartData = marketHistoryData[assetPair].prices;
        isRealData = true;
    } else {
        // Usa a função mockada apenas se não houver dados históricos reais (e para IBOV/Câmbio)
        const mockData = generateMockedDataForAsset(assetPair);
        chartLabels = mockData.labels;
        chartData = mockData.data;
    }

    if (marketChartInstance) {
        marketChartInstance.destroy();
    }

    marketChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: `Preço ${assetPair}`,
                data: chartData,
                // Cor: verde se for real data, amarelo se for mock
                borderColor: isRealData ? '#34d399' : '#f59e0b',
                backgroundColor: isRealData ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: isRealData ? '#34d399' : '#f59e0b',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    grid: { color: '#374151' },
                    ticks: { color: '#9ca3af' }
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `Gráfico Intraday: ${assetPair}`,
                    color: '#f3f4f6'
                }
            }
        }
    });
}


async function renderNewsData() {
    const newsDataLgDiv = document.getElementById('news-data-lg');
    const newsDataSmDiv = document.getElementById('news-data-sm');
    const featuredNewsDiv = document.getElementById('featured-news-card');

    let newsList = MOCKED_NEWS_DATA; // Usa o mock como fallback

    try {
        // Tenta buscar notícias reais (requer a função getNews.js)
        const response = await fetch('/.netlify/functions/getNews');
        const apiData = await response.json();

        if (!apiData.error && response.ok && apiData.news && apiData.news.length > 0) {
            newsList = apiData.news;
        } else {
            console.warn("API de Notícias falhou ou não retornou dados. Usando mock.");
        }
    } catch (e) {
        console.error("Falha ao se comunicar com o Servidor de Notícias.", e);
        // Mantém o fallback
    }

    if (newsList.length === 0) return;

    // --- 1. LIMPAR DESTAQUE (PARA O LAYOUT GRID UNIFORME) ---
    if (featuredNewsDiv) {
        featuredNewsDiv.innerHTML = '';
        featuredNewsDiv.style.display = 'none';
    }

    // --- 2. RENDERIZAR LISTA (DIVIDIDA ENTRE AS DUAS SEÇÕES) ---
    // Divide as notícias na metade
    const half = Math.ceil(newsList.length / 2);
    const newsDetails = newsList.slice(0, half);
    const newsQuick = newsList.slice(half);

    // Função interna para gerar HTML de uma lista
    const generateNewsHtml = (list) => {
        if (list.length === 0) return '<p class="text-gray-400 text-sm">Sem notícias.</p>';

        return list.map(news => {
            const imageUrl = news.imageUrl || "https://placehold.co/300x160/1e293b/ffffff?text=NEWS";
            let description = news.description || news.source || "Veja mais detalhes desta notícia.";
            if (description.length > 80) description = description.substring(0, 80) + '...';

            return `
            <a href="${news.url || '#'}" target="_blank" rel="noopener noreferrer" class="news-card-custom">
                <div class="news-thumb-wrapper">
                    <img src="${imageUrl}" alt="${news.title || 'Imagem'}" class="news-thumb-rect">
                </div>
                <div class="news-content-custom">
                    <h3 class="news-title-red">${news.title || 'Sem Título'}</h3>
                    <div class="news-desc-wrapper">
                        <span class="news-bullet main-bullet">●</span>
                        <p class="news-desc-text">${description}</p>
                    </div>
                </div>
            </a>
            `;
        }).join('');
    };

    if (newsDataLgDiv) newsDataLgDiv.innerHTML = generateNewsHtml(newsDetails);

    // Para a sidebar ("Giro Rápido"), renderiza o restante
    if (newsDataSmDiv) newsDataSmDiv.innerHTML = generateNewsHtml(newsQuick);

    // Salva o token da próxima página e inicializa infinite scroll
    if (typeof apiData !== 'undefined' && apiData.nextPage) {
        nextPageCursor = apiData.nextPage;
        setupInfiniteScroll();
    }
}

function setupInfiniteScroll() {
    const newsContainer = document.getElementById('news-data-lg');
    if (!newsContainer) return;

    // Remove listener anterior se houver (para evitar duplicação em reloads)
    const newContainer = newsContainer.cloneNode(true);
    newsContainer.parentNode.replaceChild(newContainer, newsContainer);

    newContainer.addEventListener('scroll', () => {
        // Verifica se chegou perto do fim (buffer de 50px)
        if (newContainer.scrollTop + newContainer.clientHeight >= newContainer.scrollHeight - 50) {
            loadMoreNews();
        }
    });
}

async function loadMoreNews() {
    if (isLoadingNews || !nextPageCursor) return;
    isLoadingNews = true;

    const newsContainer = document.getElementById('news-data-lg');
    // Pequeno loader visual
    const loader = document.createElement('div');
    loader.id = 'news-loader';
    loader.className = 'text-center py-4 text-gray-400 text-xs';
    loader.textContent = 'Carregando mais...';
    newsContainer.appendChild(loader);

    try {
        const response = await fetch(`/.netlify/functions/getNews?page=${nextPageCursor}`);
        const data = await response.json();

        // Remove loader
        const currentLoader = document.getElementById('news-loader');
        if (currentLoader) currentLoader.remove();

        if (data.news && data.news.length > 0) {
            // Gera HTML (reutilizando lógica simplificada)
            const generateNewsHtml = (list) => {
                return list.map(news => {
                    const imageUrl = news.imageUrl || "https://placehold.co/300x160/1e293b/ffffff?text=NEWS";
                    let description = news.description || news.source || "Veja mais detalhes desta notícia.";
                    if (description.length > 80) description = description.substring(0, 80) + '...';

                    return `
                    <a href="${news.url || '#'}" target="_blank" rel="noopener noreferrer" class="news-card-custom">
                        <div class="news-thumb-wrapper">
                            <img src="${imageUrl}" alt="${news.title || 'Imagem'}" class="news-thumb-rect">
                        </div>
                        <div class="news-content-custom">
                            <h3 class="news-title-red">${news.title || 'Sem Título'}</h3>
                            <div class="news-desc-wrapper">
                                <span class="news-bullet main-bullet">●</span>
                                <p class="news-desc-text">${description}</p>
                            </div>
                        </div>
                    </a>
                    `;
                }).join('');
            };

            // Append HTML
            newsContainer.insertAdjacentHTML('beforeend', generateNewsHtml(data.news));

            // Atualiza cursor
            nextPageCursor = data.nextPage || null;

            if (!nextPageCursor) {
                newsContainer.insertAdjacentHTML('beforeend', '<p class="text-center text-gray-500 text-xs py-2">Fim.</p>');
            }
        }
    } catch (error) {
        console.error("Erro ao carregar mais notícias:", error);
    } finally {
        isLoadingNews = false;
        const currentLoader = document.getElementById('news-loader');
        if (currentLoader) currentLoader.remove();
    }
}