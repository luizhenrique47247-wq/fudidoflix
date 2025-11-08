// ARQUIVO: contentFetcher.js

/**
 * Módulo responsável por toda a lógica de busca de conteúdo da API.
 * Recebe parâmetros e retorna os dados brutos (JSON) da API.
 */

import { fetchTMDB } from './api.js';

/**
 * Busca o item em destaque (Hero).
 * @returns {Promise<object|null>} Os dados do item ou null.
 */
export async function fetchHeroData() {
    const data = await fetchTMDB('/trending/all/day');
    if (data && data.results && data.results.length > 0) {
        const playableItems = data.results.filter(item => item.backdrop_path && item.overview);
        if (playableItems.length > 0) {
            // Retorna um item aleatório dos resultados
            return playableItems[Math.floor(Math.random() * playableItems.length)];
        }
    }
    return null;
}

/**
 * Busca dados para um carrossel (fileira) com base em um endpoint.
 * @param {string} endpoint - O endpoint da API (ex: '/movie/popular').
 * @returns {Promise<Array>} Um array de itens.
 */
export async function fetchRowData(endpoint) {
    try {
        const data = await fetchTMDB(endpoint);
        return data?.results || [];
    } catch (error) {
        console.error(`Erro ao buscar dados para a fileira: ${endpoint}`, error);
        return [];
    }
}

/**
 * Busca dados para as páginas de grade (Explorar, Animes).
 * @param {object} filters - Um objeto contendo todos os filtros.
 * @returns {Promise<object|null>} O objeto de resposta da API (com 'results').
 */
export async function fetchGridData(filters) {
    const {
        type,
        page,
        sortBy,
        genre,
        provider,
        company,
        keyword,
        country,
        era,
        eraType
    } = filters;

    let endpoint = `/discover/${type}?`;
    endpoint += `&sort_by=${sortBy}`;
    endpoint += `&page=${page}`;
    if (genre) endpoint += `&with_genres=${genre}`;
    if (provider) endpoint += `&with_watch_providers=${provider}&watch_region=BR`;
    if (company) endpoint += `&with_companies=${company}`;
    if (keyword) endpoint += `&with_keywords=${keyword}`;
    if (country) endpoint += `&with_origin_country=${country}`;
    if (era) {
        const eraFilter = (eraType === 'movie') ? 'primary_release_date.lte' : 'first_air_date.lte';
        endpoint += `&${eraFilter}=${era}`;
    }
    endpoint += '&vote_count.gte=50';

    try {
        return await fetchTMDB(endpoint);
    } catch (error) {
        console.error(`Erro ao buscar dados da grade:`, error);
        return null;
    }
}

/**
 * Busca dados da página de Busca.
 * @param {string} query - O termo de busca.
 * @returns {Promise<object|null>} O objeto de resposta da API (com 'results').
 */
export async function fetchSearchData(query) {
    const endpoint = `/search/multi?query=${encodeURIComponent(query)}`;
    try {
        return await fetchTMDB(endpoint);
    } catch (error) {
        console.error(`Erro ao buscar dados da busca:`, error);
        return null;
    }
}

// ==========================================================
// MUDANÇA (Elenco/Gênero): Função removida (estava incorreta)
// ==========================================================
// export async function fetchGridDataByActor(actorId) { ... }


// ==========================================================
// MUDANÇA (Elenco/Gênero): Nova função (correta) para buscar créditos
// ==========================================================
/**
 * Busca os créditos de filmes e TV de um ator.
 * @param {string|number} actorId - O ID do ator.
 * @returns {Promise<object|null>} Um objeto com { movieCredits, tvCredits }.
 */
export async function fetchActorCredits(actorId) {
    try {
        const [movieData, tvData] = await Promise.all([
            fetchTMDB(`/person/${actorId}/movie_credits`),
            fetchTMDB(`/person/${actorId}/tv_credits`)
        ]);
        return { movieCredits: movieData, tvCredits: tvData };
    } catch (error) {
        console.error(`Erro ao buscar créditos do ator ${actorId}:`, error);
        return null;
    }
}


// ==========================================================
// MUDANÇA (Notificações): Nova função para buscar detalhes da série
// ==========================================================
/**
 * Busca detalhes completos de uma série (para o 'last_episode_to_air').
 * @param {string|number} seriesId - O ID da série.
 * @returns {Promise<object|null>} O objeto de detalhes da série.
 */
export async function fetchSeriesDetails(seriesId) {
    const endpoint = `/tv/${seriesId}`;
    try {
        // Não precisamos de 'append_to_response', 
        // pois 'last_episode_to_air' já vem na busca principal.
        return await fetchTMDB(endpoint);
    } catch (error) {
        console.error(`Erro ao buscar detalhes da série ${seriesId}:`, error);
        return null;
    }
}