// Chave da API (Mova para um .env em um projeto real)
const API_KEY = '04c35731a5ee918f014970082a0088b1';

// URLs Base
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/original';
const IMG_POSTER_URL = 'https://image.tmdb.org/t/p/w500'; // URL otimizada para pôsteres

/**
 * Busca dados da API do TMDB.
 * @param {string} endpoint - O endpoint da API (ex: '/movie/popular')
 * @returns {Promise<object|null>} Os dados da API ou null em caso de erro.
 */
async function fetchTMDB(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?';
    // A API_KEY é usada aqui dentro do módulo
    const url = `${API_BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro de HTTP! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Falha ao buscar dados do endpoint: ${endpoint}`, error);
        return null;
    }
}

// Exporta as funções e constantes para serem usadas em outros módulos
// CORREÇÃO: Adicionado API_KEY à exportação
export { API_KEY, API_BASE_URL, IMG_BASE_URL, IMG_POSTER_URL, fetchTMDB };

