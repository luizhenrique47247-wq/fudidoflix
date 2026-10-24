import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const DATA_COLLECTION = 'fudidoflix_data';

// Chaves do localStorage
const WATCHED_HISTORY_KEY = 'fudidoFlixWatchedHistory'; 
const MAX_HISTORY_ITEMS = 20; 
const MY_LIST_KEY = 'fudidoFlixMyList';
const WATCHED_EPISODES_KEY = 'fudidoFlixWatchedEpisodes';
const CONTINUE_WATCHING_KEY = 'fudidoFlixContinueWatching'; 
const INBOX_KEY = 'fudidoFlixInbox';
const LAST_CHECK_KEY = 'fudidoFlixLastCheck';
const PROFILES_KEY = 'fudidoFlixProfiles';
const ACTIVE_PROFILE_KEY = 'fudidoFlixActiveProfileId';

// ========================================================================
//  SINCRONIZAÇÃO EM TEMPO REAL COM O FIRESTORE
// ========================================================================

export async function syncToFirestore(key, items) {
  try {
    await setDoc(doc(db, DATA_COLLECTION, key), {
      items: items,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    window.dispatchEvent(new CustomEvent('fudidoFlixStorageUpdated', { detail: { key } }));
  } catch (err) {
    console.warn(`[Firestore Sync] Não foi possível salvar em ${key}:`, err);
  }
}

export async function deleteFromFirestore(key) {
  try {
    await deleteDoc(doc(db, DATA_COLLECTION, key));
    window.dispatchEvent(new CustomEvent('fudidoFlixStorageUpdated', { detail: { key } }));
  } catch (err) {
    console.warn(`[Firestore Delete] Não foi possível deletar ${key}:`, err);
  }
}

let firestoreSyncInitialized = false;

export function initFirestoreSync() {
  if (firestoreSyncInitialized) return;
  firestoreSyncInitialized = true;

  const syncedKeys = new Set();
  const listenToKey = (key) => {
    if (!key || syncedKeys.has(key)) return;
    syncedKeys.add(key);

    try {
      onSnapshot(doc(db, DATA_COLLECTION, key), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.items) {
            localStorage.setItem(key, JSON.stringify(data.items));
            window.dispatchEvent(new CustomEvent('fudidoFlixStorageUpdated', { detail: { key } }));

            if (key === PROFILES_KEY && Array.isArray(data.items)) {
              data.items.forEach(profile => {
                listenToKey(`${MY_LIST_KEY}_${profile.id}`);
                listenToKey(`${WATCHED_HISTORY_KEY}_${profile.id}`);
                listenToKey(`${CONTINUE_WATCHING_KEY}_${profile.id}`);
                listenToKey(`${WATCHED_EPISODES_KEY}_${profile.id}`);
              });
            }
          }
        }
      }, (err) => {
        console.warn(`[Firestore Listener] ${key}:`, err);
      });
    } catch (err) {
      console.warn(`Erro ao iniciar listener Firestore para ${key}:`, err);
    }
  };

  // Escuta os perfis e recomendações
  [PROFILES_KEY, 'fudidoFlixLoveRecommendations'].forEach(listenToKey);

  getProfiles().forEach(profile => {
    listenToKey(`${MY_LIST_KEY}_${profile.id}`);
    listenToKey(`${WATCHED_HISTORY_KEY}_${profile.id}`);
    listenToKey(`${CONTINUE_WATCHING_KEY}_${profile.id}`);
    listenToKey(`${WATCHED_EPISODES_KEY}_${profile.id}`);
  });
}

// ========================================================================
//  GERENCIAMENTO DE PERFIS
// ========================================================================

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
        const selectedAvatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`;
        const newProfile = { id, name: name.trim(), avatar: selectedAvatar };
        profiles.push(newProfile);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        syncToFirestore(PROFILES_KEY, profiles);
        return newProfile;
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        return null;
    }
}

export function updateProfile(id, name, avatar) {
    try {
        let profiles = getProfiles();
        profiles = profiles.map(p => {
            if (p.id === id) {
                return { ...p, name: name.trim(), avatar: avatar || p.avatar };
            }
            return p;
        });
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        syncToFirestore(PROFILES_KEY, profiles);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
    }
}

export function deleteProfile(id) {
    try {
        let profiles = getProfiles();
        profiles = profiles.filter(p => p.id !== id);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        syncToFirestore(PROFILES_KEY, profiles);
        
        // Limpeza dos dados do perfil local e no Firestore
        localStorage.removeItem(`${WATCHED_HISTORY_KEY}_${id}`);
        localStorage.removeItem(`${MY_LIST_KEY}_${id}`);
        localStorage.removeItem(`${WATCHED_EPISODES_KEY}_${id}`);
        localStorage.removeItem(`${CONTINUE_WATCHING_KEY}_${id}`);
        localStorage.removeItem(`${INBOX_KEY}_${id}`);
        localStorage.removeItem(`${LAST_CHECK_KEY}_${id}`);
        deleteFromFirestore(`${WATCHED_HISTORY_KEY}_${id}`);
        deleteFromFirestore(`${MY_LIST_KEY}_${id}`);
        deleteFromFirestore(`${WATCHED_EPISODES_KEY}_${id}`);
        deleteFromFirestore(`${CONTINUE_WATCHING_KEY}_${id}`);
        
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
        let history = getWatchedHistory(); 
        history = history.filter(item => !(item.id === itemPayload.id && item.type === itemPayload.type));
        history.unshift(itemPayload);
        history = history.slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(getScopedKey(WATCHED_HISTORY_KEY), JSON.stringify(history));
        syncToFirestore(getScopedKey(WATCHED_HISTORY_KEY), history);

        let continueWatching = getContinueWatchingList();
        continueWatching = continueWatching.filter(item => !(item.id === itemPayload.id && item.type === itemPayload.type));
        continueWatching.unshift(itemPayload);
        localStorage.setItem(getScopedKey(CONTINUE_WATCHING_KEY), JSON.stringify(continueWatching));
        syncToFirestore(getScopedKey(CONTINUE_WATCHING_KEY), continueWatching);
    } catch (error) {
        console.error("Erro ao salvar histórico:", error);
    }
}

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
        let list = getContinueWatchingList();
        list = list.filter(item => Number(item.id) !== numId);
        localStorage.setItem(getScopedKey(CONTINUE_WATCHING_KEY), JSON.stringify(list));
        syncToFirestore(getScopedKey(CONTINUE_WATCHING_KEY), list);
    } catch (error) {
        console.error(`Erro ao remover item ${id} da lista "Continuar Assistindo":`, error);
    }
}

// ========================================================================
//  MINHA LISTA
// ========================================================================

export function getMyList() {
    try {
        const myListJson = localStorage.getItem(getScopedKey(MY_LIST_KEY));
        return myListJson ? JSON.parse(myListJson) : [];
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
            syncToFirestore(getScopedKey(MY_LIST_KEY), list);
        }
    } catch (error) {
        console.error("Erro ao salvar em Minha Lista:", error);
    }
}

export function removeFromMyList(id, type) {
    try {
        let list = getMyList();
        list = list.filter(item => !(Number(item.id) === Number(id) && item.type === type));
        localStorage.setItem(getScopedKey(MY_LIST_KEY), JSON.stringify(list));
        syncToFirestore(getScopedKey(MY_LIST_KEY), list);
    } catch (error) {
        console.error("Erro ao remover de Minha Lista:", error);
    }
}

export function clearMyList() {
    try {
        localStorage.removeItem(getScopedKey(MY_LIST_KEY));
        syncToFirestore(getScopedKey(MY_LIST_KEY), []);
    } catch (error) {
        console.error("Erro ao limpar Minha Lista:", error);
    }
}

// ========================================================================
//  EPISÓDIOS ASSISTIDOS
// ========================================================================

export function getWatchedEpisodes() {
    try {
        const episodesJson = localStorage.getItem(getScopedKey(WATCHED_EPISODES_KEY));
        return episodesJson ? JSON.parse(episodesJson) : [];
    } catch (error) {
        console.error("Erro ao ler histórico de episódios:", error);
        return [];
    }
}

export function saveWatchedEpisode(itemData) {
    if (!itemData || !itemData.id || !itemData.type) {
        console.warn("[saveWatchedEpisode] Dados incompletos para salvar:", itemData);
        return;
    }

    try {
        let episodes = getWatchedEpisodes();
        const seriesId = Number(itemData.id);
        const seasonNum = Number(itemData.season);
        const episodeNum = Number(itemData.episode);

        const existingIndex = episodes.findIndex(
            ep => Number(ep.id) === seriesId && Number(ep.season) === seasonNum && Number(ep.episode) === episodeNum
        );

        const episodePayload = {
            id: seriesId,
            type: itemData.type,
            season: seasonNum,
            episode: episodeNum,
            watchedAt: new Date().toISOString()
        };

        if (existingIndex > -1) {
            episodes[existingIndex] = episodePayload;
        } else {
            episodes.unshift(episodePayload);
        }

        localStorage.setItem(getScopedKey(WATCHED_EPISODES_KEY), JSON.stringify(episodes));
        syncToFirestore(getScopedKey(WATCHED_EPISODES_KEY), episodes);
    } catch (error) {
        console.error("Erro ao salvar episódio assistido:", error);
    }
}

export function isEpisodeWatched(id, type, season, episode) {
    const episodes = getWatchedEpisodes();
    return episodes.some(
        ep => Number(ep.id) === Number(id) && Number(ep.season) === Number(season) && Number(ep.episode) === Number(episode)
    );
}

export function clearAllHistory() {
    try {
        localStorage.removeItem(getScopedKey(WATCHED_HISTORY_KEY));
        localStorage.removeItem(getScopedKey(CONTINUE_WATCHING_KEY));
        localStorage.removeItem(getScopedKey(WATCHED_EPISODES_KEY));
        syncToFirestore(getScopedKey(WATCHED_HISTORY_KEY), []);
        syncToFirestore(getScopedKey(CONTINUE_WATCHING_KEY), []);
        syncToFirestore(getScopedKey(WATCHED_EPISODES_KEY), []);
    } catch (error) {
        console.error("Erro ao limpar histórico:", error);
    }
}

// ========================================================================
//  NOTIFICAÇÕES & INBOX
// ========================================================================

export function getInbox() {
    try {
        const inboxJson = localStorage.getItem(getScopedKey(INBOX_KEY));
        return inboxJson ? JSON.parse(inboxJson) : [];
    } catch (error) {
        console.error("Erro ao ler caixa de entrada:", error);
        return [];
    }
}

export function saveToInbox(notificationItem) {
    if (!notificationItem) return;
    try {
        let inbox = getInbox();
        if (notificationItem.uniqueId) {
            inbox = inbox.filter(item => item.uniqueId !== notificationItem.uniqueId);
        }
        inbox.unshift(notificationItem);
        inbox = inbox.slice(0, 30);
        localStorage.setItem(getScopedKey(INBOX_KEY), JSON.stringify(inbox));
    } catch (error) {
        console.error("Erro ao salvar na caixa de entrada:", error);
    }
}

export function removeFromInbox(uniqueId) {
    try {
        let inbox = getInbox();
        inbox = inbox.filter(item => item.uniqueId !== uniqueId);
        localStorage.setItem(getScopedKey(INBOX_KEY), JSON.stringify(inbox));
    } catch (error) {
        console.error("Erro ao remover item da caixa de entrada:", error);
    }
}

export function clearInbox() {
    try {
        localStorage.removeItem(getScopedKey(INBOX_KEY));
    } catch (error) {
        console.error("Erro ao limpar caixa de entrada:", error);
    }
}

export function getLastCheck() {
    try {
        return localStorage.getItem(getScopedKey(LAST_CHECK_KEY));
    } catch (error) {
        return null;
    }
}

export function setLastCheck() {
    try {
        localStorage.setItem(getScopedKey(LAST_CHECK_KEY), new Date().toISOString());
    } catch (error) {
        console.error("Erro ao definir data do último check:", error);
    }
}

// ========================================================================
//  INDICAÇÕES DO AMOR (CINE AMOR)
// ========================================================================

export function getLoveRecommendations() {
    try {
        const listJson = localStorage.getItem('fudidoFlixLoveRecommendations');
        return listJson ? JSON.parse(listJson) : [];
    } catch (error) {
        console.error("Erro ao ler Indicações do Amor:", error);
        return [];
    }
}

export function saveLoveRecommendation(item, message = '', senderName = 'Meu amor', targetProfileName = 'Todos') {
    if (!item || !item.id) return null;
    try {
        let list = getLoveRecommendations();
        const newRec = {
            uniqueId: 'love_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            id: item.id,
            type: item.type || item.media_type || 'movie',
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            message: message.trim(),
            senderName: senderName.trim(),
            targetProfileName: targetProfileName.trim(),
            createdAt: new Date().toISOString()
        };
        list.unshift(newRec);
        localStorage.setItem('fudidoFlixLoveRecommendations', JSON.stringify(list));
        syncToFirestore('fudidoFlixLoveRecommendations', list);
        return newRec;
    } catch (error) {
        console.error("Erro ao salvar Indicação do Amor:", error);
        return null;
    }
}

export function deleteLoveRecommendation(id) {
    try {
        let list = getLoveRecommendations();
        list = list.filter(item => item.uniqueId !== id);
        localStorage.setItem('fudidoFlixLoveRecommendations', JSON.stringify(list));
        syncToFirestore('fudidoFlixLoveRecommendations', list);
    } catch (error) {
        console.error("Erro ao deletar Indicação do Amor:", error);
    }
}
