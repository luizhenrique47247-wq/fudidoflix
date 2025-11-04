// ARQUIVO: storageService.js

/**
 * Módulo de serviço para gerenciar o localStorage (Histórico e Minha Lista).
 */

// Chaves do localStorage
const WATCHED_HISTORY_KEY = 'fudidoFlixWatchedHistory';
const MAX_HISTORY_ITEMS = 20; // Limite de itens no histórico
const MY_LIST_KEY = 'fudidoFlixMyList';

// ==========================================================
// MUDANÇA (Estaca Zero): Chave para salvar episódios e filmes específicos
// ==========================================================
const WATCHED_EPISODES_KEY = 'fudidoFlixWatchedEpisodes';


// ========================================================================
//  HISTÓRICO (Para o carousel "Últimos Assistidos")
// ========================================================================

/**
 * Busca o histórico de itens assistidos do localStorage.
 * @returns {Array} Um array de itens do histórico.
 */
export function getWatchedHistory() {
    try {
        const historyJson = localStorage.getItem(WATCHED_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error("Erro ao ler histórico do localStorage:", error);
        return [];
    }
}

/**
 * Salva um item no histórico de assistidos.
 * @param {object} itemData - Dados do item (id, type, title, poster_path).
 */
export function saveToWatchedHistory(itemData) {
    if (!itemData || !itemData.id || !itemData.type || !itemData.poster_path || !(itemData.title || itemData.name)) {
        console.warn("[saveToWatchedHistory] Dados incompletos para salvar:", itemData);
        return;
    }

    try {
        let history = getWatchedHistory(); // Usa a função exportada
        history = history.filter(item => !(item.id === itemData.id && item.type === itemData.type));
        history.unshift({
            id: itemData.id,
            type: itemData.type,
            title: itemData.title || itemData.name,
            poster_path: itemData.poster_path,
            media_type: itemData.type // Garante consistência
        });
        history = history.slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(WATCHED_HISTORY_KEY, JSON.stringify(history));
    } catch (error)
    {
        console.error("Erro ao salvar histórico no localStorage:", error);
    }
}

// ========================================================================
//  MINHA LISTA
// ========================================================================

/**
 * Busca a "Minha Lista" do localStorage.
 * @returns {Array} Um array de itens da lista.
 */
export function getMyList() {
    try {
        const listJson = localStorage.getItem(MY_LIST_KEY);
        return listJson ? JSON.parse(listJson) : [];
    } catch (error) {
        console.error("Erro ao ler Minha Lista do localStorage:", error);
        return [];
    }
}

/**
 * Verifica se um item está na "Minha Lista".
 * @param {string|number} id - ID do item.
 * @param {string} type - Tipo do item ('movie' or 'tv').
 * @returns {boolean} True se o item estiver na lista.
 */
export function isItemInMyList(id, type) {
    const list = getMyList(); // Usa a função exportada
    return list.some(item => item.id === id && item.type === type);
}

/**
 * Salva um item na "Minha Lista".
 * @param {object} itemData - Dados completos do item.
 */
export function saveToMyList(itemData) {
    if (!itemData || !itemData.id || !itemData.type) {
        console.warn("[saveToMyList] Dados incompletos para salvar:", itemData);
        return;
    }
    try {
        let list = getMyList(); // Usa a função exportada
        // Evita duplicatas
        if (!isItemInMyList(itemData.id, itemData.type)) { // Usa a função exportada
            list.unshift(itemData); // Adiciona no início
            localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
        }
    } catch (error) {
        console.error("Erro ao salvar em Minha Lista no localStorage:", error);
    }
}

/**
 * Remove um item da "Minha Lista".
 * @param {string|number} id - ID do item.
 * @param {string} type - Tipo do item ('movie' or 'tv').
 */
export function removeFromMyList(id, type) {
    try {
        let list = getMyList(); // Usa a função exportada
        list = list.filter(item => !(item.id === id && item.type === type));
        localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
    } catch (error) {
        console.error("Erro ao remover de Minha Lista no localStorage:", error);
    }
}

/**
 * Limpa TODOS os itens da "Minha Lista".
 */
export function clearMyList() {
    try {
        localStorage.removeItem(MY_LIST_KEY);
        console.log("Minha Lista limpa.");
    } catch (error) {
        console.error("Erro ao limpar Minha Lista:", error);
    }
}


// ==========================================================
// MUDANÇA (Estaca Zero): Novas funções para histórico detalhado
// ==========================================================

/**
 * Busca o histórico de TODOS os episódios/filmes assistidos.
 * @returns {Array} Um array de objetos {id, type, season, episode, watchedAt}
 */
export function getWatchedEpisodes() {
    try {
        const episodesJson = localStorage.getItem(WATCHED_EPISODES_KEY);
        return episodesJson ? JSON.parse(episodesJson) : [];
    } catch (error) {
        console.error("Erro ao ler histórico de episódios do localStorage:", error);
        return [];
    }
}

/**
 * Salva um item específico (filme ou episódio de TV) no histórico detalhado.
 * @param {object} itemData - {id, type, season, episode}
 */
export function saveWatchedEpisode(itemData) {
    if (!itemData || !itemData.id || !itemData.type) {
        console.warn("[saveWatchedEpisode] Dados incompletos para salvar:", itemData);
        return;
    }

    try {
        let episodeHistory = getWatchedEpisodes();
        
        // Cria um ID único para o item (filme ou episódio)
        // Convertendo IDs para Número para garantir consistência
        const numId = Number(itemData.id);
        const itemIdentifier = `${itemData.type}-${numId}`;
        const episodeIdentifier = (itemData.type === 'tv') ? `${itemIdentifier}-S${Number(itemData.season)}-E${Number(itemData.episode)}` : itemIdentifier;

        // Remove duplicatas exatas para este episódio/filme
        episodeHistory = episodeHistory.filter(item => {
             const existingIdentifier = `${item.type}-${Number(item.id)}`;
             const existingEpisodeIdentifier = (item.type === 'tv') ? `${existingIdentifier}-S${Number(item.season)}-E${Number(item.episode)}` : existingIdentifier;
             return existingEpisodeIdentifier !== episodeIdentifier;
        });

        // Adiciona o novo item (com timestamp)
        episodeHistory.unshift({
            id: numId, // Salva como número
            type: itemData.type,
            season: itemData.season ? Number(itemData.season) : null, // Salva como número
            episode: itemData.episode ? Number(itemData.episode) : null, // Salva como número
            watchedAt: new Date().toISOString()
        });
        
        localStorage.setItem(WATCHED_EPISODES_KEY, JSON.stringify(episodeHistory));

    } catch (error) {
        console.error("Erro ao salvar histórico de episódio no localStorage:", error);
    }
}

/**
 * Verifica se um episódio ou filme específico foi assistido.
 * @param {string|number} id
 * @param {string} type - 'movie' or 'tv'
 * @param {number} season
 * @param {number} episode
 * @returns {boolean} True se o item estiver no histórico detalhado.
 */
export function isEpisodeWatched(id, type, season, episode) {
    const episodeHistory = getWatchedEpisodes();
    
    // Força a comparação de NÚMEROS para evitar bugs de "123" vs 123
    const numId = Number(id);

    if (type === 'movie') {
        return episodeHistory.some(item => Number(item.id) === numId && item.type === 'movie');
    } else if (type === 'tv') {
        const numSeason = Number(season);
        const numEpisode = Number(episode);
        return episodeHistory.some(item => 
            Number(item.id) === numId && 
            item.type === 'tv' && 
            Number(item.season) === numSeason && 
            Number(item.episode) === numEpisode
        );
    }
    
    return false;
}

// ==========================================================
// MUDANÇA (Perfil): Nova função para limpar histórico
// ==========================================================

/**
 * Limpa TODO o histórico de visualização (carousel e detalhado).
 */
export function clearAllHistory() {
     try {
        localStorage.removeItem(WATCHED_HISTORY_KEY);
        localStorage.removeItem(WATCHED_EPISODES_KEY);
        console.log("Todo o histórico foi limpo.");
    } catch (error) {
        console.error("Erro ao limpar histórico:", error);
    }
}