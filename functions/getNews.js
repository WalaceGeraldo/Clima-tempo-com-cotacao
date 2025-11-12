// functions/getNews.js
const axios = require('axios');

// ATENÇÃO: A variável é lida como NEWSDATA_API_KEY
const API_KEY = process.env.NEWSDATA_API_KEY; 
const BASE_URL = 'https://newsdata.io/api/1/news?';

exports.handler = async (event, context) => {
    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Chave da API (NEWSDATA_API_KEY) não está configurada." }),
        };
    }
    
    // Parâmetros de busca: 
    // country=br, language=pt, category=business (Economia/Negócios)
    const url = `${BASE_URL}apikey=${API_KEY}&country=br&language=pt&category=business&size=6`;
    
    try {
        const response = await axios.get(url);
        const articles = response.data.results; // NewsData.io usa 'results' para o array principal
        
        if (!articles || articles.length === 0) {
             throw new Error("NewsData.io retornou zero artigos.");
        }

        // Mapeamos os dados para o formato que o frontend espera
        const newsData = articles.map(article => ({
            title: article.title || "Notícia sem título",
            source: article.source_id || "Fonte Desconhecida",
            // NewsData.io usa o campo 'image_url'
            imageUrl: article.image_url || null, 
            url: article.link // NewsData.io usa 'link'
        })).filter(item => item.url); // Filtra itens sem URL válida

        return {
            statusCode: 200,
            body: JSON.stringify({
                news: newsData, 
            }),
        };

    } catch (error) {
        console.error('Erro na função de notícias (NewsData.io):', error.message);
        // Retorna um erro detalhado se a API falhar
        let errorMessage = error.message;
        if (error.response && error.response.data && error.response.data.results) {
             errorMessage = error.response.data.results; // Pega a mensagem de erro específica da NewsData.io
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha ao buscar notícias (NewsData.io): ${errorMessage}` }),
        };
    }
};