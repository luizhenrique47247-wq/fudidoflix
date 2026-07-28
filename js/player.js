/**
 * Multi-Mode Player Controller (Zero Ads, Zero Popups, AdBlock Safe)
 */
import { addToHistory, isFavorite, toggleFavorite } from './storage.js';

let currentMediaItem = null;
let currentServer = 'trailer'; // Default to guaranteed YouTube HD Trailer

const modal = document.getElementById('playerModal');
const modalTitle = document.getElementById('modalMediaTitle');
const modalTypeBadge = document.getElementById('modalTypeBadge');
const modalOverview = document.getElementById('modalOverview');
const modalFavBtn = document.getElementById('modalFavBtn');
const iframe = document.getElementById('mediaPlayerIframe');
const videoPlayer = document.getElementById('nativeVideoPlayer');
const loader = document.getElementById('playerLoader');
const closeBtn = document.getElementById('closePlayerBtn');
const serverTabs = document.getElementById('serverTabs');

// High Quality Open-Source Streams for Native HTML5 Demo Player Mode
const SAMPLE_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

export const initPlayer = () => {
  if (!modal) return;

  closeBtn.addEventListener('click', closePlayer);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePlayer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closePlayer();
    }
  });

  serverTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.server-tab');
    if (!tab) return;

    document.querySelectorAll('.server-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    currentServer = tab.dataset.server;
    loadStreamSource();
  });

  modalFavBtn.addEventListener('click', () => {
    if (!currentMediaItem) return;
    const favState = toggleFavorite(currentMediaItem);
    updateModalFavBtn(favState);
  });
};

export const openPlayer = (item, preferredServer = 'trailer') => {
  currentMediaItem = item;
  currentServer = preferredServer;

  // Record in History
  addToHistory(item);

  // Populate Title & Overview
  modalTitle.textContent = item.title;
  modalTypeBadge.textContent = item.media_type === 'tv' ? 'SÉRIE' : 'FILME';
  modalOverview.textContent = item.overview || 'Sinopse não disponível.';

  updateModalFavBtn(isFavorite(item.id));

  // Reset Server Tabs
  document.querySelectorAll('.server-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.server === currentServer);
  });

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  loadStreamSource();
};

export const closePlayer = () => {
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';

  // Stop both players cleanly
  iframe.src = 'about:blank';
  videoPlayer.pause();
  videoPlayer.src = '';
  videoPlayer.classList.add('hidden');
  iframe.classList.remove('hidden');
};

const loadStreamSource = () => {
  if (!currentMediaItem) return;

  loader.classList.remove('hidden');
  const type = currentMediaItem.media_type === 'tv' ? 'tv' : 'movie';
  const id = currentMediaItem.id;
  const imdbId = currentMediaItem.imdb_id || `tt${id}`;

  if (currentServer === 'native') {
    // ⚡ NATIVE HTML5 VIDEO PLAYER (100% Guaranteed playback, 0 adblock errors)
    iframe.classList.add('hidden');
    iframe.src = 'about:blank';
    
    // Pick sample stream deterministically based on ID
    const streamIndex = Math.abs(id) % SAMPLE_STREAMS.length;
    videoPlayer.src = SAMPLE_STREAMS[streamIndex];
    videoPlayer.classList.remove('hidden');
    videoPlayer.play().catch(() => {});
    
    loader.classList.add('hidden');
    return;
  }

  // IFRAME MODES (YouTube HD Trailer or Embed Mirrors)
  videoPlayer.pause();
  videoPlayer.src = '';
  videoPlayer.classList.add('hidden');
  iframe.classList.remove('hidden');

  let streamUrl = '';

  switch (currentServer) {
    case 'trailer':
      // YouTube Trailer HD (nocookie domain - adblocker safe, no 404s)
      const trailerKey = currentMediaItem.trailer_key || 'spJoZReeIeQ';
      streamUrl = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`;
      break;

    case 'server1':
      // ViewPlayer / Megacine Mirror
      streamUrl = `https://viewplayer.online/${type === 'tv' ? 'serie' : 'filme'}/${imdbId}`;
      break;

    case 'server2':
      // VidSrc Mirror
      streamUrl = `https://vidsrcme.ru/embed/${type}?imdb=${imdbId}`;
      break;

    default:
      streamUrl = `https://www.youtube-nocookie.com/embed/${currentMediaItem.trailer_key || 'spJoZReeIeQ'}?autoplay=1`;
  }

  iframe.src = streamUrl;

  iframe.onload = () => {
    loader.classList.add('hidden');
  };

  setTimeout(() => {
    loader.classList.add('hidden');
  }, 2000);
};

const updateModalFavBtn = (isFav) => {
  if (isFav) {
    modalFavBtn.classList.add('btn-primary');
    modalFavBtn.classList.remove('btn-outline');
    modalFavBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Na Minha Lista';
  } else {
    modalFavBtn.classList.remove('btn-primary');
    modalFavBtn.classList.add('btn-outline');
    modalFavBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Adicionar à Lista';
  }
};
