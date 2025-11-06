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
    
    // ==========================================================
    // MUDANÇA (Perfil): Ação pendente para o modal
    // ==========================================================
    #pendingConfirmationAction = null;


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
        this.#restoreBodyScroll();
        
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

        // Scroll da Navbar e Botão "Voltar ao Topo"
        window.addEventListener('scroll', () => this.#handleNavScroll());
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

        // Busca (agora funciona em mobile e desktop)
        dom.searchButton.addEventListener('click', () => this.#handleSearchClick());
        dom.searchInput.addEventListener('blur', () => this.#handleSearchBlur());
        dom.searchInput.addEventListener('keypress', (e) => this.#handleSearchKeypress(e));

        // ==========================================================
        // MUDANÇA (Perfil): Listeners do Perfil (Desktop)
        // ==========================================================
        dom.profileButton.addEventListener('click', (e) => this.#handleProfileClick(e));
        dom.profileClearListButton.addEventListener('click', () => this.#handleClearList());
        dom.profileClearHistoryButton.addEventListener('click', () => this.#handleClearHistory());
        dom.profileLogoutButton.addEventListener('click', () => this.#handleLogout());

        // Listener global para fechar o menu de perfil
        window.addEventListener('click', (e) => this.#handleWindowClickForProfile(e));
        
        // ==========================================================
        // MUDANÇA (Perfil): Listeners do Modal de Confirmação (NOVO)
        // ==========================================================
        dom.confirmationModalCancelButton.addEventListener('click', () => this.#handleCancelAction());
        dom.confirmationModalConfirmButton.addEventListener('click', () => this.#handleConfirmAction());
        // Fecha se clicar fora do conteúdo
        dom.confirmationModal.addEventListener('click', (e) => {
            if (e.target === dom.confirmationModal) this.#handleCancelAction();
        });

        // ==========================================================
        // MODIFICAÇÃO (Responsividade): Listeners do Menu Hambúrguer
        // ==========================================================
        dom.hamburgerButton.addEventListener('click', () => this.#openMobileMenu());
        dom.mobileMenuCloseButton.addEventListener('click', () => this.#closeMobileMenu());
        dom.mobileMenuOverlay.addEventListener('click', () => this.#closeMobileMenu());
        
        // Listener para os links de navegação <a> dentro do menu mobile
        dom.mobileNav.addEventListener('click', (e) => this.#handleMobileNavClick(e));

        // MODIFICAÇÃO: Listeners para os botões <button> de perfil dentro do menu mobile
        // Eles fecham o menu e chamam a função de confirmação
        dom.mobileClearListButton.addEventListener('click', () => {
            this.#closeMobileMenu();
            setTimeout(() => this.#handleClearList(), 310); // Espera a animação
        });
        dom.mobileClearHistoryButton.addEventListener('click', () => {
            this.#closeMobileMenu();
            setTimeout(() => this.#handleClearHistory(), 310);
        });
        dom.mobileLogoutButton.addEventListener('click', () => {
            this.#closeMobileMenu();
            setTimeout(() => this.#handleLogout(), 310);
        });

        
        // Botão "Voltar ao Topo"
        dom.backToTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    async #initApp() {
        if (window.lucide) {
            lucide.createIcons();
        }
        this.#handleLogoClick(null, true); // Passa true para 'skipTransition'
    }

    #handleNavScroll() {
        // Lógica da Navbar
        if (window.scrollY > 50) {
            dom.mainNav.classList.add('bg-[#141414]', 'shadow-lg');
        } else {
            dom.mainNav.classList.remove('bg-[#141414]', 'shadow-lg');
        }

        // NOVO: Lógica do Botão "Voltar ao Topo"
        if (window.scrollY > 400) {
            dom.backToTopButton.classList.remove('hidden');
            dom.backToTopButton.classList.add('visible');
        } else {
            dom.backToTopButton.classList.remove('visible');
            // Adiciona um delay para esconder, permitindo a animação de fade-out
            setTimeout(() => {
                if (window.scrollY <= 400) { // Verifica novamente
                    dom.backToTopButton.classList.add('hidden');
                }
            }, 300); // Mesmo tempo da transição CSS
        }
    }

    // ==========================================================
    // NOVO (Responsividade): Métodos do Menu Hambúrguer
    // ==========================================================
    
    #isModalOpen() {
        // Verifica se qualquer modal principal está aberto
        return !dom.detailsModal.classList.contains('hidden') ||
               !dom.playerModal.classList.contains('hidden') ||
               !dom.confirmationModal.classList.contains('hidden') ||
               !dom.introModal.classList.contains('hidden');
    }
    
    #lockBodyScroll() {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }

    #restoreBodyScroll() {
        // Só restaura o scroll se nenhum outro modal estiver aberto
        if (!this.#isModalOpen()) {
            document.documentElement.style.overflow = 'auto';
            document.body.style.overflow = 'auto';
        }
    }

    #openMobileMenu() {
        dom.mobileMenuOverlay.classList.remove('hidden');
        dom.mobileMenuPanel.classList.add('open');
        this.#lockBodyScroll(); // Trava o scroll do body
        // Recria ícones lucide dentro do painel
        if (window.lucide) {
            lucide.createIcons({
                nodes: dom.mobileMenuPanel.querySelectorAll('[data-lucide]')
            });
        }
    }

    #closeMobileMenu() {
        dom.mobileMenuPanel.classList.remove('open');
        // Adiciona um delay para esconder o overlay, permitindo a animação de saida
        setTimeout(() => {
            dom.mobileMenuOverlay.classList.add('hidden');
        }, 300);
        this.#restoreBodyScroll(); // Restaura o scroll
    }

    // ==========================================================
    // MODIFICAÇÃO: Lógica de clique do menu mobile (só para links <a>)
    // ==========================================================
    #handleMobileNavClick(event) {
        // Esta função agora SÓ lida com cliques em links <a>
        const link = event.target.closest('a');
        if (!link) {
            // Se não for um <a>, é um <button> (Perfil), que é
            // tratado por seus próprios listeners. Não faz nada aqui.
            return;
        }

        event.preventDefault(); // Previne a ação padrão

        // Pega o ID do link mobile (ex: "nav-inicio-mobile")
        // Remove "-mobile" para achar o ID do link desktop (ex: "nav-inicio")
        const desktopLinkId = link.id.replace('-mobile', '');
        const desktopLink = document.getElementById(desktopLinkId);
        
        if (desktopLink) {
            // Simula o clique no link desktop, reutilizando toda a lógica existente
            desktopLink.click();
        }
        
        // Fecha o menu
        this.#closeMobileMenu();
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
                this.#currentGenre = '16&with_keywords=210024';
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
        // Desktop
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

        // Mobile
        dom.mobileNav.querySelectorAll('a').forEach(link => {
             link.classList.remove('text-[#E50914]', 'bg-gray-800');
        });
        if (activeLink) {
             const mobileLink = document.getElementById(activeLink.id + '-mobile');
             if (mobileLink) {
                 mobileLink.classList.add('text-[#E50914]', 'bg-gray-800');
             }
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
            this.#currentGenre = '16&with_keywords=210024';
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
    //  LÓGICA DO MENU DE PERFIL (MODIFICADA)
    // ========================================================================

    #handleProfileClick(event) {
        event.stopPropagation(); // Impede que o 'window' click feche o menu imediatamente
        dom.profileMenu.classList.toggle('hidden');
        if (window.lucide) {
            lucide.createIcons({
                nodes: dom.profileMenu.querySelectorAll('[data-lucide]')
            });
        }
    }
    
    #handleWindowClickForProfile(event) {
        // Se o menu não estiver visível, não faz nada
        if (dom.profileMenu.classList.contains('hidden')) {
            return;
        }
        
        // Se o clique foi DENTRO do botão de perfil ou DENTRO do menu, não faz nada
        if (dom.profileButton.contains(event.target) || dom.profileMenu.contains(event.target)) {
            return;
        }

        // Se o clique foi fora, esconde o menu
        dom.profileMenu.classList.add('hidden');
    }
    
    // --- Lógica do Novo Modal de Confirmação ---

    #showConfirmationModal(title, message, action) {
        this.#pendingConfirmationAction = action;
        dom.confirmationModalTitle.textContent = title;
        dom.confirmationModalMessage.textContent = message;
        dom.confirmationModal.classList.remove('hidden');
        
        // Trava o scroll
        this.#lockBodyScroll();
    }

    #closeConfirmationModal() {
        this.#pendingConfirmationAction = null;
        dom.confirmationModal.classList.add('hidden');
        
        // Restaura o scroll
        this.#restoreBodyScroll();
    }

    #handleCancelAction() {
        this.#closeConfirmationModal();
    }

    #handleConfirmAction() {
        const action = this.#pendingConfirmationAction;
        this.#closeConfirmationModal(); // Fecha o modal de confirmação
        dom.profileMenu.classList.add('hidden'); // Esconde o menu de perfil

        // Executa a ação pendente
        switch (action) {
            case 'clearList':
                Storage.clearMyList();
                // alert("Minha Lista foi limpa."); // <--- REMOVIDO
                if (this.#currentBrowseType === 'minha-lista') {
                    this.#showMinhaListaPage(null);
                }
                break;
            case 'clearHistory':
                Storage.clearAllHistory();
                // alert("Seu histórico foi limpo."); // <--- REMOVIDO
                if (this.#currentBrowseType === 'default') {
                    this.#fetchAndDisplayRows(categories.default);
                }
                break;
            case 'logout':
                sessionStorage.removeItem('fudidoFlixAccess');
                window.location.replace('index.html');
                break;
        }
    }

    // --- Fim da Lógica do Modal ---


    #handleClearList() {
        // Substitui o confirm()
        this.#showConfirmationModal(
            'Limpar Minha Lista',
            'Tem certeza que deseja limpar TODA a sua lista? Esta ação não pode ser desfeita.',
            'clearList'
        );
    }

    #handleClearHistory() {
        // Substitui o confirm()
        this.#showConfirmationModal(
            'Limpar Histórico',
            'Tem certeza que deseja limpar TODO o seu histórico de visualização? Esta ação não pode ser desfeita.',
            'clearHistory'
        );
    }

    #handleLogout() {
        // Substitui o confirm()
        this.#showConfirmationModal(
            'Deslogar da Sessão',
            'Tem certeza que deseja sair da sua sessão?',
            'logout'
        );
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