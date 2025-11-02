// ARQUIVO: storageService.js

/**
 * Módulo de serviço para gerenciar o localStorage (Histórico e Minha Lista).
 */

// Chaves do localStorage
const WATCHED_HISTORY_KEY = 'fudidoFlixWatchedHistory';
const MAX_HISTORY_ITEMS = 20; // Limite de itens no histórico
const MY_LIST_KEY = 'fudidoFlixMyList';

// ========================================================================
//  HISTÓRICO
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