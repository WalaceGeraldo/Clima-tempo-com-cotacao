// public/js/scripts.js

// Variável global para gerenciar a instância do gráfico
let tempChartInstance = null; 

// --- Definição dos Skeleton Loaders (Componentes HTML) ---
const CLIMA_SKELETON = `
    <div class="animate-pulse flex flex-col space-y-4 pt-4">
        <div class="flex justify-between items-center">
            <div class="space-y-2">
                <div class="h-6 bg-gray-500 rounded w-48"></div>
                <div class="h-4 bg-gray-600 rounded w-32"></div>
            </div>
            <div class="h-10 w-10 bg-gray-500 rounded-full"></div>
        </div>
        <div class="h-40 bg-gray-700 rounded-lg"></div>
        <div class="grid grid-cols-4 gap-4">
            <div class="h-12 bg-gray-600 rounded"></div>
            <div class="h-12 bg-gray-600 rounded"></div>
            <div class="h-12 bg-gray-600 rounded"></div>
            <div class="h-12 bg-gray-600 rounded"></div>
        </div>
    </div>
`;

const COTACAO_SKELETON = `
    <div class="animate-pulse space-y-4 mt-4">
        <div class="flex justify-between items-center h-8 bg-gray-600 rounded"></div>
        <div class="flex justify-between items-center h-8 bg-gray-600 rounded w-11/12"></div>
        <div class="flex justify-between items-center h-8 bg-gray-600 rounded w-10/12"></div>
        <div class="flex justify-between items-center h-8 bg-gray-600 rounded w-9/12"></div>
    </div>
`;
// --- Fim das Definições dos Skeleton Loaders ---

// --- Definição dos Ícones para o Gráfico (Simulação) ---
const iconImages = {};
const iconUrls = [
    { name: 'sun', url: 'http://openweathermap.org/img/wn/01d.png' },
    { name: 'clouds', url: 'http://openweathermap.org/img/wn/04d.png' },
    { name: 'rain', url: 'http://openweathermap.org/img/wn/10d.png' }
];

function loadIcons() {
    iconUrls.forEach(item => {
        const img = new Image();
        img.src = item.url;
        img.width = 32;
        img.height = 32;
        iconImages[item.name] = img;
    });
}
// --- Fim da Definição dos Ícones ---


document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicia o Front-end exibindo os loaders
    document.getElementById('clima-data').innerHTML = CLIMA_SKELETON;
    document.getElementById('cotacao-data').innerHTML = COTACAO_SKELETON;
    
    loadIcons(); // Carrega as imagens dos ícones primeiro
    
    // 2. Inicia a busca de dados
    fetchClima('Curitiba'); 
    fetchCotacao();

    const searchButton = document.getElementById('search-button');
    const cityInput = document.getElementById('city-input');

    searchButton.addEventListener('click', () => {
        const cityName = cityInput.value.trim(); 
        if (cityName) {
            document.getElementById('clima-data').innerHTML = CLIMA_SKELETON; // Mostrar loader na nova busca
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
// FUNÇÃO DE CLIMA (Com Gráfico e Loading State)
// ===========================================
async function fetchClima(city) { 
    const climaDiv = document.getElementById('clima-data');

    if (tempChartInstance) {
        tempChartInstance.destroy();
    }

    const url = `/.netlify/functions/getClima?city=${encodeURIComponent(city)}`; 

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            climaDiv.innerHTML = `<p class="text-red-700">Erro de rede (${response.status}) ao buscar a função.</p>`;
            return;
        }
        
        const data = await response.json();

        if (data.error) {
            climaDiv.innerHTML = `<p class="text-red-700 font-semibold mt-4">
                🚨 Erro de API para ${city}: ${data.error}<br>
                Verifique o nome da cidade ou a chave do OpenWeatherMap.
            </p>`;
            return;
        }

        // 1. ESTRUTURA HTML FINAL
        climaDiv.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-2xl font-bold text-gray-900">${data.cidade}, ${data.pais}</h3>
                    <p class="text-lg text-gray-600 mt-1">${data.descricao.charAt(0).toUpperCase() + data.descricao.slice(1)}</p>
                    <p class="text-4xl font-extrabold text-blue-600 mt-2">${Math.round(data.temperatura)}°C</p>
                </div>
                <div>
                    <img src="http://openweathermap.org/img/wn/${data.icone}@4x.png" alt="Ícone do Clima" class="weather-icon mx-auto">
                </div>
            </div>

            <h4 class="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-300 mb-3">Previsão de 5 Horas (Simulado)</h4>
            <div class="h-32 mb-4 bg-gray-100 p-2 rounded-lg border border-gray-300"> 
                <canvas id="temperatura-chart"></canvas>
            </div>
            
            <h4 class="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-300 mb-3 mt-4">Detalhes do Dia</h4>
            <div id="clima-detalhes" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition duration-150"><p class="text-gray-500 text-xs">Mínima</p><p class="text-md font-semibold">${Math.round(data.temperaturaMin)}°C</p></div>
                <div class="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition duration-150"><p class="text-gray-500 text-xs">Máxima</p><p class="text-md font-semibold">${Math.round(data.temperaturaMax)}°C</p></div>
                <div class="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition duration-150"><p class="text-gray-500 text-xs">Umidade</p><p class="text-md font-semibold">75%</p></div> 
                <div class="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition duration-150"><p class="text-gray-500 text-xs">Vento</p><p class="text-md font-semibold">12 km/h</p></div> 
            </div>
        `;
        
        // 2. CRIAÇÃO DO GRÁFICO (Chart.js)
        const ctx = document.getElementById('temperatura-chart').getContext('2d');
        tempChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Agora', '1h', '2h', '3h', '4h'], 
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: [data.temperatura, data.temperatura + 2, data.temperatura - 1, data.temperatura + 3, data.temperatura], 
                    borderColor: '#3b82f6', 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#fff',
                    pointStyle: [
                        iconImages.sun,        
                        iconImages.clouds,     
                        iconImages.rain,       
                        iconImages.sun,        
                        iconImages.clouds      
                    ], 
                    pointRadius: 16, 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                scales: {
                    x: { ticks: { color: '#6b7280' }, grid: { display: false } },
                    y: { display: false, grid: { color: '#e5e7eb' } },
                },
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                }
            }
        });

    } catch (error) {
        climaDiv.innerHTML = `<p class="text-red-700">Falha na comunicação total com o servidor.</p>`;
        console.error('Erro ao buscar clima:', error);
    }
}

// ===========================================
// FUNÇÃO DE COTAÇÃO (Final)
// ===========================================
async function fetchCotacao() {
    const cotacaoDiv = document.getElementById('cotacao-data');
    
    const url = '/.netlify/functions/getCotacao';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            cotacaoDiv.innerHTML = `<p class="text-red-700">Erro de rede (${response.status}) ao buscar a função.</p>`;
            return;
        }

        const cotacoes = await response.json();

        if (cotacoes.error) {
            cotacaoDiv.innerHTML = `<p class="text-red-700">Erro ao buscar cotações: ${cotacoes.error}</p>`;
            return;
        }

        let html = '';
        for (const key in cotacoes) {
            const item = cotacoes[key];
            if (!item || item.valor === undefined) continue;
            
            const nome = key.toUpperCase();
            
            const variacaoClass = item.variacao > 0 ? 'up-text up-bg' : (item.variacao < 0 ? 'down-text down-bg' : 'text-gray-600');
            const simbolo = item.variacao > 0 ? '▲' : (item.variacao < 0 ? '▼' : '—');
            
            html += `
                <div class="flex justify-between items-center pb-3 border-b border-gray-300 last:border-b-0">
                    <span class="text-gray-700 font-medium">${nome} (BRL)</span>
                    <span class="flex items-center gap-2 font-bold text-gray-900">
                        R$ ${item.valor}
                        <span class="text-sm font-semibold ${variacaoClass} p-1 rounded">
                            ${simbolo} ${item.variacao}%
                        </span>
                    </span>
                </div>
            `;
        }

        cotacaoDiv.innerHTML = html;

    } catch (error) {
        cotacaoDiv.innerHTML = `<p class="text-red-700">Falha na conexão com o servidor de cotação.</p>`;
        console.error('Erro ao buscar cotação:', error);
    }
}