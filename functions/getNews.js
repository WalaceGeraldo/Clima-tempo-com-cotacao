// functions/getNews.js
const axios = require('axios');

// Usando NEWSAPI_API_KEY (agora com a chave da newsdata.io)
const API_KEY = process.env.NEWSAPI_API_KEY;
const BASE_URL = 'https://newsdata.io/api/1/latest?';

exports.handler = async (event, context) => {
    if (!API_KEY) {
        return {
            statusCode: 200, // Retorna 200 para o frontend tratar sem erro de console crítico
            body: JSON.stringify({ error: "Chave da API (NEWSAPI_API_KEY) não está configurada." }),
        };
    }

    // Aceita parâmetro de paginação 'page'
    const { page } = event.queryStringParameters || {};

    // Parâmetros para newsdata.io: apikey, country=br, language=pt
    let url = `${BASE_URL}apikey=${API_KEY}&country=br&language=pt`;
    if (page) {
        url += `&page=${page}`;
    }

    try {
        const response = await axios.get(url);
        // Newsdata.io retorna "results" em vez de "articles" e "nextPage" para paginação
        const articles = response.data.results;
        const nextPage = response.data.nextPage;

        if (!articles || articles.length === 0) {
            // Se for página > 1 e não tiver resultados, pode ser o fim da lista, não necessariamente erro.
            if (page) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ news: [], nextPage: null }),
                };
            }
            throw new Error("Newsdata.io retornou zero artigos.");
        }

        const newsData = articles.map(article => ({
            title: article.title || "Notícia sem título",
            source: article.source_id || "Fonte Desconhecida",
            imageUrl: article.image_url || null, // Newsdata.io usa image_url
            url: article.link,                   // Newsdata.io usa link
            publishedAt: article.pubDate,        // Newsdata.io usa pubDate
            description: article.description     // Newsdata.io usa description
        })).filter(item => item.url && item.imageUrl); // Filtra itens sem URL ou imagem

        return {
            statusCode: 200,
            body: JSON.stringify({
                news: newsData,
                nextPage: nextPage // Retorna o token para a próxima página
            }),
        };

    } catch (error) {
        console.error('Erro na função de notícias (Newsdata.io):', error.message);

        let msg = error.message;
        if (error.response && error.response.data) {
            console.error("Newsdata Error details:", JSON.stringify(error.response.data));
            msg += ` - ${JSON.stringify(error.response.data)}`;
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha ao buscar notícias: ${msg}` }),
        };
    }
};