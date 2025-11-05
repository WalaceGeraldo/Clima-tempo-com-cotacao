// public/js/scripts.js

let forecastChartInstance = null; 
let marketChartInstance = null;

// --- DADOS MOCKADOS FINAIS (INCLUINDO BRASIL) ---
const MOCKED_MARKET_DATA = [
    // Índice do Mercado (IBOV)
    { pair: "IBOV", price: "128.500", change: 0.17, volume: "105.4M" }, 
    // Ativos Brasileiros (Blue Chips)
    { pair: "PETR4", price: "30.50", change: 0.50, volume: "65.1M" }, 
    { pair: "VALE3", price: "64.62", change: -1.12, volume: "42.0M" },
    { pair: "ITUB4", price: "30.96", change: -0.30, volume: "39.7M" },
    // Ativos Internacionais/Cripto
    { pair: "EUR/USD", price: "1.0095", change: -0.32, volume: "1.2M" },
    { pair: "XRP/BRL", price: "4.32", change: 0.85, volume: "2.1M" } 
];

const MOCKED_NEWS_DATA = [
    { title: "Tech Stocks Rally Amidst Increase Volatility", source: "MarketWatch", imageUrl: "https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" },
    { title: "How Bitcoin Bulls Dominate Amidst Regulatory Concerns", source: "CoinDesk", imageUrl: "https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" },
    { title: "Global Economic Outlook: What to Expect Next Quarter", source: "Bloomberg", imageUrl: "https://via.placeholder.com/60x60/334155/ffffff?text=NEWS" }
];

const MOCKED_DAYS_FORECAST = [
    { day: 'Dom', icon: '01d', high: 36, low: 20 }, 
    { day: 'Seg', icon: '02d', high: 35, low: 19 }, 
    { day: 'Ter', icon: '04d', high: 32, low: 18 }, 
    { day: 'Qua', icon: '09d', high: 28, low: 15 }, 
    { day: 'Qui', icon: '10d', high: 30, low: 17 }, 
    { day: 'Sex', icon: '03d', high: 33, low: 21 }, 
    { day: 'Sáb', icon: '01d', high: 34, low: 22 }, 
];

const MOCKED_HOURLY_FORECAST = [
    { label: '10h', temp: 19, icon: '01d' },
    { label: '11h', temp: 21, icon: '02d' },
    { label: '12h', temp: 20, icon: '04d' },
    { label: '13h', temp: 23, icon: '01d' },
    { label: '14h', temp: 25, icon: '03d' },
    { label: '15h', temp: 22, icon: '09d' },
    { label: '16h', temp: 24, icon: '01d' },
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
    fetchClima('Nova Iorque'); 
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
function createHourlyChart() {
    // Destruir gráfico anterior se houver
    if (forecastChartInstance) {
        forecastChartInstance.destroy();
    }
    
    const canvas = document.getElementById('forecast-chart-canvas');
    if (!canvas) return; // Evita erro se o elemento não existir
    const ctx = canvas.getContext('2d');
    
    const hourlyTemps = MOCKED_HOURLY_FORECAST.map(h => h.temp);
    const hourlyLabels = MOCKED_HOURLY_FORECAST.map(h => h.label);
    const iconSet = MOCKED_HOURLY_FORECAST.map(h => {
        if (h.icon === '01d') return iconImages.sun;
        if (h.icon === '02d') return iconImages['cloud-sun'];
        if (h.icon === '04d') return iconImages.clouds;
        if (h.icon === '09d') return iconImages.rain;
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
                    reverse: true, // <--- AQUI: Inverte o eixo X
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

// --- FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO DO CLIMA AO CLICAR ---
function updateMainWeatherDetails(dayIndex) {
    const dayData = MOCKED_DAYS_FORECAST[dayIndex];
    
    const mainDetailsDiv = document.getElementById('current-main-details');

    if (!mainDetailsDiv) return;

    mainDetailsDiv.innerHTML = `
        <img src="http://openweathermap.org/img/wn/${dayData.icon}@4x.png" alt="Ícone do Clima" class="weather-icon flex-shrink-0">
        <div>
            <p class="current-temp">${dayData.high}°C</p>
            <p class="current-desc">Previsão para ${dayData.day}</p>
            <p class="current-location">Máx: ${dayData.high}°C | Mín: ${dayData.low}°C</p>
        </div>
    `;
}


// ===========================================
// FUNÇÃO DE CLIMA (PRINCIPAL)
// ===========================================
async function fetchClima(city) { 
    const climaDiv = document.getElementById('clima-data');

    if (forecastChartInstance) {
        forecastChartInstance.destroy();
    }

    const url = `/.netlify/functions/getClima?city=${encodeURIComponent(city)}&lang=pt`; 

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            climaDiv.innerHTML = `<p class="text-red-400">Erro de rede (${response.status}) ao buscar a função.</p>`;
            return;
        }
        
        const data = await response.json();

        if (data.error) {
            climaDiv.innerHTML = `<p class="text-red-400 font-semibold mt-4">
                🚨 Erro de API para ${city}: ${data.error}<br>
                Verifique o nome da cidade ou a chave do OpenWeatherMap.
            </p>`;
            return;
        }

        // 1. ESTRUTURA HTML FINAL COM SELETOR DE DIAS
        climaDiv.innerHTML = `
            <div id="current-main-details" class="weather-current-details">
                </div>

            <h4 class="forecast-title">PREVISÃO PRÓXIMAS HORAS</h4>
            <div class="forecast-chart-wrap"> 
                <canvas id="forecast-chart-canvas"></canvas>
            </div>
            
            <h4 class="forecast-title" style="margin-top: 1.5rem; padding-top: 1rem;">PREVISÃO 7 DIAS</h4>
            <div id="daily-selector-container" class="daily-selector-grid">
                ${MOCKED_DAYS_FORECAST.map((day, index) => `
                    <button class="day-selector-btn" data-day-index="${index}" data-temp-max="${day.high}" data-temp-min="${day.low}" data-day="${day.day}" data-icon="${day.icon}">
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
                        <span class="stat-value-high">${MOCKED_DAYS_FORECAST[0].high}°C</span> / 
                        <span class="stat-value-low">${MOCKED_DAYS_FORECAST[0].low}°C</span>
                    </span>
                </div>
                <div class="stat-item-grid">
                    <p class="stat-label">Umidade</p>
                    <span class="stat-value-highlight">75%</span>
                </div>
                <div class="stat-item-grid">
                    <p class="stat-label">Vento</p>
                    <span class="stat-value-highlight">12 km/h</span>
                </div>
                <div class="stat-item-grid empty-stat">
                    <p class="stat-label">Pressão</p>
                    <span class="stat-value-highlight">1012 hPa</span>
                </div>
            </div>
        `;

        // 2. Configurar Listeners e Gráfico
        createHourlyChart(); // Cria o gráfico de horas (no canvas)
        
        // Adicionar Listeners para os botões de dia
        document.querySelectorAll('.day-selector-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIndex = btn.getAttribute('data-day-index');
                updateMainWeatherDetails(dayIndex);
            });
        });
        
        // Simular o clique no dia atual (índice 0) para carregar os detalhes iniciais no topo
        document.querySelector('.day-selector-btn')?.click();

    } catch (error) {
        climaDiv.innerHTML = `<p class="text-red-400">Falha na comunicação total com o servidor.</p>`;
        console.error('Erro ao buscar clima:', error);
    }
}

// ===========================================
// FUNÇÃO PARA RENDERIZAR DADOS DE MERCADO (Com clique dinâmico)
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