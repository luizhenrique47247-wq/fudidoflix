/**
 * Classe principal da aplicação FUDIDOFLIX.
 * Organiza toda a lógica, seletores de DOM e ouvintes de eventos.
 */

// Importa os módulos separados
import { dom } from './dom.js';
import { categories } from './config.js';
// ==========================================================
// MUDANÇA (Refatoração): Imports de API e Config removidos
// pois agora estão em 'contentFetcher' e 'uiBuilder'
// ==========================================================
import { SortePage } from './sorte.js';
import * as Storage from './storageService.js';
import { ModalManager } from './ModalManager.js';
import { UIBuilder } from './UIBuilder.js';
// ==========================================================
// MUDANÇA (Refatoração): Importa o novo ContentFetcher
// ==========================================================
import * as Content from './contentFetcher.js';


// Chave da Intro
const INTRO_WATCHED_KEY = 'fudidoFlixIntroWatched';

class FudidoFlixApp {
    // ========================================================================
    //  PROPRIEDADES DA CLASSE
    // ========================================================================
    
    #currentHeroItem = null; // Armazena dados do item no hero
    #sortePage = null;
    #modalManager = null;
    #uiBuilder = null;
    // ==========================================================
    // MUDANÇA (Refatoração): Propriedade do ContentFetcher
    // (Não precisamos de uma propriedade, pois ele só exporta funções)
    // ==========================================================

    // Estado da página "Browse"
    #currentBrowseType = 'default';
    #currentPage = 1;
    #isFetching = false;

    // Filtros de "Browse" (O App continua sendo o dono do estado)
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
        // Instancia os gerenciadores
        this.#modalManager = new ModalManager(this, dom);
        this.#uiBuilder = new UIBuilder(this.#modalManager);
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

        // Busca
        dom.searchButton.addEventListener('click', () => this.#handleSearchClick());
        dom.searchInput.addEventListener('blur', () => this.#handleSearchBlur());
        dom.searchInput.addEventListener('keypress', (e) => this.#handleSearchKeypress(e));
    }

    async #initApp() {
        if (window.lucide) {
            lucide.createIcons();
        }
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
    //  NAVEGAÇÃO E EXIBIÇÃO DE PÁGINAS
    // ========================================================================

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

            // 1. Constrói o Header
            const headerElement = this.#uiBuilder.buildBrowseHeader(
                title, 
                type, 
                () => this.#handleFilterChange() // Passa a função de callback
            );
            dom.contentRowsContainer.appendChild(headerElement);

            // 2. Prepara o container da grade
            const gridContainer = document.createElement('div');
            gridContainer.id = 'browse-grid';
            gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8';
            dom.contentRowsContainer.appendChild(gridContainer);

            // 3. Busca os dados e popula
            this.#fetchAndDisplayGrid();

            // 4. Define o link ativo
            let activeLink = null;
            if (type === 'tv') activeLink = dom.navSeries;
            if (type === 'movie') activeLink = dom.navFilmes;
            if (type === 'anime') activeLink = dom.navAnimes;
            this.#setActiveNavLink(activeLink);
        };

        this.#handlePageTransition(pageLogic);
    }

    #showMinhaListaPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'minha-lista';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = ''; // Limpa o container
            this.#setActiveNavLink(dom.navMinhaLista);
            
            const myList = Storage.getMyList();

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
                    const gridItem = this.#uiBuilder.buildGridItem(item, 'movie');
                    gridContainer.appendChild(gridItem);
                }
            });

            dom.contentRowsContainer.appendChild(gridContainer);
            if (window.lucide) { lucide.createIcons(); }
        };

        this.#handlePageTransition(pageLogic);
    }

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
            link.classList.remove('text-[#E50914]');
            if (!link.classList.contains('hover:text-gray-300')) {
                link.classList.add('hover:text-gray-300');
            }
        });
        if (activeLink) {
            activeLink.classList.add('text-[#E50914]');
            activeLink.classList.remove('hover:text-gray-300');
        }
    }

    // ========================================================================
    //  BUSCA E EXIBIÇÃO DE CONTEÚDO (HERO, FILEIRAS, GRID)
    // ========================================================================

    // ==========================================================
    // MUDANÇA (Refatoração): Lógica de busca movida
    // ==========================================================
    async #fetchAndDisplayHero() {
        this.#currentHeroItem = null;
        const item = await Content.fetchHeroData(); // 1. Busca

        if (item) {
            this.#currentHeroItem = item; 
            this.#uiBuilder.populateHero(item, dom); // 2. Constrói
        } else {
            dom.heroTitle.textContent = "Não foi possível carregar o destaque";
            dom.heroOverview.textContent = "Verifique sua conexão ou a chave da API.";
        }
    }

    // ==========================================================
    // MUDANÇA (Refatoração): Lógica de busca movida
    // ==========================================================
    async #fetchAndDisplayRows(categoriesToShow) {
        dom.contentRowsContainer.innerHTML = '';

        for (const category of categoriesToShow) {
            let items = [];

            if (category.endpoint === 'localstorage' && category.title === "Últimos Assistidos") {
                items = Storage.getWatchedHistory(); // Busca do Storage
                if (items.length === 0) {
                     continue;
                }
            } else if (category.endpoint) {
                items = await Content.fetchRowData(category.endpoint); // 1. Busca
            }

            if (items.length > 0) {
                const rowElement = this.#uiBuilder.buildCarousel(category.title, items); // 2. Constrói
                dom.contentRowsContainer.appendChild(rowElement); // 3. Insere
            } else {
                 console.warn(`Nenhum item encontrado ou erro ao carregar: ${category.title}`);
            }
        }
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // ========================================================================
    //  LÓGICA DA PÁGINA "EXPLORAR" (BROWSE) E BUSCA
    // ========================================================================

    #handleFilterChange() {
        this.#resetBrowseState(); // Reseta o estado local
        this.#currentPage = 1;

        // Atualiza o estado local com base nos seletores
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

        // Limpa a grade e busca novamente
        const gridContainer = document.getElementById('browse-grid');
        if (gridContainer) gridContainer.innerHTML = '';
        this.#fetchAndDisplayGrid();
    }

    // ==========================================================
    // MUDANÇA (Refatoração): Lógica de busca movida
    // ==========================================================
    async #fetchAndDisplayGrid() {
        if (this.#isFetching) return;
        this.#isFetching = true;

        const gridContainer = document.getElementById('browse-grid');
        if (!gridContainer) {
            this.#isFetching = false;
            return;
        }

        let typeForEndpoint = (this.#currentBrowseType === 'anime') ? 'tv' : this.#currentBrowseType;

        // 1. Prepara o objeto de filtros (estado)
        const filters = {
            type: typeForEndpoint,
            page: this.#currentPage,
            sortBy: this.#currentSortBy,
            genre: this.#currentGenre,
            provider: this.#currentProvider,
            company: this.#currentCompany,
            keyword: this.#currentKeyword,
            country: this.#currentCountry,
            era: this.#currentEra,
            eraType: this.#currentEraType
        };

        // 2. Busca os dados
        const data = await Content.fetchGridData(filters);

        // 3. Constrói e insere
        if (data && data.results) {
            data.results.forEach(item => {
                if (item.poster_path) {
                    const gridItem = this.#uiBuilder.buildGridItem(item, typeForEndpoint);
                    gridContainer.appendChild(gridItem);
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
    // MUDANÇA (Refatoração): Lógica de busca movida
    // ==========================================================
    async #performSearch(query) {
        const pageLogic = async () => {
            this.#currentBrowseType = 'search';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = '<p class="text-gray-400 text-lg pt-24">Buscando...</p>';
            this.#setActiveNavLink(null);

            // 1. Busca
            const data = await Content.fetchSearchData(query);

            dom.contentRowsContainer.innerHTML = ''; // Limpa o "Buscando..."

            // 2. Constrói
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
                        const gridItem = this.#uiBuilder.buildGridItem(item, 'movie');
                        gridContainer.appendChild(gridItem);
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
    //  MÉTODOS PÚBLICOS (para SortePage)
    // ========================================================================
    
    /**
     * Wrapper PÚBLICO para permitir que SortePage chame o ModalManager
     * @param {string} id O ID do filme ou série
     * @param {string} type 'movie' ou 'tv'
     */
    publicOpenDetailsModal(id, type) {
        this.#modalManager.openDetailsModal(id, type);
    }

    /**
     * Callback para o ModalManager informar o app que o player fechou.
     */
    onPlayerClose() {
        if (this.#currentBrowseType === 'default') {
            this.#fetchAndDisplayRows(categories.default);
        }
    }

    /**
     * Callback para o ModalManager informar o app que o modal de detalhes fechou.
     */
    onModalClose() {
        if (this.#currentBrowseType === 'minha-lista') {
            this.#showMinhaListaPage(null);
        }
    }
}

// ========================================================================
//  INICIALIZAÇÃO DA APLICAÇÃO
// ========================================================================
new FudidoFlixApp();