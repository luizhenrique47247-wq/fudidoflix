/**
 * Classe principal da aplicação FUDIDOFLIX.
 * Organiza toda a lógica, seletores de DOM e ouvintes de eventos.
 */

// Importa os módulos separados
import { dom } from './dom.js';
import { categories, sortByOptions, movieFilters, tvFilters } from './config.js';
import { fetchTMDB, IMG_BASE_URL, IMG_POSTER_URL } from './api.js';
import { SortePage } from './sorte.js';


// Chave para o localStorage
const WATCHED_HISTORY_KEY = 'fudidoFlixWatchedHistory';
const MAX_HISTORY_ITEMS = 20; // Limite de itens no histórico
const MY_LIST_KEY = 'fudidoFlixMyList';

// Chave da Intro
const INTRO_WATCHED_KEY = 'fudidoFlixIntroWatched';

class FudidoFlixApp {
    // ========================================================================
    //  PROPRIEDADES DA CLASSE
    // ========================================================================

    #currentModalItem = null;
    #ytPlayer = null;
    #currentHeroItem = null; // Armazena dados do item no hero
    
    #currentPlayerItem = null;     // Guarda dados do item (filme/série)
    #currentPlayerSeason = null;  // Guarda a temporada atual
    #currentPlayerEpisode = null; // Guarda o episódio atual
    #isEpisodePanelOpen = false;

    #sortePage = null;


    // Estado da página "Browse"
    #currentBrowseType = 'default';
    #currentPage = 1;
    #isFetching = false;

    // Filtros de "Browse"
    #currentSortBy = 'popularity.desc';
    #currentGenre = null;
    #currentProvider = null;
    #currentCompany = null;
    #currentKeyword = null;
    #currentCountry = null;
    #currentEra = null;
    #currentEraType = null;

    // Novo construtor para lidar com a Intro
    constructor() {
        document.addEventListener('DOMContentLoaded', () => {
            this.#initializeApp(); // Nova função de ponto de entrada
        });
    }

    /**
     * Nova função principal de inicialização
     * Lida com a lógica da intro antes de carregar o app
     */
    #initializeApp() {
        // Instancia a SortePage primeiro
        this.#sortePage = new SortePage(dom.contentRowsContainer, this);
        
        // Verifica se a intro já foi assistida NESTA SESSÃO
        if (sessionStorage.getItem(INTRO_WATCHED_KEY)) {
            // Se já viu, esconde a intro imediatamente
            dom.introModal.classList.add('hidden');
            dom.introVideo.pause();
            
            dom.mainNav.classList.remove('opacity-0');
            dom.mainContent.classList.remove('opacity-0');
            
        } else {
            // Se não viu, bloqueia o scroll e toca a intro
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            
            // Tenta dar play (necessário para alguns navegadores)
            dom.introVideo.play().catch(e => {
                console.warn("Autoplay da intro foi bloqueado pelo navegador. Clicar para pular ainda funciona.");
            });
        }
        
        // Configura TODOS os listeners, incluindo os da intro
        this.#setupEventListeners();
        
        // Carrega o conteúdo principal (Hero, fileiras, etc.)
        this.#initApp();
    }
    
    /**
     * Nova função para esconder a intro
     */
    #hideIntro() {
        // Previne chamadas múltiplas (ex: clicar e o vídeo terminar ao mesmo tempo)
        if (dom.introModal.classList.contains('hidden')) {
            return;
        }

        // Adiciona a classe 'hidden' para ativar a animação de fade-out do CSS
        dom.introModal.classList.add('hidden');
        
        // Para o vídeo
        dom.introVideo.pause();
        
        // Marca como assistido para esta sessão
        sessionStorage.setItem(INTRO_WATCHED_KEY, 'true');
        
        // Restaura o scroll do corpo
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        // Faz o fade-in do conteúdo
        dom.mainNav.classList.remove('opacity-0');
        dom.mainContent.classList.remove('opacity-0');
    }


    // ========================================================================
    //  INICIALIZAÇÃO E EVENTOS GLOBAIS
    // ========================================================================

    #setupEventListeners() {
        // Listeners da Intro
        dom.skipIntroButton.addEventListener('click', () => this.#hideIntro());
        dom.introVideo.addEventListener('ended', () => this.#hideIntro());
        // Failsafe: se o vídeo falhar ao carregar, esconde a intro
        dom.introVideo.addEventListener('error', () => this.#hideIntro());


        // Scroll da Navbar
        window.addEventListener('scroll', this.#handleNavScroll);
        // Scroll Infinito (para páginas de browse/busca)
        window.addEventListener('scroll', () => this.#handleInfiniteScroll());

        // Navegação Principal
        dom.logo.addEventListener('click', (e) => this.#handleLogoClick(e));
        dom.navInicio.addEventListener('click', (e) => this.#handleLogoClick(e));
        dom.navSeries.addEventListener('click', (e) => this.#showBrowsePage(e, 'tv', 'Séries'));
        dom.navFilmes.addEventListener('click', (e) => this.#showBrowsePage(e, 'movie', 'Filmes'));
        dom.navAnimes.addEventListener('click', (e) => this.#showBrowsePage(e, 'anime', 'Animes'));
        dom.navMinhaLista.addEventListener('click', (e) => this.#showMinhaListaPage(e));
        dom.navSorte.addEventListener('click', (e) => this.#showSortePage(e));

        // Modais
        dom.closePlayerButton.addEventListener('click', () => this.#closePlayer());
        dom.detailsModal.addEventListener('click', (event) => {
            if (event.target === dom.detailsModal) this.#closeDetailsModal();
        });
        dom.closeDetailsModalButton.addEventListener('click', () => this.#closeDetailsModal());

        // Botões do Player
        dom.playerEpisodesButton.addEventListener('click', () => this.#handlePlayerEpisodesClick());
        dom.playerNextButton.addEventListener('click', () => this.#handlePlayerNextClick());

        // Painel de Episódios
        dom.playerEpListCloseButton.addEventListener('click', () => this.#closeInPlayerEpisodeList());
        dom.playerEpListSeasonSelect.addEventListener('change', (e) => this.#handleInPlayerSeasonChange(e));
        dom.playerEpListContainer.addEventListener('click', (e) => this.#handleInPlayerEpisodeClick(e));
        dom.playerModalContent.addEventListener('click', (e) => this.#handlePlayerModalClick(e));


        // Botões do Modal de Detalhes
        dom.detailsModalPlayButton.addEventListener('click', () => this.#handleModalPlayClick());
        dom.detailsModalTrailerButton.addEventListener('click', () => this.#handleModalTrailerClick());
        dom.detailsModalSeasonSelect.addEventListener('change', (e) => this.#handleSeasonChange(e));
        dom.detailsModalEpisodesList.addEventListener('click', (e) => this.#handleEpisodeClick(e));
        dom.detailsModalAddListButton.addEventListener('click', () => this.#handleToggleMyList());

        // Busca
        dom.searchButton.addEventListener('click', () => this.#handleSearchClick());
        dom.searchInput.addEventListener('blur', () => this.#handleSearchBlur());
        dom.searchInput.addEventListener('keypress', (e) => this.#handleSearchKeypress(e));
    }

    async #initApp() {
        if (window.lucide) {
            lucide.createIcons();
        }
        // ==========================================================
        // MUDANÇA (Request 1): Pula a transição no carregamento inicial
        // ==========================================================
        this.#handleLogoClick(null, true); // Passa true para 'skipTransition'
    }

    #handleNavScroll() {
        if (window.scrollY > 50) {
            dom.mainNav.classList.add('bg-[#141414]', 'shadow-lg');
        } else {
            dom.mainNav.classList.remove('bg-[#141414]', 'shadow-lg');
        }
    }

    // ========================================================================
    //  LÓGICA DO LOCALSTORAGE (HISTÓRICO E MINHA LISTA)
    // ========================================================================

    #getWatchedHistory() {
        try {
            const historyJson = localStorage.getItem(WATCHED_HISTORY_KEY);
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (error) {
            console.error("Erro ao ler histórico do localStorage:", error);
            return [];
        }
    }

    #saveToWatchedHistory(itemData) {
        if (!itemData || !itemData.id || !itemData.type || !itemData.poster_path || !(itemData.title || itemData.name)) {
            console.warn("[#saveToWatchedHistory] Dados incompletos para salvar:", itemData);
            return;
        }

        try {
            let history = this.#getWatchedHistory();
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
        } catch (error) {
            console.error("Erro ao salvar histórico no localStorage:", error);
        }
    }
    
    #getMyList() {
        try {
            const listJson = localStorage.getItem(MY_LIST_KEY);
            return listJson ? JSON.parse(listJson) : [];
        } catch (error) {
            console.error("Erro ao ler Minha Lista do localStorage:", error);
            return [];
        }
    }
    
    #isItemInMyList(id, type) {
        const list = this.#getMyList();
        return list.some(item => item.id === id && item.type === type);
    }
    
    #saveToMyList(itemData) {
        if (!itemData || !itemData.id || !itemData.type) {
             console.warn("[#saveToMyList] Dados incompletos para salvar:", itemData);
            return;
        }
        try {
            let list = this.#getMyList();
            // Evita duplicatas
            if (!this.#isItemInMyList(itemData.id, itemData.type)) {
                list.unshift(itemData); // Adiciona no início
                localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
            }
        } catch (error) {
             console.error("Erro ao salvar em Minha Lista no localStorage:", error);
        }
    }
    
    #removeFromMyList(id, type) {
         try {
            let list = this.#getMyList();
            list = list.filter(item => !(item.id === id && item.type === type));
            localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
        } catch (error) {
             console.error("Erro ao remover de Minha Lista no localStorage:", error);
        }
    }

    // ========================================================================
    //  NAVEGAÇÃO E EXIBIÇÃO DE PÁGINAS
    // ========================================================================

    // ==========================================================
    // MUDANÇA (Request 1): Nova função para FADE-IN/FADE-OUT
    // ==========================================================
    /**
     * @param {function} contentCallback A função que constrói a nova página.
     */
    #handlePageTransition(contentCallback) {
        // 1. Inicia o fade-out
        dom.mainContent.classList.add('opacity-0');
        
        // 2. Espera a animação (300ms, igual ao CSS)
        setTimeout(() => {
            // 3. Executa a troca de conteúdo
            // Coloca o scroll no topo
            window.scrollTo(0, 0);
            
            // A callback (ex: #showBrowsePage) é chamada AQUI
            contentCallback(); 
            
            // 4. Inicia o fade-in (com um pequeno delay para o DOM atualizar)
            setTimeout(() => {
                dom.mainContent.classList.remove('opacity-0');
            }, 50); // 50ms é o suficiente
            
        }, 300); // 300ms
    }

    #resetBrowseState() {
        this.#currentPage = 1;
        this.#isFetching = false;
        this.#currentSortBy = 'popularity.desc';
        this.#currentGenre = null;
        this.#currentProvider = null;
        this.#currentCompany = null;
        this.#currentKeyword = null;
        this.#currentCountry = null;
        this.#currentEra = null;
        this.#currentEraType = null;
    }

    // ==========================================================
    // MUDANÇA (Request 1): Refatorado para usar a transição
    // ==========================================================
    #handleLogoClick(event, skipTransition = false) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'default';
            this.#resetBrowseState();
            dom.heroSection.classList.remove('hidden'); // Mostra o Hero
            dom.searchInput.value = '';
            dom.searchInput.classList.add('hidden', 'w-0');
            dom.searchInput.classList.remove('w-64');

            this.#fetchAndDisplayHero();
            this.#fetchAndDisplayRows(categories.default);
            this.#setActiveNavLink(dom.navInicio);
        };
        
        if (skipTransition) {
            pageLogic(); // Roda direto na primeira carga
        } else {
            this.#handlePageTransition(pageLogic);
        }
    }

    // ==========================================================
    // MUDANÇA (Request 1): Refatorado para usar a transição
    // ==========================================================
    #showBrowsePage(event, type, title) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = type;
            this.#resetBrowseState();

            if (type === 'anime') {
                this.#currentGenre = '16';
            }

            dom.heroSection.classList.add('hidden'); // Esconde o Hero
            dom.contentRowsContainer.innerHTML = '';

            this.#createBrowseHeader(title, type);

            const gridContainer = document.createElement('div');
            gridContainer.id = 'browse-grid';
            gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8';
            dom.contentRowsContainer.appendChild(gridContainer);

            this.#fetchAndDisplayGrid();

            let activeLink = null;
            if (type === 'tv') activeLink = dom.navSeries;
            if (type === 'movie') activeLink = dom.navFilmes;
            if (type === 'anime') activeLink = dom.navAnimes;
            this.#setActiveNavLink(activeLink);
        };

        this.#handlePageTransition(pageLogic);
    }

    // ==========================================================
    // MUDANÇA (Request 1): Refatorado para usar a transição
    // ==========================================================
    #showMinhaListaPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'minha-lista';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = ''; // Limpa o container
            this.#setActiveNavLink(dom.navMinhaLista);
            
            const myList = this.#getMyList();

            const titleEl = document.createElement('h2');
            titleEl.className = 'text-3xl font-bold pt-24';
            titleEl.textContent = `Minha Lista`;
            dom.contentRowsContainer.appendChild(titleEl);

            if (myList.length === 0) {
                dom.contentRowsContainer.innerHTML += `
                    <p class="text-gray-400 mt-4">Você ainda não adicionou nenhum título à sua lista.</p>
                `;
                return;
            }

            const gridContainer = document.createElement('div');
            gridContainer.id = 'my-list-grid';
            gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8';

            myList.forEach(item => {
                if (item.poster_path) {
                    const img = document.createElement('img');
                    img.src = `${IMG_POSTER_URL}${item.poster_path}`;
                    img.alt = item.title || item.name;
                    img.className = 'poster-grid';
                    img.dataset.id = item.id;
                    img.loading = 'lazy';
                    const type = item.media_type || item.type;
                    img.dataset.type = type;
                    img.addEventListener('click', () => this.#openDetailsModal(item.id, type));
                    gridContainer.appendChild(img);
                }
            });
            dom.contentRowsContainer.appendChild(gridContainer);
            if (window.lucide) { lucide.createIcons(); }
        };

        this.#handlePageTransition(pageLogic);
    }

    // ==========================================================
    // MUDANÇA (Request 1): Refatorado para usar a transição
    // ==========================================================
    #showSortePage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'sorte';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            
            // Delega a renderização para a classe SortePage
            this.#sortePage.showPage(); 
            
            this.#setActiveNavLink(dom.navSorte);
        };
        
        this.#handlePageTransition(pageLogic);
    }

    #setActiveNavLink(activeLink) {
        dom.mainNavigation.querySelectorAll('a').forEach(link => {
            link.classList.remove('font-semibold');
            if (!link.classList.contains('hover:text-gray-300')) {
                link.classList.add('hover:text-gray-300');
            }
        });
        if (activeLink) {
            activeLink.classList.add('font-semibold');
            activeLink.classList.remove('hover:text-gray-300');
        }
    }

    // ========================================================================
    //  BUSCA E EXIBIÇÃO DE CONTEÚDO (HERO, FILEIRAS, GRID)
    // ========================================================================

    async #fetchAndDisplayHero() {
        this.#currentHeroItem = null;
        const data = await fetchTMDB('/trending/all/day');
        if (data && data.results && data.results.length > 0) {
            const playableItems = data.results.filter(item => item.backdrop_path && item.overview);
            if (playableItems.length === 0) return;

            const item = playableItems[Math.floor(Math.random() * playableItems.length)];
            this.#currentHeroItem = item; // Armazena item completo

            const itemType = item.media_type || (item.title ? 'movie' : 'tv');

            dom.heroTitle.textContent = item.title || item.name;
            dom.heroOverview.textContent = item.overview;
            dom.heroSection.style.backgroundImage = `url(${IMG_BASE_URL}${item.backdrop_path})`;

            dom.heroPlayButton.onclick = () => {
                const season = itemType === 'tv' ? 1 : null;
                const episode = itemType === 'tv' ? 1 : null;
                this.#openPlayer(item.id, itemType, season, episode, this.#currentHeroItem);
            };

            dom.heroInfoButton.onclick = () => {
                this.#openDetailsModal(item.id, itemType);
            };
        } else {
            dom.heroTitle.textContent = "Não foi possível carregar o destaque";
            dom.heroOverview.textContent = "Verifique sua conexão ou a chave da API.";
        }
    }

    async #fetchAndDisplayRows(categoriesToShow) {
        dom.contentRowsContainer.innerHTML = '';

        for (const category of categoriesToShow) {
            let items = [];
            let showError = false;

            if (category.endpoint === 'localstorage' && category.title === "Últimos Assistidos") {
                items = this.#getWatchedHistory();
                if (items.length === 0) {
                     continue;
                }
            } else if (category.endpoint) {
                try {
                    const data = await fetchTMDB(category.endpoint);
                    items = data?.results || [];
                    if (!data?.results) showError = true;
                } catch (error) {
                    console.error(`Erro ao buscar dados para ${category.title}:`, error);
                    showError = true;
                }
            }

            if (items.length > 0) {
                this.#createRow(category.title, items);
            } else if (!showError && category.endpoint !== 'localstorage') {
                 console.log(`Nenhum item encontrado para ${category.title}`);
            } else if (showError) {
                console.warn(`Não foi possível carregar a fileira: ${category.title}`);
            }
        }
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    #createRow(title, items) {
        const rowWrapper = document.createElement('div');
        rowWrapper.className = 'row-wrapper mb-8'; 

        const titleElement = document.createElement('h2');
        titleElement.className = 'text-xl md:text-2xl font-bold mb-3';
        titleElement.textContent = title;
        rowWrapper.appendChild(titleElement);

        const carouselWrapperRelative = document.createElement('div');
        carouselWrapperRelative.className = 'carousel-wrapper-relative'; 

        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'carousel-container py-4';

        const validItems = items.filter(item => item.poster_path && (item.media_type !== 'person' || category.title === "Últimos Assistidos"));

        if (validItems.length === 0) {
             if (title === "Últimos Assistidos") {
                return;
             } else {
                 carouselContainer.innerHTML = `<p class="text-gray-500 text-sm italic ml-1">Nenhum item disponível.</p>`;
             }
        } else {
             validItems.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'poster-carousel-wrapper';

                const img = document.createElement('img');
                img.src = `${IMG_POSTER_URL}${item.poster_path}`;
                img.alt = item.title || item.name || 'Poster';
                img.className = 'poster-carousel';
                img.loading = 'lazy';

                const titleOverlay = document.createElement('div');
                titleOverlay.className = 'poster-title-overlay';
                titleOverlay.textContent = item.title || item.name || '';

                wrapper.appendChild(img);
                wrapper.appendChild(titleOverlay);

                const itemType = item.type || item.media_type || (item.title ? 'movie' : 'tv');
                wrapper.addEventListener('click', () => {
                    this.#openDetailsModal(item.id, itemType);
                });

                carouselContainer.appendChild(wrapper);
            });
        }
        
        carouselWrapperRelative.appendChild(carouselContainer); 

        // Adiciona setas se necessário
        let arrowLeft = null, arrowRight = null;
        const posterWidthWithMargin = 180 + 12; // 180px width + 0.75rem margin-right (12px)
        const availableWidth = carouselContainer.parentElement?.clientWidth || window.innerWidth;
         
        if (validItems.length * posterWidthWithMargin > availableWidth) {
            arrowLeft = document.createElement('button');
            arrowLeft.className = 'carousel-arrow carousel-arrow-left';
            arrowLeft.innerHTML = `<i data-lucide="chevron-left" class="w-8 h-8"></i>`;
            arrowLeft.addEventListener('click', () => this.#scrollCarousel(carouselContainer, -1));

            arrowRight = document.createElement('button');
            arrowRight.className = 'carousel-arrow carousel-arrow-right';
            arrowRight.innerHTML = `<i data-lucide="chevron-right" class="w-8 h-8"></i>`;
            arrowRight.addEventListener('click', () => this.#scrollCarousel(carouselContainer, 1));

            carouselWrapperRelative.appendChild(arrowLeft);
            carouselWrapperRelative.appendChild(arrowRight);

            carouselContainer.addEventListener('mouseenter', () => {
                arrowLeft.style.opacity = '0';
                arrowRight.style.opacity = '0';
            });

            carouselContainer.addEventListener('mouseleave', () => {
                arrowLeft.style.opacity = ''; 
                arrowRight.style.opacity = ''; 
            });
        }

        rowWrapper.appendChild(carouselWrapperRelative); 
        dom.contentRowsContainer.appendChild(rowWrapper);
    }

    #scrollCarousel(container, direction) {
    const posterWrapper = container.querySelector('.poster-carousel-wrapper');
    if (!posterWrapper) return; 

    const posterStyle = window.getComputedStyle(posterWrapper);
    const posterWidth = posterWrapper.getBoundingClientRect().width;
    
    let gap = 0;
    const containerStyle = window.getComputedStyle(container);
    const containerGap = parseFloat(containerStyle.gap);

    if (containerGap > 0) {
        gap = containerGap;
    } else {
        const posterMarginRight = parseFloat(posterStyle.marginRight);
        gap = posterMarginRight > 0 ? posterMarginRight : 12; 
    }

    const scrollAmount = (posterWidth + gap);
    
    container.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
}

    // ========================================================================
    //  LÓGICA DA PÁGINA "EXPLORAR" (BROWSE) E BUSCA
    // ========================================================================

    #createBrowseHeader(title, type) {
        const headerContainer = document.createElement('div');
        headerContainer.className = 'pt-24 flex flex-col md:flex-row justify-between items-center mb-8 gap-4';

        const titleEl = document.createElement('h2');
        titleEl.className = 'text-3xl font-bold';
        titleEl.textContent = title;
        headerContainer.appendChild(titleEl);

        const selectorsContainer = document.createElement('div');
        selectorsContainer.className = 'flex flex-wrap gap-4';

        if (type !== 'anime') {
            const genreSelect = this.#createFilterSelect('category-select', (type === 'movie') ? movieFilters : tvFilters);
            genreSelect.addEventListener('change', () => this.#handleFilterChange());
            selectorsContainer.appendChild(genreSelect);
        }

        const sortSelect = this.#createSortSelect('sort-by-select', (type === 'movie') ? sortByOptions.movie : sortByOptions.tv);
        sortSelect.addEventListener('change', () => this.#handleFilterChange());
        selectorsContainer.appendChild(sortSelect);

        headerContainer.appendChild(selectorsContainer);
        dom.contentRowsContainer.appendChild(headerContainer);
    }

    #createFilterSelect(id, filterList) {
        const select = document.createElement('select');
        select.id = id;
        select.className = 'browse-select';
        filterList.forEach(filter => {
            const option = document.createElement('option');
            if (filter.type === 'divider') {
                option.disabled = true;
                option.textContent = '──────────';
            } else {
                option.value = filter.name;
                option.textContent = filter.name;
                option.dataset.type = filter.type;
                option.dataset.value = filter.value;
                if (filter.style === 'award') option.className = 'award';
            }
            select.appendChild(option);
        });
        return select;
    }

    #createSortSelect(id, sortList) {
        const select = document.createElement('select');
        select.id = id;
        select.className = 'browse-select';
        sortList.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.name;
            select.appendChild(option);
        });
        return select;
    }


    #handleFilterChange() {
        this.#resetBrowseState();
        this.#currentPage = 1;

        const sortSelect = document.getElementById('sort-by-select');
        if (sortSelect) this.#currentSortBy = sortSelect.value;

        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            const type = selectedOption.dataset.type;
            const value = selectedOption.dataset.value;

            this.#currentGenre = null; this.#currentProvider = null; this.#currentCompany = null;
            this.#currentKeyword = null; this.#currentCountry = null; this.#currentEra = null;

            switch (type) {
                case 'genre': this.#currentGenre = value || null; break;
                case 'provider': this.#currentProvider = value || null; break;
                case 'company': this.#currentCompany = value || null; break;
                case 'keyword': this.#currentKeyword = value || null; break;
                case 'country': this.#currentCountry = value || null; break;
                case 'era_movie': this.#currentEra = value || null; this.#currentEraType = 'movie'; break;
                case 'era_tv': this.#currentEra = value || null; this.#currentEraType = 'tv'; break;
            }
        }

        if (this.#currentBrowseType === 'anime') {
            this.#currentGenre = '16';
        }

        const gridContainer = document.getElementById('browse-grid');
        if (gridContainer) gridContainer.innerHTML = '';

        this.#fetchAndDisplayGrid();
    }

    async #fetchAndDisplayGrid() {
        if (this.#isFetching) return;
        this.#isFetching = true;

        const gridContainer = document.getElementById('browse-grid');
        if (!gridContainer) {
            this.#isFetching = false;
            return;
        }

        let typeForEndpoint = (this.#currentBrowseType === 'anime') ? 'tv' : this.#currentBrowseType;
        let endpoint = `/discover/${typeForEndpoint}?`;
        endpoint += `&sort_by=${this.#currentSortBy}`;
        endpoint += `&page=${this.#currentPage}`;
        if (this.#currentGenre) endpoint += `&with_genres=${this.#currentGenre}`;
        if (this.#currentProvider) endpoint += `&with_watch_providers=${this.#currentProvider}&watch_region=BR`;
        if (this.#currentCompany) endpoint += `&with_companies=${this.#currentCompany}`;
        if (this.#currentKeyword) endpoint += `&with_keywords=${this.#currentKeyword}`;
        if (this.#currentCountry) endpoint += `&with_origin_country=${this.#currentCountry}`;
        if (this.#currentEra) {
            const eraFilter = (this.#currentEraType === 'movie') ? 'primary_release_date.lte' : 'first_air_date.lte';
            endpoint += `&${eraFilter}=${this.#currentEra}`;
        }
        endpoint += '&vote_count.gte=50';

        const data = await fetchTMDB(endpoint);

        if (data && data.results) {
            data.results.forEach(item => {
                if (item.poster_path) {
                    const img = document.createElement('img');
                    img.src = `${IMG_POSTER_URL}${item.poster_path}`;
                    img.alt = item.title || item.name;
                    img.className = 'poster-grid';
                    img.dataset.id = item.id;
                    img.loading = 'lazy';

                    const type = item.media_type || typeForEndpoint;
                    img.dataset.type = type;

                    img.addEventListener('click', () => {
                        this.#openDetailsModal(item.id, type);
                    });

                    gridContainer.appendChild(img);
                }
            });
             if (window.lucide) { lucide.createIcons(); }
        } else {
             if(this.#currentPage === 1) {
                 gridContainer.innerHTML = `<p class="text-gray-500 col-span-full">Nenhum resultado encontrado para estes filtros.</p>`;
             }
        }

        this.#isFetching = false;
    }

    #handleInfiniteScroll() {
        const validBrowseTypes = ['movie', 'tv', 'anime'];
        if (!validBrowseTypes.includes(this.#currentBrowseType) || this.#isFetching) {
            return;
        }

        const isNearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
        if (isNearBottom) {
            this.#currentPage++;
            this.#fetchAndDisplayGrid();
        }
    }

    #handleSearchClick() {
        const isHidden = dom.searchInput.classList.contains('hidden');
        const query = dom.searchInput.value.trim();

        if (isHidden) {
            dom.searchInput.classList.remove('hidden', 'w-0');
            dom.searchInput.classList.add('w-48', 'md:w-64');
            dom.searchInput.focus();
        } else if (query) {
            this.#performSearch(query);
            dom.searchInput.blur();
        } else {
            dom.searchInput.classList.add('hidden', 'w-0');
            dom.searchInput.classList.remove('w-48', 'md:w-64');
        }
    }

    #handleSearchBlur() {
        if (dom.searchInput.value.trim() === '') {
            dom.searchInput.classList.add('hidden', 'w-0');
            dom.searchInput.classList.remove('w-48', 'md:w-64');
        }
    }

    #handleSearchKeypress(event) {
        if (event.key === 'Enter') {
            const query = dom.searchInput.value.trim();
            if (query) {
                this.#performSearch(query);
                dom.searchInput.blur();
            }
        }
    }

    // ==========================================================
    // MUDANÇA (Request 1): Refatorado para usar a transição
    // ==========================================================
    async #performSearch(query) {
        const pageLogic = async () => {
            this.#currentBrowseType = 'search';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = '<p class="text-gray-400 text-lg pt-24">Buscando...</p>';
            this.#setActiveNavLink(null);

            const endpoint = `/search/multi?query=${encodeURIComponent(query)}`;
            const data = await fetchTMDB(endpoint);

            dom.contentRowsContainer.innerHTML = '';

            if (data && data.results && data.results.length > 0) {
                const validResults = data.results.filter(item => item.media_type !== 'person' && item.poster_path);

                if (validResults.length > 0) {
                    const titleEl = document.createElement('h2');
                    titleEl.className = 'text-3xl font-bold pt-24';
                    titleEl.textContent = `Resultados para "${query}"`;
                    dom.contentRowsContainer.appendChild(titleEl);

                    const gridContainer = document.createElement('div');
                    gridContainer.id = 'search-grid';
                    gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8';

                    validResults.forEach(item => {
                        const img = document.createElement('img');
                        img.src = `${IMG_POSTER_URL}${item.poster_path}`;
                        img.alt = item.title || item.name;
                        img.className = 'poster-grid';
                        img.dataset.id = item.id;
                        img.loading = 'lazy';
                        const type = item.media_type;
                        img.dataset.type = type;
                        img.addEventListener('click', () => this.#openDetailsModal(item.id, type));
                        gridContainer.appendChild(img);
                    });
                    dom.contentRowsContainer.appendChild(gridContainer);
                    if (window.lucide) { lucide.createIcons(); }
                } else {
                    dom.contentRowsContainer.innerHTML = '<p class="text-gray-400 text-lg pt-24">Nenhum filme ou série encontrado para esta busca.</p>';
                }
            } else {
                dom.contentRowsContainer.innerHTML = '<p class="text-gray-400 text-lg pt-24">Nenhum resultado encontrado.</p>';
            }
        };

        this.#handlePageTransition(() => { pageLogic(); });
    }


    // ========================================================================
    //  MODAL DO PLAYER E PAINEL DE EPISÓDIOS
    // ========================================================================

    #handlePlayerModalClick(event) {
        if (this.#isEpisodePanelOpen && event.target === dom.playerModalContent) {
            this.#closeInPlayerEpisodeList();
        }
    }

    #handlePlayerEpisodesClick() {
        if (this.#isEpisodePanelOpen) {
            this.#closeInPlayerEpisodeList();
        } else {
            this.#openInPlayerEpisodeList();
        }
    }
    
    async #openInPlayerEpisodeList() {
        if (!this.#currentPlayerItem || (this.#currentPlayerItem.media_type !== 'tv' && !this.#currentPlayerItem.fullSeasonsData)) {
            if (this.#currentPlayerItem && this.#currentPlayerItem.media_type === 'tv') {
                const details = await fetchTMDB(`/${this.#currentPlayerItem.media_type}/${this.#currentPlayerItem.id}`);
                if (details && details.seasons) {
                    this.#currentPlayerItem.fullSeasonsData = details.seasons;
                } else {
                     console.error("Não foi possível buscar dados da temporada.");
                     return;
                }
            } else {
                console.warn("Item não é uma série ou não tem dados de temporada.");
                return;
            }
        }
        
        dom.playerEpisodeListPanel.classList.add('visible');
        dom.playerContainer.style.pointerEvents = 'none'; 
        this.#isEpisodePanelOpen = true;

        const seasons = this.#currentPlayerItem.fullSeasonsData || [];
        const validSeasons = seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        dom.playerEpListSeasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `Temporada ${season.season_number} (${season.episode_count} ep.)`;
            dom.playerEpListSeasonSelect.appendChild(option);
        });

        const currentSeasonNum = this.#currentPlayerSeason || validSeasons[0]?.season_number || 1;
        dom.playerEpListSeasonSelect.value = currentSeasonNum;

        await this.#displayInPlayerEpisodes(currentSeasonNum);
    }

    #closeInPlayerEpisodeList() {
        dom.playerEpisodeListPanel.classList.remove('visible');
        dom.playerContainer.style.pointerEvents = 'auto'; 
        this.#isEpisodePanelOpen = false;
    }

    async #handleInPlayerSeasonChange(event) {
        const seasonNumber = parseInt(event.target.value);
        await this.#displayInPlayerEpisodes(seasonNumber);
    }

    async #displayInPlayerEpisodes(seasonNumber) {
        dom.playerEpListContainer.innerHTML = '<li class="text-gray-500 p-4">Carregando episódios...</li>';

        const tvId = this.#currentPlayerItem.id;
        let season = this.#currentPlayerItem.fullSeasonsData?.find(s => s.season_number === seasonNumber);
        
        let episodes = season?.episodes;

        if (season && !episodes) {
            console.log(`[#displayInPlayerEpisodes] Buscando detalhes da temporada ${seasonNumber} da API...`);
            try {
                const seasonDetails = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
                if (seasonDetails && seasonDetails.episodes) {
                    episodes = seasonDetails.episodes;
                    season.episodes = episodes; 
                }
            } catch (error) {
                console.error(`Erro ao buscar detalhes da temporada ${seasonNumber}:`, error);
                episodes = null;
            }
        }

        dom.playerEpListContainer.innerHTML = '';

        if (episodes && episodes.length > 0) {
            episodes.forEach(episode => {
                const listItem = document.createElement('li');
                listItem.className = 'episode-item'; 
                listItem.dataset.episodeNumber = episode.episode_number;
                listItem.dataset.seasonNumber = seasonNumber;

                if (episode.episode_number === this.#currentPlayerEpisode && seasonNumber === this.#currentPlayerSeason) {
                    listItem.classList.add('active');
                }

                const placeholderImg = 'https://placehold.co/120x70/181818/333?text=EP';
                const imgSrc = episode.still_path ? `${IMG_POSTER_URL}${episode.still_path}` : placeholderImg;

                listItem.innerHTML = `
                    <div class="flex-shrink-0 text-gray-500 text-lg font-semibold w-8 text-center">${episode.episode_number}</div>
                    <img src="${imgSrc}" alt="Episódio ${episode.episode_number}" class="episode-thumbnail" onerror="this.src='${placeholderImg}'">
                    <div class="flex-grow">
                        <h5 class="text-white text-base font-semibold mb-1">${episode.name || `Episódio ${episode.episode_number}`}</h5>
                        <p class="text-gray-400 text-xs line-clamp-2">${episode.overview || 'Sem descrição.'}</p>
                        <p class="text-gray-500 text-xs mt-1">${episode.runtime ? `${episode.runtime} min` : ''}</p>
                    </div>`;

                dom.playerEpListContainer.appendChild(listItem);
            });
        } else {
            dom.playerEpListContainer.innerHTML = '<li class="text-gray-500 p-4">Nenhum episódio encontrado.</li>';
        }
    }

    async #handleInPlayerEpisodeClick(event) {
        const clickedItem = event.target.closest('.episode-item');
        if (!clickedItem || !this.#currentPlayerItem) return;

        try {
            const tvId = this.#currentPlayerItem.id;
            const type = this.#currentPlayerItem.media_type;
            const seasonNum = parseInt(clickedItem.dataset.seasonNumber);
            const episodeNum = parseInt(clickedItem.dataset.episodeNumber);

            if (tvId && type === 'tv' && seasonNum && episodeNum) {
                this.#openPlayer(tvId, type, seasonNum, episodeNum, this.#currentPlayerItem);
                this.#closeInPlayerEpisodeList();
            } else {
                console.error('Dados insuficientes para tocar o episódio.', { tvId, type, seasonNum, episodeNum });
            }
        } catch (error) {
            console.error('Erro ao tentar tocar o episódio:', error);
        }
    }

    #handlePlayerNextClick() {
        if (!this.#currentPlayerItem || this.#currentPlayerItem.media_type !== 'tv' || !this.#currentPlayerSeason || !this.#currentPlayerEpisode) {
            console.warn("Dados insuficientes para pular para o próximo episódio.");
            return;
        }
        
        const nextEpisode = this.#currentPlayerEpisode + 1;
        
        this.#openPlayer(
            this.#currentPlayerItem.id, 
            this.#currentPlayerItem.media_type, 
            this.#currentPlayerSeason, 
            nextEpisode, 
            this.#currentPlayerItem
        );
    }


    #openPlayer(id, type, season = null, episode = null, itemData = null) {
        let playerUrl = '';

        if (this.#ytPlayer) {
            try { this.#ytPlayer.stopVideo(); this.#ytPlayer.destroy(); } catch(e) {}
            this.#ytPlayer = null;
        }

        if (itemData && this.#currentPlayerItem && this.#currentPlayerItem.id === id &&
            this.#currentPlayerSeason === season && this.#currentPlayerEpisode === episode) {
            console.log("Player já está tocando este item.");
            return;
        }

        this.#currentPlayerItem = itemData;
        this.#currentPlayerSeason = season;
        this.#currentPlayerEpisode = episode;

        if (type === 'movie') {
            playerUrl = `https://vidsrc.cc/v2/embed/movie/${id}`; 
            dom.playerControlsTV.classList.add('hidden');
            this.#closeInPlayerEpisodeList();
        } else if (type === 'tv' && season && episode) {
            playerUrl = `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`;
            dom.playerControlsTV.classList.remove('hidden');
            dom.playerNextButton.classList.remove('hidden');
        } else {
            console.error("[#openPlayer] Tipo de mídia ou informações inválidas para o player.");
            return;
        }
        
        if (itemData) {
             this.#saveToWatchedHistory({
                 id: id,
                 type: type, 
                 title: itemData.title || itemData.name,
                 poster_path: itemData.poster_path
             });
        } else {
             console.warn("[#openPlayer] Não foi possível salvar no histórico: itemData não fornecido.");
        }

        try {
            dom.playerContainer.innerHTML = `
                <iframe
                    src="${playerUrl}"
                    width="100%" height="100%" frameborder="0" allowfullscreen
                    referrerpolicy="no-referrer"
                    sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-popups">
                </iframe>`;
        } catch (error) {
             console.error("ERRO ao definir playerContainer.innerHTML:", error);
             alert("Ocorreu um erro ao tentar carregar o player.");
             this.#closePlayer(); 
             return;
        }

        dom.playerModal.classList.remove('hidden');
        
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        if (window.lucide) { lucide.createIcons(); }

        if (this.#isEpisodePanelOpen) {
            this.#displayInPlayerEpisodes(season);
        }
    }


    async #fetchAndPlayTrailer(id, type) {
         const endpoint = type === 'movie' ? `/movie/${id}/videos` : `/tv/${id}/videos`;
        const data = await fetchTMDB(endpoint);

        let trailerKey = null;
        if (data && data.results && data.results.length > 0) {
             const trailers = data.results.filter(v => v.site === 'YouTube' && v.type === 'Trailer');
             let officialTrailer = trailers.find(t => t.official && (t.iso_639_1 === 'pt' || t.iso_639_1 === 'en'));
             if (!officialTrailer) officialTrailer = trailers.find(t => t.official);
             if (!officialTrailer) officialTrailer = trailers[0];

             if (officialTrailer) {
                 trailerKey = officialTrailer.key;
             } else {
                 const firstVideo = data.results.find(v => v.site === 'YouTube');
                 if (firstVideo) trailerKey = firstVideo.key;
             }
        }

        if (trailerKey) {
            dom.playerContainer.innerHTML = '<div id="youtube-player-div" class="w-full h-full"></div>';
            dom.playerModal.classList.remove('hidden');
            
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            if (this.#currentPlayerItem && this.#currentPlayerItem.media_type === 'tv') {
                dom.playerControlsTV.classList.remove('hidden');
                dom.playerNextButton.classList.add('hidden');
            } else {
                dom.playerControlsTV.classList.add('hidden');
            }
            this.#closeInPlayerEpisodeList();

            if (this.#ytPlayer) {
                try { this.#ytPlayer.destroy(); } catch(e){}
                this.#ytPlayer = null;
            }

            if (typeof YT !== 'undefined' && YT.Player) {
                this.#ytPlayer = new YT.Player('youtube-player-div', {
                    height: '100%', width: '100%', videoId: trailerKey,
                    playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0 },
                    events: { 'onReady': (event) => event.target.playVideo() }
                });
            } else {
                console.error("API do YouTube (YT) não encontrada.");
            }
             if (window.lucide) { lucide.createIcons(); }
        } else {
            alert("Nenhum trailer ou vídeo do YouTube encontrado para este título.");
        }
    }

    #closePlayer() {
        dom.playerModal.classList.add('hidden');
        if (this.#ytPlayer) {
            try { this.#ytPlayer.stopVideo(); this.#ytPlayer.destroy(); } catch (e) {}
            this.#ytPlayer = null;
        }
        dom.playerContainer.innerHTML = '';
        dom.playerContainer.style.pointerEvents = 'auto'; 
        
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        this.#currentPlayerItem = null;
        this.#currentPlayerSeason = null;
        this.#currentPlayerEpisode = null;
        dom.playerControlsTV.classList.add('hidden');
        dom.playerNextButton.classList.remove('hidden');
        this.#closeInPlayerEpisodeList();

        if (this.#currentBrowseType === 'default') {
            this.#fetchAndDisplayRows(categories.default);
        }
    }

    // ========================================================================
    //  MODAL DE DETALHES
    // ========================================================================

    
    /**
     * Wrapper PÚBLICO para permitir que SortePage chame #openDetailsModal
     * @param {string} id O ID do filme ou série
     * @param {string} type 'movie' ou 'tv'
     */
    publicOpenDetailsModal(id, type) {
        this.#openDetailsModal(id, type);
    }
    
    #handleToggleMyList() {
        if (!this.#currentModalItem) return;

        const { id, media_type, title, name, poster_path } = this.#currentModalItem;
        
        const itemData = { 
            id: id, 
            type: media_type, 
            title: title || name, 
            poster_path: poster_path,
            media_type: media_type
        };

        if (this.#isItemInMyList(id, media_type)) {
            this.#removeFromMyList(id, media_type);
        } else {
            this.#saveToMyList(itemData);
        }
        
        this.#updateMyListButtonIcon(id, media_type);
    }
    
    #updateMyListButtonIcon(id, type) {
        const currentIcon = dom.detailsModalAddListButton.querySelector('i, svg');
        if (currentIcon) {
            currentIcon.remove();
        }
        
        const iconName = this.#isItemInMyList(id, type) ? 'check' : 'plus';
        
        const newIcon = document.createElement('i');
        newIcon.setAttribute('data-lucide', iconName);
        newIcon.className = 'w-5 h-5';
        
        dom.detailsModalAddListButton.appendChild(newIcon);
        
        if (window.lucide) {
            lucide.createIcons({
                nodes: [newIcon]
            });
        }
    }


    async #handleEpisodeClick(event) {
        const clickedItem = event.target.closest('.episode-item');
        if (!clickedItem || !this.#currentModalItem) return;

        clickedItem.parentElement.querySelectorAll('li').forEach(li => li.classList.remove('active'));
        clickedItem.classList.add('active');

        try {
            const tvId = this.#currentModalItem.id;
            const type = this.#currentModalItem.media_type;
            const seasonNum = parseInt(dom.detailsModalSeasonSelect.value);
            const episodeNum = parseInt(clickedItem.dataset.episodeNumber);

            if (tvId && type === 'tv' && seasonNum && episodeNum) {
                this.#openPlayer(tvId, type, seasonNum, episodeNum, this.#currentModalItem);
                this.#closeDetailsModal();
            } else {
                console.error('Dados insuficientes para tocar o episódio.', { tvId, type, seasonNum, episodeNum });
            }
        } catch (error) {
            console.error('Erro ao tentar tocar o episódio:', error);
        }
    }

    #handleModalPlayClick() {
        if (!this.#currentModalItem) return;

        let season = 1;
        let episode = 1;
        const type = this.#currentModalItem.media_type;

        if (type === 'tv' && !dom.seriesSeasonsContainer.classList.contains('hidden')) {
            season = parseInt(dom.detailsModalSeasonSelect.value) || 1;
            const selectedEpisodeEl = dom.detailsModalEpisodesList.querySelector('li.active');
            episode = selectedEpisodeEl ? parseInt(selectedEpisodeEl.dataset.episodeNumber) : 1;
        }

        this.#openPlayer(this.#currentModalItem.id, type, season, episode, this.#currentModalItem);
        this.#closeDetailsModal();
    }

    #handleModalTrailerClick() {
        if (this.#currentModalItem) {
            this.#currentPlayerItem = this.#currentModalItem; 
            this.#fetchAndPlayTrailer(this.#currentModalItem.id, this.#currentModalItem.media_type);
            this.#closeDetailsModal();
        }
    }

    async #handleSeasonChange(event) {
        if (this.#currentModalItem && this.#currentModalItem.media_type === 'tv') {
            const seasonNumber = parseInt(event.target.value);
            await this.#displayEpisodesForSeason(
                this.#currentModalItem.id, 
                seasonNumber, 
                dom.detailsModalEpisodesList,
                this.#currentModalItem.fullSeasonsData
            );
        }
    }

    async #openDetailsModal(id, type) {
        this.#currentModalItem = null;
        let details = null, credits = null, videos = null, certifications = null;

        try {
            const requests = [fetchTMDB(`/${type}/${id}`)];
            requests.push(fetchTMDB(`/${type}/${id}/credits`));
            requests.push(fetchTMDB(`/${type}/${id}/videos`));
            if (type === 'movie') requests.push(fetchTMDB(`/movie/${id}/release_dates`));
            else requests.push(fetchTMDB(`/tv/${id}/content_ratings`));

            const [detailsData, creditsData, videosData, certData] = await Promise.all(requests);

            details = detailsData;
            credits = creditsData;
            videos = videosData;
            certifications = certData;

            if (!details) throw new Error("Não foi possível carregar os detalhes.");

            this.#currentModalItem = {
                ...details,
                media_type: type,
                fullCreditsData: credits,
                fullVideosData: videos,
                fullSeasonsData: details.seasons
            };
            
            this.#updateMyListButtonIcon(id, type);
            
            dom.detailsModalBackdropImage.style.backgroundImage = `url(${IMG_BASE_URL}${details.backdrop_path || details.poster_path})`;
            dom.detailsModalTitle.textContent = details.title || details.name;
            dom.detailsModalOverview.textContent = details.overview || "Nenhuma descrição disponível.";
            const voteAverage = details.vote_average ? (details.vote_average * 10).toFixed(0) : '--';
            dom.detailsModalRating.textContent = `${voteAverage}% relevante`;
            const date = details.release_date || details.first_air_date;
            dom.detailsModalReleaseDate.textContent = date ? new Date(date).getFullYear() : '----';
            if (type === 'movie' && details.runtime) {
                const hours = Math.floor(details.runtime / 60);
                const minutes = details.runtime % 60;
                dom.detailsModalRuntime.textContent = `${hours}h ${minutes}min`;
                dom.detailsModalRuntime.classList.remove('hidden');
                dom.detailsModalSeasons.classList.add('hidden');
            } else if (type === 'tv' && details.number_of_seasons) {
                dom.detailsModalRuntime.classList.add('hidden');
                dom.detailsModalSeasons.textContent = `${details.number_of_seasons} Temporada${details.number_of_seasons > 1 ? 's' : ''}`;
                dom.detailsModalSeasons.classList.remove('hidden');
            } else {
                dom.detailsModalRuntime.classList.add('hidden');
                dom.detailsModalSeasons.classList.add('hidden');
            }
            dom.detailsModalAgeRating.textContent = this.#getAgeRating(certifications, type);
            dom.detailsModalCast.textContent = (credits?.cast?.length > 0) ? credits.cast.slice(0, 3).map(c => c.name).join(', ') : 'Não disponível';
            dom.detailsModalGenres.textContent = (details.genres?.length > 0) ? details.genres.map(g => g.name).join(', ') : 'Não especificado';
            dom.detailsModalTags.textContent = details.tagline || (details.overview ? details.overview.split(' ').slice(0, 6).join(' ') + '...' : 'Não especificado');


            if (type === 'tv' && details.seasons && details.seasons.length > 0) {
                dom.seriesSeasonsContainer.classList.remove('hidden');
                dom.detailsModalSeasonSelect.innerHTML = '';

                const validSeasons = details.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);

                validSeasons.forEach(season => {
                    const option = document.createElement('option');
                    option.value = season.season_number;
                    option.textContent = `Temporada ${season.season_number} (${season.episode_count} ep.)`;
                    dom.detailsModalSeasonSelect.appendChild(option);
                });

                if (validSeasons.length > 0) {
                    const defaultSeason = validSeasons[0].season_number;
                    dom.detailsModalSeasonSelect.value = defaultSeason;
                    await this.#displayEpisodesForSeason(
                        id, 
                        defaultSeason, 
                        dom.detailsModalEpisodesList,
                        this.#currentModalItem.fullSeasonsData
                    ); 
                } else {
                     dom.detailsModalEpisodesList.innerHTML = '<li class="text-gray-500 p-2">Nenhuma temporada com episódios disponível.</li>';
                }
            } else {
                dom.seriesSeasonsContainer.classList.add('hidden');
                 dom.detailsModalEpisodesList.innerHTML = '';
                 dom.detailsModalSeasonSelect.innerHTML = '';
            }

            dom.detailsModal.classList.remove('hidden');
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            if (window.lucide) { lucide.createIcons(); }

        } catch (error) {
            console.error("Erro ao abrir modal de detalhes:", error);
            alert("Não foi possível carregar os detalhes. Verifique a conexão ou tente novamente.");
            this.#closeDetailsModal();
        }
    }

    #getAgeRating(certifications, type) {
        let ageRating = 'L';
        if (certifications && certifications.results) {
            let brRatingData;
            if (type === 'movie') {
                brRatingData = certifications.results.find(res => res.iso_3166_1 === 'BR');
                if (brRatingData && brRatingData.release_dates?.length > 0) {
                     ageRating = brRatingData.release_dates.find(rd => rd.certification)?.certification || 'L';
                }
            } else if (type === 'tv') {
                brRatingData = certifications.results.find(res => res.iso_3166_1 === 'BR');
                if (brRatingData) ageRating = brRatingData.rating || 'L';
            }
        }
         if (ageRating && !isNaN(parseInt(ageRating))) {
             return `${ageRating}`;
         }
         return ageRating === '' ? 'L' : ageRating;
    }

    async #displayEpisodesForSeason(tvId, seasonNumber, listElement, seasonsData) {
        listElement.innerHTML = '<li class="text-gray-500 p-2">Carregando episódios...</li>';

        let season = seasonsData?.find(s => s.season_number === seasonNumber);
        let episodes = season?.episodes; // Tenta pegar episódios cacheados

        if (season && !episodes) {
             console.log(`[#displayEpisodesForSeason] Buscando detalhes da temporada ${seasonNumber} da API...`);
             try {
                const seasonDetails = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
                if (seasonDetails && seasonDetails.episodes) {
                    episodes = seasonDetails.episodes;
                    season.episodes = episodes;
                }
             } catch (error) {
                 console.error(`Erro ao buscar detalhes da temporada ${seasonNumber}:`, error);
                 episodes = null;
             }
        }

        listElement.innerHTML = ''; // Limpa a lista

        if (episodes && episodes.length > 0) {
            episodes.forEach(episode => {
                const listItem = document.createElement('li');
                listItem.className = 'episode-item';
                listItem.dataset.episodeNumber = episode.episode_number;

                if (episode.episode_number === 1) listItem.classList.add('active');

                const placeholderImg = 'https://placehold.co/120x70/181818/333?text=EP';
                const imgSrc = episode.still_path ? `${IMG_POSTER_URL}${episode.still_path}` : placeholderImg;

                listItem.innerHTML = `
                    <div class="flex-shrink-0 text-gray-500 text-lg font-semibold w-8 text-center">${episode.episode_number}</div>
                    <img src="${imgSrc}" alt="Episódio ${episode.episode_number}" class="episode-thumbnail" onerror="this.src='${placeholderImg}'">
                    <div class="flex-grow">
                        <h5 class="text-white text-base font-semibold mb-1">${episode.name || `Episódio ${episode.episode_number}`}</h5>
                        <p class="text-gray-400 text-xs line-clamp-2">${episode.overview || 'Sem descrição.'}</p>
                        <p class="text-gray-500 text-xs mt-1">${episode.runtime ? `${episode.runtime} min` : ''}</p>
                    </div>`;

                listElement.appendChild(listItem);
            });
        } else {
            listElement.innerHTML = '<li class="text-gray-500 p-2">Nenhum episódio encontrado para esta temporada.</li>';
        }
    }

    #closeDetailsModal() {
        dom.detailsModal.classList.add('hidden');
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        this.#currentModalItem = null;
        dom.detailsModalEpisodesList.innerHTML = '';
        dom.detailsModalSeasonSelect.innerHTML = '';
        
        dom.detailsModalTitle.textContent = 'Carregando...';
        dom.detailsModalOverview.textContent = '';
        dom.detailsModalBackdropImage.style.backgroundImage = 'none';
        dom.detailsModalRating.textContent = '--%';
        dom.detailsModalReleaseDate.textContent = '----';
        dom.detailsModalRuntime.textContent = '--h --min';
        dom.detailsModalCast.textContent = 'Carregando...';
        dom.detailsModalGenres.textContent = 'Carregando...';
        dom.detailsModalTags.textContent = 'Carregando...';
        
        if (this.#currentBrowseType === 'minha-lista') {
            this.#showMinhaListaPage(null);
        }
    }
}

// ========================================================================
//  INICIALIZAÇÃO DA APLICAÇÃO
// ========================================================================
new FudidoFlixApp();