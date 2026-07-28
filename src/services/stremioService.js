import { fetchTMDB } from './api';
import * as Storage from './storageService';

// Fetch helper with timeout to avoid browser network hangs on dead domains
export async function fetchWithTimeout(url, options = {}, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Default list of addons (Torrentio works natively and parses global sources)
export const DEFAULT_ADDONS = [
  {
    name: 'Torrentio',
    manifestUrl: 'https://torrentio.strem.fun/manifest.json',
    type: 'stream',
    enabled: true
  }
];

// LocalStorage key configurations based on active profile
const getInstalledAddonsKey = () => `fudidoFlixInstalledAddons_${Storage.getActiveProfileId()}`;
const getRealDebridTokenKey = () => `fudidoFlixRealDebridToken_${Storage.getActiveProfileId()}`;

export function getInstalledAddons() {
  try {
    const data = localStorage.getItem(getInstalledAddonsKey());
    if (data) {
      const list = JSON.parse(data);
      // Quietly filter out dead addons like superflixapi.xyz from older installations
      const cleaned = list.filter(a => !a.manifestUrl.includes('superflixapi.xyz'));
      
      // If the cleaned list has no active addons, auto-inject defaults
      if (cleaned.length === 0) {
        localStorage.setItem(getInstalledAddonsKey(), JSON.stringify(DEFAULT_ADDONS));
        return DEFAULT_ADDONS;
      }

      if (cleaned.length !== list.length) {
        localStorage.setItem(getInstalledAddonsKey(), JSON.stringify(cleaned));
        return cleaned;
      }
      return list;
    }
    // Set default addons initially
    localStorage.setItem(getInstalledAddonsKey(), JSON.stringify(DEFAULT_ADDONS));
    return DEFAULT_ADDONS;
  } catch (e) {
    return DEFAULT_ADDONS;
  }
}

export function saveInstalledAddons(addons) {
  try {
    localStorage.setItem(getInstalledAddonsKey(), JSON.stringify(addons));
  } catch (e) {
    console.error("Erro ao salvar addons:", e);
  }
}

export function getRealDebridToken() {
  try {
    return localStorage.getItem(getRealDebridTokenKey()) || '';
  } catch (e) {
    return '';
  }
}

export function saveRealDebridToken(token) {
  try {
    localStorage.setItem(getRealDebridTokenKey(), token.trim());
  } catch (e) {
    console.error("Erro ao salvar token Real-Debrid:", e);
  }
}

// Convert TMDB ID to IMDb ID
export async function getImdbId(tmdbId, type) {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/external_ids` : `/tv/${tmdbId}/external_ids`;
  try {
    const data = await fetchTMDB(endpoint);
    return data ? data.imdb_id : null;
  } catch (e) {
    console.error(`Erro ao buscar IMDb ID para TMDB ${tmdbId}:`, e);
    return null;
  }
}

// Query single addon endpoint
export async function fetchStreamsFromAddon(addonUrl, type, imdbId, season = null, episode = null) {
  const baseStreamUrl = addonUrl.replace('/manifest.json', '/stream');
  let path = '';
  
  if (type === 'movie') {
    path = `/movie/${imdbId}.json`;
  } else {
    // Stremio series format tt123456:1:2 (IMDbId:Season:Episode)
    path = `/series/${imdbId}:${season}:${episode}.json`;
  }
  
  const queryUrl = `${baseStreamUrl}${path}`;
  try {
    const res = await fetchWithTimeout(queryUrl);
    if (!res.ok) return [];
    const data = await res.json();
    return data && data.streams ? data.streams : [];
  } catch (e) {
    console.warn(`Falha ao buscar streams do addon ${addonUrl}:`, e);
    return [];
  }
}

// Query all enabled addons in parallel
export async function getAllStreams(type, tmdbId, season = null, episode = null) {
  const imdbId = await getImdbId(tmdbId, type);
  if (!imdbId) {
    console.warn("Não foi possível obter o ID do IMDb para este título.");
    return [];
  }

  const addons = getInstalledAddons().filter(a => a.enabled);
  const streamPromises = addons.map(async (addon) => {
    try {
      const streams = await fetchStreamsFromAddon(addon.manifestUrl, type, imdbId, season, episode);
      return streams.map(s => ({
        ...s,
        addonName: addon.name
      }));
    } catch (e) {
      return [];
    }
  });

  const results = await Promise.all(streamPromises);
  // Flatten array results
  return results.flat();
}

// Real-Debrid API Client to resolve torrents into HTTP links
export async function resolveMagnetWithRealDebrid(magnetLink) {
  const token = getRealDebridToken();
  if (!token) {
    throw new Error("Chave API do Real-Debrid não configurada.");
  }

  try {
    // 1. Add magnet link to Real-Debrid account
    const addFormData = new URLSearchParams();
    addFormData.append('magnet', magnetLink);
    
    const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: addFormData
    });

    if (!addRes.ok) {
      throw new Error("Falha ao adicionar magnet link no Real-Debrid.");
    }
    const addData = await addRes.json();
    const torrentId = addData.id;

    // 2. Select all files in torrent for caching
    const selectFormData = new URLSearchParams();
    selectFormData.append('files', 'all');
    
    await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: selectFormData
    });

    // 3. Poll Real-Debrid status until downloaded (often instant for cached torrents)
    let infoData = null;
    for (let i = 0; i < 6; i++) {
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      infoData = await infoRes.json();
      if (infoData.status === 'downloaded' && infoData.links?.length > 0) {
        break;
      }
      // Wait 1 second before checking status again
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!infoData || infoData.status !== 'downloaded' || !infoData.links?.length) {
      throw new Error("O torrent não está cacheado ou demorou muito para baixar no Real-Debrid.");
    }

    // 4. Unrestrict download link to get direct streaming URL
    const unrestrictFormData = new URLSearchParams();
    unrestrictFormData.append('link', infoData.links[0]);
    
    const unRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: unrestrictFormData
    });

    if (!unRes.ok) {
      throw new Error("Falha ao obter link irrestrito do Real-Debrid.");
    }
    const unData = await unRes.json();
    return unData.download; // Direct streaming HTTP link
  } catch (e) {
    console.error("Erro na resolução do Real-Debrid:", e);
    throw e;
  }
}
