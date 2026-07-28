// API TMDB
const API_KEY = '04c35731a5ee918f014970082a0088b1';
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/original';
const IMG_POSTER_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Busca dados da API do TMDB.
 * @param {string} endpoint - O endpoint da API (ex: '/movie/popular')
 * @returns {Promise<object|null>} Os dados da API ou null em caso de erro.
 */
async function fetchTMDB(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?';
    let url = `${API_BASE_URL}${endpoint}${separator}api_key=${API_KEY}`;
    if (!endpoint.toLowerCase().includes('language=')) {
        url += '&language=pt-BR';
    }

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

export { API_KEY, API_BASE_URL, IMG_BASE_URL, IMG_POSTER_URL, fetchTMDB };
