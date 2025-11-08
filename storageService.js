// ARQUIVO: storageService.js

/**
 * Módulo de serviço para gerenciar o localStorage (Histórico, Minha Lista e Inbox).
 */

// Chaves do localStorage
const WATCHED_HISTORY_KEY = 'fudidoFlixWatchedHistory'; // Para "Últimos Assistidos" (Home)
const MAX_HISTORY_ITEMS = 20; // Limite de itens no histórico
const MY_LIST_KEY = 'fudidoFlixMyList';
const WATCHED_EPISODES_KEY = 'fudidoFlixWatchedEpisodes';

// ==========================================================
// MUDANÇA (Req 1/3): Nova chave para a lista "Continuar Assistindo"
// ==========================================================
const CONTINUE_WATCHING_KEY = 'fudidoFlixContinueWatching'; // Para a grade (Minha Lista)

// ==========================================================
// MUDANÇA (Notificações): Novas chaves para o Inbox
// ==========================================================
const INBOX_KEY = 'fudidoFlixInbox';
const LAST_CHECK_KEY = 'fudidoFlixLastCheck';


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

    const itemPayload = {
        id: itemData.id,
        type: itemData.type,
        title: itemData.title || itemData.name,
        poster_path: itemData.poster_path,
        media_type: itemData.type // Garante consistência
    };

    try {
        // 1. Salva no Histórico Principal (Home Carrossel)
        let history = getWatchedHistory(); 
        history = history.filter(item => !(item.id === itemPayload.id && item.type === itemPayload.type));
        history.unshift(itemPayload);
        history = history.slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(WATCHED_HISTORY_KEY, JSON.stringify(history));

        // 2. Salva na Lista "Continuar Assistindo" (Minha Lista Page)
        let continueList = getContinueWatchingList();
        continueList = continueList.filter(item => !(item.id === itemPayload.id && item.type === itemPayload.type));
        continueList.unshift(itemPayload);
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(continueList));

    } catch (error)
    {
        console.error("Erro ao salvar histórico no localStorage:", error);
    }
}


// ==========================================================
// MUDANÇA (Req 1/3): Novas funções para "Continuar Assistindo"
// ==========================================================

/**
 * Busca a lista "Continuar Assistindo" do localStorage.
 * @returns {Array} Um array de itens da lista.
 */
export function getContinueWatchingList() {
    try {
        const listJson = localStorage.getItem(CONTINUE_WATCHING_KEY);
        return listJson ? JSON.parse(listJson) : [];
    } catch (error) {
        console.error("Erro ao ler Lista 'Continuar Assistindo':", error);
        return [];
    }
}

/**
 * Remove um item SOMENTE da lista "Continuar Assistindo".
 * @param {string|number} id - ID do item (filme ou série).
 */
export function removeFromContinueWatching(id) {
    const numId = Number(id);
    if (!numId) return;

    try {
        let continueList = getContinueWatchingList();
        continueList = continueList.filter(item => Number(item.id) !== numId);
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(continueList));
        
        console.log(`Item ${numId} removido da lista "Continuar Assistindo".`);

    } catch (error) {
        console.error(`Erro ao remover item ${id} da lista "Continuar Assistindo":`, error);
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
//  HISTÓRICO DETALHADO (EPISÓDIOS)
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
//  LIMPEZA GERAL
// ==========================================================

/**
 * Limpa TODO o histórico de visualização (carousel e detalhado).
 */
export function clearAllHistory() {
     try {
        localStorage.removeItem(WATCHED_HISTORY_KEY);
        localStorage.removeItem(WATCHED_EPISODES_KEY);
        // MUDANÇA (Req 1/3): Limpa a nova lista também
        localStorage.removeItem(CONTINUE_WATCHING_KEY);
        console.log("Todo o histórico foi limpo.");
    } catch (error) {
        console.error("Erro ao limpar histórico:", error);
    }
}


// ==========================================================
// MUDANÇA (Notificações): Novas funções do Inbox
// ==========================================================

/**
 * Busca a lista de notificações (Inbox) do localStorage.
 * @returns {Array} Um array de itens do inbox.
 */
export function getInbox() {
    try {
        const inboxJson = localStorage.getItem(INBOX_KEY);
        return inboxJson ? JSON.parse(inboxJson) : [];
    } catch (error) {
        console.error("Erro ao ler Inbox do localStorage:", error);
        return [];
    }
}

/**
 * Salva um novo item de notificação no Inbox.
 * @param {object} notificationItem - O objeto da notificação.
 */
export function saveToInbox(notificationItem) {
    if (!notificationItem || !notificationItem.uniqueId) {
        console.warn("[saveToInbox] Item de notificação inválido:", notificationItem);
        return;
    }
    try {
        let inbox = getInbox();
        // Evita duplicatas exatas
        if (!inbox.some(item => item.uniqueId === notificationItem.uniqueId)) {
            inbox.unshift(notificationItem); // Adiciona no início
            localStorage.setItem(INBOX_KEY, JSON.stringify(inbox));
        }
    } catch (error) {
        console.error("Erro ao salvar no Inbox no localStorage:", error);
    }
}

/**
 * Remove um item específico do Inbox.
 * @param {string} uniqueId - O ID único da notificação (ex: "seriesId-S-E").
 */
export function removeFromInbox(uniqueId) {
    try {
        let inbox = getInbox();
        inbox = inbox.filter(item => item.uniqueId !== uniqueId);
        localStorage.setItem(INBOX_KEY, JSON.stringify(inbox));
    } catch (error) {
        console.error("Erro ao remover do Inbox no localStorage:", error);
    }
}

/**
 * Limpa TODOS os itens do Inbox.
 */
export function clearInbox() {
    try {
        localStorage.removeItem(INBOX_KEY);
        console.log("Inbox limpo.");
    } catch (error) {
        console.error("Erro ao limpar Inbox:", error);
    }
}

/**
 * Busca a data da última verificação de notificação.
 * @returns {string|null} A data em formato ISO string, ou null.
 */
export function getLastCheck() {
    try {
        return localStorage.getItem(LAST_CHECK_KEY);
    } catch (error) {
        console.error("Erro ao ler data da última verificação:", error);
        return null;
    }
}

/**
 * Define a data da última verificação de notificação para "agora".
 */
export function setLastCheck() {
    try {
        localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    } catch (error) {
        console.error("Erro ao salvar data da última verificação:", error);
    }
}