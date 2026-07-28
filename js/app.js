/**
 * Netflix Clone - Main Application Controller (Infinite Scroll & Netflix Modal)
 */
import { 
  fetchTrending, 
  fetchMovies, 
  fetchTVShows, 
  searchCatalog, 
  getImageUrl, 
  getBackdropUrl 
} from './api.js';

import { initPlayer, openPlayer } from './player.js';
import { getFavorites, getHistory, isFavorite, toggleFavorite } from './storage.js';

let allTrending = [];
let allMovies = [];
let allTVShows = [];
let loadedRowIndex = 0;
let isFetchingMoreRows = false;
let currentModalItem = null;

// Defined Netflix Row Categories
const ROW_CATEGORIES = [
  { id: 'trending', title: 'Em Alta Hoje', type: 'trending' },
  { id: 'popular-movies', title: 'Populares na Netflix', type: 'movies' },
  { id: 'top-series', title: 'Séries Mais Assistidas', type: 'tv' },
  { id: 'action', title: 'Filmes de Ação e Aventura', type: 'genre', genreId: 28 },
  { id: 'comedy', title: 'Comédias Imperdíveis', type: 'genre', genreId: 35 },
  { id: 'scifi', title: 'Ficção Científica e Fantasia', type: 'genre', genreId: 878 },
  { id: 'animation', title: 'Animações e Desenhos', type: 'genre', genreId: 16 },
  { id: 'history-row', title: 'Continuar Assistindo (Seu Histórico)', type: 'history' },
  { id: 'favs-row', title: 'Minha Lista', type: 'favorites' }
];

document.addEventListener('DOMContentLoaded', async () => {
  initPlayer();
  setupNetflixNavbar();
  setupNetflixSearch();
  setupNetflixModal();

  await loadInitialNetflixData();
  setupInfiniteScroll();
});

/* ==========================================
   INITIAL DATA & BILLBOARD
   ========================================== */
async function loadInitialNetflixData() {
  allTrending = await fetchTrending();
  allMovies = await fetchMovies();
  allTVShows = await fetchTVShows();

  if (allTrending.length > 0) {
    renderNetflixBillboard(allTrending[0]);
  }

  // Load initial 3 rows
  loadNextRows(3);
  updateFavBadge();
}

function renderNetflixBillboard(item) {
  const bg = document.getElementById('billboardBg');
  const title = document.getElementById('billboardTitle');
  const match = document.getElementById('billboardMatch');
  const age = document.getElementById('billboardAge');
  const year = document.getElementById('billboardYear');
  const synopsis = document.getElementById('billboardSynopsis');
  const playBtn = document.getElementById('billboardPlayBtn');
  const infoBtn = document.getElementById('billboardInfoBtn');

  bg.style.backgroundImage = `url('${getBackdropUrl(item.backdrop_path)}')`;
  title.textContent = item.title;
  match.textContent = `${Math.floor(item.vote_average * 10 || 88)}% relevante`;
  age.textContent = item.vote_average > 8 ? '16+' : '14+';
  year.textContent = (item.release_date || '2026').substring(0, 4);
  synopsis.textContent = item.overview;

  playBtn.onclick = () => openPlayer(item, 'trailer');
  infoBtn.onclick = () => openNetflixDetailModal(item);
}

/* ==========================================
   INFINITE SCROLLING & ROW LOADING
   ========================================== */
function loadNextRows(count = 2) {
  if (isFetchingMoreRows || loadedRowIndex >= ROW_CATEGORIES.length) return;
  isFetchingMoreRows = true;

  const container = document.getElementById('netflixRowsContainer');
  const loader = document.getElementById('infiniteLoader');
  loader.classList.remove('hidden');

  setTimeout(() => {
    const nextCategories = ROW_CATEGORIES.slice(loadedRowIndex, loadedRowIndex + count);
    
    nextCategories.forEach(cat => {
      let items = [];
      if (cat.type === 'trending') items = allTrending;
      else if (cat.type === 'movies') items = allMovies;
      else if (cat.type === 'tv') items = allTVShows;
      else if (cat.type === 'genre') items = allMovies.filter(m => m.genre_ids && m.genre_ids.includes(cat.genreId));
      else if (cat.type === 'history') items = getHistory();
      else if (cat.type === 'favorites') items = getFavorites();

      if (items.length > 0 || cat.type === 'favorites' || cat.type === 'history') {
        const rowEl = createNetflixRowHTML(cat, items);
        container.appendChild(rowEl);
      }
    });

    loadedRowIndex += count;
    isFetchingMoreRows = false;
    loader.classList.add('hidden');
  }, 400);
}

function setupInfiniteScroll() {
  window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 400) {
      loadNextRows(2);
    }
  });
}

function createNetflixRowHTML(category, items) {
  const rowDiv = document.createElement('div');
  rowDiv.className = 'netflix-row';
  rowDiv.id = `row-${category.id}`;

  const rowHeader = document.createElement('div');
  rowHeader.className = 'row-header';
  rowHeader.innerHTML = `<h2 class="row-title">${category.title} <i class="fa-solid fa-chevron-right" style="font-size:0.8rem;"></i></h2>`;

  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'row-slider-container';

  const leftArrow = document.createElement('button');
  leftArrow.className = 'slider-arrow left';
  leftArrow.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

  const rightArrow = document.createElement('button');
  rightArrow.className = 'slider-arrow right';
  rightArrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'row-cards-wrap';

  if (items.length === 0) {
    cardsWrap.innerHTML = `<p style="color:var(--text-gray); font-size:0.85rem;">Nenhum item nesta lista ainda.</p>`;
  } else {
    cardsWrap.innerHTML = items.map(item => `
      <div class="netflix-card" data-id="${item.id}">
        <img src="${getImageUrl(item.backdrop_path || item.poster_path)}" alt="${item.title}" loading="lazy" />
        <div class="card-hover-details">
          <div class="card-title-text">${item.title}</div>
          <div style="font-size:0.7rem; color:var(--match-green); font-weight:bold; margin-top:2px;">
            ${Math.floor(item.vote_average * 10 || 88)}% Relevante
          </div>
        </div>
      </div>
    `).join('');

    cardsWrap.querySelectorAll('.netflix-card').forEach(card => {
      card.onclick = () => {
        const id = parseInt(card.dataset.id);
        const item = items.find(i => i.id === id) || allTrending.find(i => i.id === id) || allMovies.find(i => i.id === id) || allTVShows.find(i => i.id === id);
        if (item) openNetflixDetailModal(item);
      };
    });
  }

  leftArrow.onclick = () => cardsWrap.scrollBy({ left: -500, behavior: 'smooth' });
  rightArrow.onclick = () => cardsWrap.scrollBy({ left: 500, behavior: 'smooth' });

  sliderContainer.appendChild(leftArrow);
  sliderContainer.appendChild(cardsWrap);
  sliderContainer.appendChild(rightArrow);

  rowDiv.appendChild(rowHeader);
  rowDiv.appendChild(sliderContainer);

  return rowDiv;
}

/* ==========================================
   NETFLIX PREVIEW DETAIL MODAL
   ========================================== */
function setupNetflixModal() {
  const modal = document.getElementById('netflixDetailModal');
  const closeBtn = document.getElementById('closeDetailModalBtn');

  closeBtn.onclick = () => modal.classList.add('hidden');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

function openNetflixDetailModal(item) {
  currentModalItem = item;
  const modal = document.getElementById('netflixDetailModal');
  const heroBg = document.getElementById('modalHeroBg');
  const title = document.getElementById('modalTitle');
  const match = document.getElementById('modalMatch');
  const year = document.getElementById('modalYear');
  const age = document.getElementById('modalAge');
  const synopsis = document.getElementById('modalSynopsis');
  const cast = document.getElementById('modalCast');
  const genres = document.getElementById('modalGenres');
  const playBtn = document.getElementById('modalPlayBtn');
  const favBtn = document.getElementById('modalFavBtn');
  const episodesSection = document.getElementById('modalEpisodesSection');
  const episodesList = document.getElementById('episodesList');
  const similarGrid = document.getElementById('similarCardsGrid');

  heroBg.style.backgroundImage = `url('${getBackdropUrl(item.backdrop_path)}')`;
  title.textContent = item.title;
  match.textContent = `${Math.floor(item.vote_average * 10 || 88)}% relevante`;
  year.textContent = (item.release_date || '2026').substring(0, 4);
  age.textContent = item.vote_average > 8 ? '16+' : '14+';
  synopsis.textContent = item.overview;
  cast.textContent = 'Bryan Cranston, Pedro Pascal, Millie Bobby Brown, Tom Holland';
  genres.textContent = item.media_type === 'tv' ? 'Série Dramática, Ficção' : 'Ação, Cinema e Aventura';

  playBtn.onclick = () => {
    modal.classList.add('hidden');
    openPlayer(item, 'trailer');
  };

  // Fav button state
  const updateFavBtnState = () => {
    const fav = isFavorite(item.id);
    favBtn.innerHTML = fav ? '<i class="fa-solid fa-check text-red"></i>' : '<i class="fa-solid fa-plus"></i>';
  };
  updateFavBtnState();

  favBtn.onclick = () => {
    toggleFavorite(item);
    updateFavBtnState();
    updateFavBadge();
  };

  // If Series -> Render Netflix Episodes List
  if (item.media_type === 'tv') {
    episodesSection.classList.remove('hidden');
    episodesList.innerHTML = [1, 2, 3, 4, 5].map(ep => `
      <div class="episode-item" data-ep="${ep}">
        <span class="episode-num">${ep}</span>
        <img class="episode-thumb" src="${getImageUrl(item.backdrop_path || item.poster_path)}" alt="Episódio ${ep}" />
        <div class="episode-info">
          <h4>Episódio ${ep}: ${item.title} - Capítulo ${ep}</h4>
          <p>As escolhas do passado retornam de forma surpreendente alterando o destino de todos os envolvidos.</p>
        </div>
      </div>
    `).join('');

    episodesList.querySelectorAll('.episode-item').forEach(epEl => {
      epEl.onclick = () => {
        modal.classList.add('hidden');
        openPlayer(item, 'trailer');
      };
    });
  } else {
    episodesSection.classList.add('hidden');
  }

  // Render Similar Recommendations
  const similarItems = allTrending.filter(i => i.id !== item.id).slice(0, 6);
  similarGrid.innerHTML = similarItems.map(sim => `
    <div class="netflix-card" data-id="${sim.id}">
      <img src="${getImageUrl(sim.backdrop_path || sim.poster_path)}" alt="${sim.title}" />
      <div class="card-hover-details">
        <div class="card-title-text">${sim.title}</div>
      </div>
    </div>
  `).join('');

  similarGrid.querySelectorAll('.netflix-card').forEach(card => {
    card.onclick = () => {
      const id = parseInt(card.dataset.id);
      const simItem = similarItems.find(s => s.id === id);
      if (simItem) openNetflixDetailModal(simItem);
    };
  });

  modal.classList.remove('hidden');
}

/* ==========================================
   NETFLIX NAVBAR & SEARCH
   ========================================== */
function setupNetflixNavbar() {
  const navbar = document.getElementById('netflixNavbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });
}

function setupNetflixSearch() {
  const box = document.getElementById('searchBoxNetflix');
  const trigger = document.getElementById('searchTriggerBtn');
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchResultsDropdown');
  const list = document.getElementById('searchResultsList');
  let searchTimer = null;

  trigger.onclick = () => {
    box.classList.toggle('expanded');
    if (box.classList.contains('expanded')) input.focus();
  };

  input.oninput = () => {
    const query = input.value.trim();
    if (!query) {
      dropdown.classList.add('hidden');
      return;
    }

    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      dropdown.classList.remove('hidden');
      const results = await searchCatalog(query);

      if (results.length === 0) {
        list.innerHTML = `<p style="padding:15px; color:var(--text-gray); text-align:center;">Nenhum resultado encontrado para "${query}".</p>`;
      } else {
        list.innerHTML = results.map(r => `
          <div class="search-item" data-id="${r.id}">
            <img src="${getImageUrl(r.poster_path)}" alt="${r.title}" />
            <div class="search-item-info">
              <h4>${r.title}</h4>
              <p>${(r.release_date || '').substring(0, 4)} • ${r.media_type === 'tv' ? 'Série' : 'Filme'}</p>
            </div>
          </div>
        `).join('');

        list.querySelectorAll('.search-item').forEach(el => {
          el.onclick = () => {
            const id = parseInt(el.dataset.id);
            const selected = results.find(item => item.id === id);
            if (selected) openNetflixDetailModal(selected);
            dropdown.classList.add('hidden');
          };
        });
      }
    }, 200);
  };
}

function updateFavBadge() {
  const badge = document.getElementById('navFavBadge');
  if (badge) badge.textContent = getFavorites().length;
}
