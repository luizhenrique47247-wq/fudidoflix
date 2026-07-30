// Chaves do localStorage
const WATCHED_HISTORY_KEY = 'fudidoFlixWatchedHistory'; 
const MAX_HISTORY_ITEMS = 20; 
const MY_LIST_KEY = 'fudidoFlixMyList';
const WATCHED_EPISODES_KEY = 'fudidoFlixWatchedEpisodes';
const CONTINUE_WATCHING_KEY = 'fudidoFlixContinueWatching'; 
const INBOX_KEY = 'fudidoFlixInbox';
const LAST_CHECK_KEY = 'fudidoFlixLastCheck';

// ========================================================================
//  GERENCIAMENTO DE PERFIS
// ========================================================================

const PROFILES_KEY = 'fudidoFlixProfiles';
const ACTIVE_PROFILE_KEY = 'fudidoFlixActiveProfileId';

export function getProfiles() {
    try {
        const profilesJson = localStorage.getItem(PROFILES_KEY);
        if (!profilesJson) {
            const defaultProfiles = [];
            localStorage.setItem(PROFILES_KEY, JSON.stringify(defaultProfiles));
            return defaultProfiles;
        }
        return JSON.parse(profilesJson);
    } catch (error) {
        console.error("Erro ao ler perfis:", error);
        return [];
    }
}

export function saveProfile(name, avatar = '') {
    if (!name || !name.trim()) return null;
    try {
        const profiles = getProfiles();
        const id = 'profile_' + Date.now();
        // Generate a fun SVG avatar using Dicebear adventurers based on seed if no avatar is passed
        const selectedAvatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`;
        const newProfile = { id, name: name.trim(), avatar: selectedAvatar };
        profiles.push(newProfile);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        return newProfile;
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        return null;
    }
}

export function deleteProfile(id) {
    try {
        let profiles = getProfiles();
        profiles = profiles.filter(p => p.id !== id);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        
        // Clean up profile specific data
        localStorage.removeItem(`${WATCHED_HISTORY_KEY}_${id}`);
        localStorage.removeItem(`${MY_LIST_KEY}_${id}`);
        localStorage.removeItem(`${WATCHED_EPISODES_KEY}_${id}`);
        localStorage.removeItem(`${CONTINUE_WATCHING_KEY}_${id}`);
        localStorage.removeItem(`${INBOX_KEY}_${id}`);
        localStorage.removeItem(`${LAST_CHECK_KEY}_${id}`);
        
        if (getActiveProfileId() === id) {
            clearActiveProfileId();
        }
    } catch (error) {
        console.error("Erro ao deletar perfil:", error);
    }
}

export function getActiveProfileId() {
    try {
        return sessionStorage.getItem(ACTIVE_PROFILE_KEY) || '';
    } catch (error) {
        return '';
    }
}

export function getActiveProfile() {
    const activeId = getActiveProfileId();
    if (!activeId) return null;
    const profiles = getProfiles();
    return profiles.find(p => p.id === activeId) || null;
}

export function setActiveProfileId(id) {
    try {
        sessionStorage.setItem(ACTIVE_PROFILE_KEY, id);
    } catch (error) {
        console.error("Erro ao definir perfil ativo:", error);
    }
}

export function clearActiveProfileId() {
    try {
        sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
    } catch (error) {
        console.error("Erro ao limpar perfil ativo:", error);
    }
}

// Scoped key helper based on active profile
const getScopedKey = (baseKey) => {
    const profileId = getActiveProfileId();
    if (!profileId) return baseKey;
    return `${baseKey}_${profileId}`;
};

// ========================================================================
//  HISTÓRICO (Para o carrossel "Últimos Assistidos")
// ========================================================================

export function getWatchedHistory() {
    try {
        const historyJson = localStorage.getItem(getScopedKey(WATCHED_HISTORY_KEY));
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error("Erro ao ler histórico do localStorage:", error);
        return [];
    }
}

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
        media_type: itemData.type 
    };

    try {
        // Salva no Histórico Principal (Home Carrossel)
        let history = getWatchedHistory(); 
        history = history.filter(item => !(item.id === itemPayload.id && item.type === itemPayload.type));
        history.unshift(itemPayload);
        history = history.slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(getScopedKey(WATCHED_HISTORY_KEY), JSON.stringify(history));

        // Salva na Lista "Continuar Assistindo" (Minha Lista Page)
        let continueList = getContinueWatchingList();
        continueList = continueList.filter(item => !(item.id === itemPayload.id && item.type === itemPayload.type));
        continueList.unshift(itemPayload);
        localStorage.setItem(getScopedKey(CONTINUE_WATCHING_KEY), JSON.stringify(continueList));
    } catch (error) {
        console.error("Erro ao salvar histórico no localStorage:", error);
    }
}

// ==========================================================
// "Continuar Assistindo"
// ==========================================================

export function getContinueWatchingList() {
    try {
        const listJson = localStorage.getItem(getScopedKey(CONTINUE_WATCHING_KEY));
        return listJson ? JSON.parse(listJson) : [];
    } catch (error) {
        console.error("Erro ao ler Lista 'Continuar Assistindo':", error);
        return [];
    }
}

export function removeFromContinueWatching(id) {
    const numId = Number(id);
    if (!numId) return;

    try {
        let continueList = getContinueWatchingList();
        continueList = continueList.filter(item => Number(item.id) !== numId);
        localStorage.setItem(getScopedKey(CONTINUE_WATCHING_KEY), JSON.stringify(continueList));
    } catch (error) {
        console.error(`Erro ao remover item ${id} da lista "Continuar Assistindo":`, error);
    }
}

// ========================================================================
//  MINHA LISTA
// ========================================================================

export function getMyList() {
    try {
        const listJson = localStorage.getItem(getScopedKey(MY_LIST_KEY));
        return listJson ? JSON.parse(listJson) : [];
    } catch (error) {
        console.error("Erro ao ler Minha Lista do localStorage:", error);
        return [];
    }
}

export function isItemInMyList(id, type) {
    const list = getMyList(); 
    return list.some(item => Number(item.id) === Number(id) && item.type === type);
}

export function saveToMyList(itemData) {
    if (!itemData || !itemData.id || !itemData.type) {
        console.warn("[saveToMyList] Dados incompletos para salvar:", itemData);
        return;
    }
    try {
        let list = getMyList(); 
        if (!isItemInMyList(itemData.id, itemData.type)) { 
            list.unshift(itemData); 
            localStorage.setItem(getScopedKey(MY_LIST_KEY), JSON.stringify(list));
        }
    } catch (error) {
        console.error("Erro ao salvar em Minha Lista no localStorage:", error);
    }
}

export function removeFromMyList(id, type) {
    try {
        let list = getMyList(); 
        list = list.filter(item => !(Number(item.id) === Number(id) && item.type === type));
        localStorage.setItem(getScopedKey(MY_LIST_KEY), JSON.stringify(list));
    } catch (error) {
        console.error("Erro ao remover de Minha Lista no localStorage:", error);
    }
}

export function clearMyList() {
    try {
        localStorage.removeItem(getScopedKey(MY_LIST_KEY));
    } catch (error) {
        console.error("Erro ao limpar Minha Lista:", error);
    }
}

// ==========================================================
//  HISTÓRICO DETALHADO (EPISÓDIOS / FILMES)
// ==========================================================

export function getWatchedEpisodes() {
    try {
        const episodesJson = localStorage.getItem(getScopedKey(WATCHED_EPISODES_KEY));
        return episodesJson ? JSON.parse(episodesJson) : [];
    } catch (error) {
        console.error("Erro ao ler histórico de episódios do localStorage:", error);
        return [];
    }
}

export function saveWatchedEpisode(itemData) {
    if (!itemData || !itemData.id || !itemData.type) {
        console.warn("[saveWatchedEpisode] Dados incompletos para salvar:", itemData);
        return;
    }

    try {
        let episodeHistory = getWatchedEpisodes();
        
        const numId = Number(itemData.id);
        const itemIdentifier = `${itemData.type}-${numId}`;
        const episodeIdentifier = (itemData.type === 'tv') ? `${itemIdentifier}-S${Number(itemData.season)}-E${Number(itemData.episode)}` : itemIdentifier;

        episodeHistory = episodeHistory.filter(item => {
             const existingIdentifier = `${item.type}-${Number(item.id)}`;
             const existingEpisodeIdentifier = (item.type === 'tv') ? `${existingIdentifier}-S${Number(item.season)}-E${Number(item.episode)}` : existingIdentifier;
             return existingEpisodeIdentifier !== episodeIdentifier;
        });

        episodeHistory.unshift({
            id: numId, 
            type: itemData.type,
            season: itemData.season ? Number(itemData.season) : null, 
            episode: itemData.episode ? Number(itemData.episode) : null, 
            watchedAt: new Date().toISOString()
        });
        
        localStorage.setItem(getScopedKey(WATCHED_EPISODES_KEY), JSON.stringify(episodeHistory));
    } catch (error) {
        console.error("Erro ao salvar histórico de episódio no localStorage:", error);
    }
}

export function isEpisodeWatched(id, type, season, episode) {
    const episodeHistory = getWatchedEpisodes();
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

export function clearAllHistory() {
     try {
        localStorage.removeItem(getScopedKey(WATCHED_HISTORY_KEY));
        localStorage.removeItem(getScopedKey(WATCHED_EPISODES_KEY));
        localStorage.removeItem(getScopedKey(CONTINUE_WATCHING_KEY));
    } catch (error) {
        console.error("Erro ao limpar histórico:", error);
    }
}

// ==========================================================
//  INBOX (Notificações)
// ==========================================================

export function getInbox() {
    try {
        const inboxJson = localStorage.getItem(getScopedKey(INBOX_KEY));
        return inboxJson ? JSON.parse(inboxJson) : [];
    } catch (error) {
        console.error("Erro ao ler Inbox do localStorage:", error);
        return [];
    }
}

export function saveToInbox(notificationItem) {
    if (!notificationItem || !notificationItem.uniqueId) {
        console.warn("[saveToInbox] Item de notificação inválido:", notificationItem);
        return;
    }
    try {
        let inbox = getInbox();
        if (!inbox.some(item => item.uniqueId === notificationItem.uniqueId)) {
            inbox.unshift(notificationItem); 
            localStorage.setItem(getScopedKey(INBOX_KEY), JSON.stringify(inbox));
        }
    } catch (error) {
        console.error("Erro ao salvar no Inbox no localStorage:", error);
    }
}

export function removeFromInbox(uniqueId) {
    try {
        let inbox = getInbox();
        inbox = inbox.filter(item => item.uniqueId !== uniqueId);
        localStorage.setItem(getScopedKey(INBOX_KEY), JSON.stringify(inbox));
    } catch (error) {
        console.error("Erro ao remover do Inbox no localStorage:", error);
    }
}

export function clearInbox() {
    try {
        localStorage.removeItem(getScopedKey(INBOX_KEY));
    } catch (error) {
        console.error("Erro ao limpar Inbox:", error);
    }
}

export function getLastCheck() {
    try {
        return localStorage.getItem(getScopedKey(LAST_CHECK_KEY));
    } catch (error) {
        console.error("Erro ao ler data da última verificação:", error);
        return null;
    }
}

export function setLastCheck() {
    try {
        localStorage.setItem(getScopedKey(LAST_CHECK_KEY), new Date().toISOString());
    } catch (error) {
        console.error("Erro ao salvar data da última verificação:", error);
    }
}

// ==========================================================
//  INDICAÇÕES DO AMOR (Love Recommendations)
// ==========================================================
const LOVE_RECS_KEY = 'fudidoFlixLoveRecommendations';

export function getLoveRecommendations() {
    try {
        const json = localStorage.getItem(LOVE_RECS_KEY);
        return json ? JSON.parse(json) : [];
    } catch (error) {
        console.error("Erro ao ler Indicações do Amor:", error);
        return [];
    }
}

export function saveLoveRecommendation(item, message = '', senderName = 'Meu amor', targetProfileName = 'Todos') {
    try {
        const current = getLoveRecommendations();
        const newRec = {
            id: 'love_' + Date.now(),
            item: {
                id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                release_date: item.release_date || item.first_air_date,
                media_type: item.media_type || (item.title ? 'movie' : 'tv'),
                overview: item.overview
            },
            message: message || '❤️ Essa indicação é especial para você!',
            senderName,
            targetProfileName,
            createdAt: new Date().toLocaleDateString('pt-BR')
        };
        current.unshift(newRec);
        localStorage.setItem(LOVE_RECS_KEY, JSON.stringify(current));
        return newRec;
    } catch (error) {
        console.error("Erro ao salvar Indicação do Amor:", error);
        return null;
    }
}

export function deleteLoveRecommendation(id) {
    try {
        let current = getLoveRecommendations();
        current = current.filter(r => r.id !== id);
        localStorage.setItem(LOVE_RECS_KEY, JSON.stringify(current));
        return current;
    } catch (error) {
        console.error("Erro ao excluir Indicação do Amor:", error);
        return [];
    }
}

