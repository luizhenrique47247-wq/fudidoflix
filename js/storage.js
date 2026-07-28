/**
 * Storage Manager for Favorites & Watch History
 */
const FAVS_KEY = 'megacine_clean_favorites';
const HISTORY_KEY = 'megacine_clean_history';

export const getFavorites = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVS_KEY)) || [];
  } catch (e) {
    return [];
  }
};

export const isFavorite = (id) => {
  const favs = getFavorites();
  return favs.some(item => item.id === id);
};

export const toggleFavorite = (item) => {
  let favs = getFavorites();
  const index = favs.findIndex(f => f.id === item.id);
  
  if (index > -1) {
    favs.splice(index, 1);
  } else {
    favs.unshift(item);
  }
  
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  return isFavorite(item.id);
};

export const clearFavorites = () => {
  localStorage.removeItem(FAVS_KEY);
};

export const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
};

export const addToHistory = (item) => {
  let history = getHistory();
  // Remove duplicate if exists
  history = history.filter(h => h.id !== item.id);
  // Add to top with timestamp
  history.unshift({
    ...item,
    watchedAt: new Date().toISOString()
  });
  // Limit to 50 items
  if (history.length > 50) history.pop();
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
