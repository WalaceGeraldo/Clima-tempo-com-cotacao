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

// ===========================================
// FUNÇÃO DE CLIMA (FINAL - COM GRID DE ESTATÍSTICAS)
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

        // 1. ESTRUTURA HTML FINAL
        climaDiv.innerHTML = `
            <div class="weather-current-details">
                <img src="http://openweathermap.org/img/wn/${data.icone}@4x.png" alt="Ícone do Clima" class="weather-icon">
                <div>
                    <p class="current-temp">${Math.round(data.temperatura)}°C</p>
                    <p class="current-desc">${data.descricao.charAt(0).toUpperCase() + data.descricao.slice(1)}, ${data.cidade}</p>
                    <p class="current-location">${data.cidade}, ${data.pais}</p>
                </div>
            </div>

            <h4 class="forecast-title">PREVISÃO 7 DIAS</h4>
            <div class="forecast-chart-wrap"> 
                <canvas id="forecast-chart-canvas"></canvas>
            </div>
            
            <div class="weather-stats-grid-wrap">
                
                <div class="stat-item-grid">
                    <p class="stat-label">Amplitude Térmica</p>
                    <span class="stat-value-highlight">
                        <span class="stat-value-high">${Math.round(data.temperaturaMax)}°C</span> / 
                        <span class="stat-value-low">${Math.round(data.temperaturaMin)}°C</span>
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

        // 2. CRIAÇÃO DO GRÁFICO (Chart.js)
        const forecastCtx = document.getElementById('forecast-chart-canvas').getContext('2d');
        const temps = MOCKED_DAYS_FORECAST.map(d => (d.high + d.low) / 2); 
        const highTemps = MOCKED_DAYS_FORECAST.map(d => d.high); 
        const lowTemps = MOCKED_DAYS_FORECAST.map(d => d.low); 
        const labels = MOCKED_DAYS_FORECAST.map(d => d.day);

        const chartIcons = MOCKED_DAYS_FORECAST.map(day => {
            if (day.icon === '01d') return iconImages.sun;
            if (day.icon === '02d') return iconImages['cloud-sun'];
            if (day.icon === '04d') return iconImages.clouds;
            if (day.icon === '09d' || day.icon === '10d') return iconImages.rain;
            return iconImages.clouds;
        });


        forecastChartInstance = new Chart(forecastCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperatura Média',
                    data: temps, 
                    borderColor: '#6366f1', 
                    backgroundColor: 'rgba(99, 102, 241, 0.2)', 
                    fill: 'start', 
                    tension: 0.4, 
                    pointRadius: 0, 
                    borderWidth: 2
                }, {
                    label: 'Máxima',
                    data: highTemps,
                    type: 'line',
                    borderColor: '#f87171',
                    pointRadius: 4,
                    pointBackgroundColor: '#f87171',
                    borderWidth: 0,
                    showLine: false,
                    yAxisID: 'y'
                }, {
                    label: 'Mínima',
                    data: lowTemps,
                    type: 'line',
                    borderColor: '#60a5fa',
                    pointRadius: 4,
                    pointBackgroundColor: '#60a5fa',
                    borderWidth: 0,
                    showLine: false,
                    yAxisID: 'y'
                }, {
                    label: 'Ícones',
                    data: highTemps.map(h => h + 1),
                    type: 'line',
                    borderColor: 'transparent',
                    pointStyle: chartIcons,
                    pointRadius: 16,
                    showLine: false,
                    yAxisID: 'y'
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
                        display: false, 
                        grid: { display: false },
                        min: Math.min(...lowTemps) - 5, 
                        max: Math.max(...highTemps) + 5
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });

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