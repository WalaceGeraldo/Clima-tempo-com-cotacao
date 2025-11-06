// public/js/scripts.js

let forecastChartInstance = null; 
let marketChartInstance = null;

// --- DADOS MOCKADOS (APENAS MERCADO E NOTÍCIAS) ---
const MOCKED_MARKET_DATA = [
    { pair: "IBOV", price: "128.500", change: 0.17, volume: "105.4M" }, 
    { pair: "PETR4", price: "30.50", change: 0.50, volume: "65.1M" }, 
    { pair: "VALE3", price: "64.62", change: -1.12, volume: "42.0M" },
    { pair: "ITUB4", price: "30.96", change: -0.30, volume: "39.7M" },
    { pair: "EUR/USD", price: "1.0095", change: -0.32, volume: "1.2M" },
    { pair: "XRP/BRL", price: "4.32", change: 0.85, volume: "2.1M" } 
];

const MOCKED_NEWS_DATA = [
    { title: "Tech Stocks Rally Amidst Increase Volatility", source: "MarketWatch", imageUrl: "https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" },
    { title: "How Bitcoin Bulls Dominate Amidst Regulatory Concerns", source: "CoinDesk", imageUrl: "https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" },
    { title: "Global Economic Outlook: What to Expect Next Quarter", source: "Bloomberg", imageUrl: "https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" }
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
let currentForecastData = {}; // Armazena dados reais (ou mockados) da API

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
    
    // 2. Inicia a busca de dados
    fetchClima('Rio de Janeiro, BR'); 
    renderMarketData(); 
    renderNewsData();
    
    // 3. Configura o botão de busca
    const searchButton = document.getElementById('search-button');
    const cityInput = document.getElementById('city-input');

    searchButton.addEventListener('click', () => {
        const cityName = cityInput.value.trim(); 
        if (cityName) {
            fetchClima(cityName);
        } else {
            alert('Por favor, digite o nome de uma cidade.');
        }
    });

    cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });
});

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
// CORRIGIDA: Mantém a temperatura em tempo real no topo, atualizando apenas Mín/Máx e o dia.
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
// FUNÇÃO DE CLIMA (GARANTE QUE A TEMPERATURA ATUAL SEJA ATUALIZADA)
// ===========================================
async function fetchClima(city) { 
    const climaDiv = document.getElementById('clima-data');

    if (forecastChartInstance) {
        forecastChartInstance.destroy();
    }
    
    // --- DADOS MOCKADOS DE FALLBACK (PARA CASO DE ERRO NA API) ---
    const FALLBACK_MOCKED_HOURLY_FORECAST = [
        { label: '14h', temp: 25, icon: '01d' },
        { label: '15h', temp: 22, icon: '02d' },
        { label: '16h', temp: 24, icon: '04d' },
        { label: '17h', temp: 23, icon: '01d' },
        { label: '18h', temp: 21, icon: '03d' },
        { label: '19h', temp: 19, icon: '09d' },
    ];
    const diaAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
    const FALLBACK_MOCKED_DAILY_FORECAST = [
        { day: diaAtual, icon: '01d', high: 36, low: 20 }, 
        { day: 'Sex', icon: '02d', high: 35, low: 19 }, 
        { day: 'Sáb', icon: '04d', high: 32, low: 18 }, 
        { day: 'Dom', icon: '09d', high: 28, low: 15 }, 
        { day: 'Seg', icon: '10d', high: 30, low: 17 }, 
        { day: 'Ter', icon: '03d', high: 33, low: 21 }, 
        { day: 'Qua', icon: '01d', high: 34, low: 22 }, 
    ];
    const FALLBACK_MOCKED_CURRENT = { temp_atual: 36, icone_atual: '01d', descricao_atual: 'DADOS MOCKADOS', umidade: 75, vento: 3.3, pressao: 1012 };
    // -------------------------------------------------------------

    const url = `/.netlify/functions/getClima?city=${encodeURIComponent(city)}&lang=pt`; 

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
                🚨 Erro de API para ${city}: ${data.error}<br>
                Verifique o nome da cidade ou a chave do WeatherAPI/OpenWeatherMap.
            </p>`;
            throw new Error(`Erro da API: ${data.error}`);
        }
        
        // --- 1. ARMAZENAR DADOS GLOBAIS REAIS ---
        currentCityName = data.cidade || city;
        currentCountry = data.pais || 'BR';
        currentForecastData.hourlyForecast = data.hourlyForecast; 
        currentForecastData.dailyForecast = data.dailyForecast;
        
        // **VARIÁVEIS CHAVE PARA O DISPLAY INICIAL (DIA ATUAL E TEMP ATUAL)**
        const currentDayData = currentForecastData.dailyForecast[0];
        const currentTemp = data.temp_atual; // Temperatura em tempo real
        const currentIcon = data.icone_atual;
        const currentDesc = data.descricao_atual.toUpperCase();
        
        // 2. ESTRUTURA HTML FINAL (Injetando dados do DIA ATUAL e TEMP ATUAL)
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
                        <span class="temp-range"><span class="temp-high">${day.high}°</span> / <span class="temp-low">${day.low}°</span></span>
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

        // 3. Configurar Listeners e Gráfico
        createHourlyChart(currentForecastData.hourlyForecast); 
        
        document.querySelectorAll('.day-selector-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIndex = btn.getAttribute('data-day-index');
                updateMainWeatherDetails(dayIndex);
            });
        });

    } catch (error) {
        // --- Lógica de Fallback (Em caso de erro na API/Rede) ---
        console.warn('Usando dados mockados devido a erro na API/Rede:', error);
        
        currentCityName = city;
        currentCountry = 'BR';
        currentForecastData.hourlyForecast = FALLBACK_MOCKED_HOURLY_FORECAST;
        currentForecastData.dailyForecast = FALLBACK_MOCKED_DAILY_FORECAST;

        const currentMock = FALLBACK_MOCKED_CURRENT;
        const currentDayData = currentForecastData.dailyForecast[0];

        // *** CORREÇÃO APLICADA AQUI TAMBÉM NO FALLBACK ***
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
                        <span class="temp-range"><span class="temp-high">${day.high}°</span> / <span class="temp-low">${day.low}°</span></span>
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
// FUNÇÕES DE MERCADO E NOTÍCIAS (Inalteradas)
// ===========================================
function generateMockedDataForAsset(assetPair) {
    const basePrice = parseFloat(MOCKED_MARKET_DATA.find(item => item.pair === assetPair)?.price.replace('.', '').replace(',', '.')) || 50; 
    
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

function renderAssetChart(assetPair) {
    const marketChartDiv = document.getElementById('market-chart');
    marketChartDiv.innerHTML = '<canvas id="market-chart-canvas"></canvas>';
    const ctx = document.getElementById('market-chart-canvas').getContext('2d');
    
    const assetData = generateMockedDataForAsset(assetPair);

    if (marketChartInstance) {
        marketChartInstance.destroy();
    }

    marketChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: assetData.labels,
            datasets: [{
                label: `Preço ${assetPair}`,
                data: assetData.data,
                borderColor: '#34d399', 
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#34d399',
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

function renderMarketData() {
    const marketTableDiv = document.getElementById('market-table-data');

    // Inicializa o gráfico do primeiro ativo
    renderAssetChart(MOCKED_MARKET_DATA[0].pair); 

    // Renderizar Tabela de Dados de Mercado
    let tableHtml = '';
    MOCKED_MARKET_DATA.forEach(item => {
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
            
            // Adicionar classe de destaque na linha clicada
            document.querySelectorAll('.clickable-asset').forEach(r => r.classList.remove('active-asset'));
            row.classList.add('active-asset');
        });
    });
    
    // Define o IBOV como ativo ativo por padrão no carregamento
    document.querySelector(`[data-asset="${MOCKED_MARKET_DATA[0].pair}"]`)?.classList.add('active-asset');
}

// ===========================================
// FUNÇÃO PARA RENDERIZAR NOTÍCIAS (MOCKADO)
// ===========================================
function renderNewsData() {
    const newsDataLgDiv = document.getElementById('news-data-lg');
    const newsDataSmDiv = document.getElementById('news-data-sm');

    let newsHtml = '';
    MOCKED_NEWS_DATA.forEach(news => {
        newsHtml += `
            <div class="news-item">
                <img src="https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" alt="Thumbnail" class="news-thumb">
                <div>
                    <p class="news-title">${news.title}</p>
                    <p class="news-source">${news.source}</p>
                </div>
            </div>
        `;
    });

    newsDataLgDiv.innerHTML = newsHtml; 
    newsDataSmDiv.innerHTML = newsHtml; 
}