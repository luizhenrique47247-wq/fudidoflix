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


    // ==========================================================
    // MUDANÇA (Notificações): Estado do Toast
    // ==========================================================
    #toastTimeout = null;


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
    // ==========================================================
    // MUDANÇA (Req 2): Função agora é async
    // ==========================================================
    async #initializeApp() {
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

        // ==========================================================
        // MUDANÇA (Notificações / Req 2): Lógica de verificação e toast
        // ==========================================================
        
        // 1. Roda a verificação (pode adicionar novos eps ao storage)
        await this.#runNotificationCheck();
        
        // 2. Atualiza a UI do sino com o que já está no storage
        this.#updateNotificationUI();
        
        // 3. Mostra o toast se houver *qualquer* ep novo no storage
        const inbox = Storage.getInbox();
        // MUDANÇA: Verifica o inbox.length total, não apenas newEps
        if (inbox.length > 0) {
            this.#showNotificationToast(inbox.length);
        }
        // ==========================================================
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
        // MUDANÇA (Notificações): Listeners do Sino e Toast
        // ==========================================================
        dom.notificationButton.addEventListener('click', (e) => this.#handleNotificationClick(e));
        dom.notificationMenu.addEventListener('click', (e) => this.#handleNotificationItemClick(e));
        dom.notificationClearAll.addEventListener('click', () => this.#handleClearAllNotifications());
        dom.notificationToastClose.addEventListener('click', () => this.#hideNotificationToast());


        // ==========================================================
        // MUDANÇA (Perfil): Listeners do Perfil (Desktop)
        // ==========================================================
        dom.profileButton.addEventListener('click', (e) => this.#handleProfileClick(e));
        dom.profileClearListButton.addEventListener('click', () => this.#handleClearList());
        dom.profileClearHistoryButton.addEventListener('click', () => this.#handleClearHistory());
        dom.profileLogoutButton.addEventListener('click', () => this.#handleLogout());

        // Listener global para fechar o menu de perfil
        window.addEventListener('click', (e) => this.#handleWindowClickForMenus(e));
        
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

    // ==========================================================
    // MUDANÇA (Minha Lista / Continuar Assistindo): Página reescrita
    // ==========================================================
    #showMinhaListaPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'minha-lista';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = ''; // Limpa o container
            this.#setActiveNavLink(dom.navMinhaLista);
            
            const myList = Storage.getMyList();
            // MUDANÇA (Req 1/3): Usa a *nova* lista
            const historyList = Storage.getContinueWatchingList();

            // --- Cria a estrutura principal da grade (2 colunas em telas grandes) ---
            const mainContainer = document.createElement('div');
            mainContainer.className = 'pt-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16';
            
            // --- Coluna da Esquerda: Minha Lista ---
            const myListContainer = document.createElement('div');
            
            const myListTitle = document.createElement('h2');
            myListTitle.className = 'text-3xl font-bold mb-6';
            myListTitle.textContent = 'Minha Lista';
            myListContainer.appendChild(myListTitle);

            if (myList.length === 0) {
                myListContainer.innerHTML += `<p class="text-gray-400 mt-4">Sua lista está vazia. Adicione filmes e séries para vê-los aqui.</p>`;
            } else {
                const myListGrid = document.createElement('div');
                // Grid responsivo com 3 colunas em 'sm' e 'md' (ocupa meia tela no 'lg')
                myListGrid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-4';
                
                myList.forEach(item => {
                    if (item.poster_path) {
                        const gridItem = this.#uiBuilder.buildGridItem(item, item.type || 'movie');
                        myListGrid.appendChild(gridItem);
                    }
                });
                myListContainer.appendChild(myListGrid);
            }
            
            // --- Coluna da Direita: Continuar Assistindo ---
            const historyContainer = document.createElement('div');
            
            const historyTitle = document.createElement('h2');
            historyTitle.className = 'text-3xl font-bold mb-6';
            historyTitle.textContent = 'Continuar Assistindo';
            historyContainer.appendChild(historyTitle);

            if (historyList.length === 0) {
                historyContainer.innerHTML += `<p class="text-gray-400 mt-4">Você ainda não assistiu nada. Seu histórico aparecerá aqui.</p>`;
            } else {
                const historyGrid = document.createElement('div');
                // Grid responsivo com 3 colunas em 'sm' e 'md' (ocupa meia tela no 'lg')
                historyGrid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-4';
                
                historyList.forEach(item => {
                    if (item.poster_path) {
                        // MUDANÇA (Req 3): Passa 'showRemoveButton: true'
                        const gridItem = this.#uiBuilder.buildGridItem(item, item.type || 'movie', { showRemoveButton: true });
                        historyGrid.appendChild(gridItem);
                    }
                });
                historyContainer.appendChild(historyGrid);

                // MUDANÇA (Req 2): Adiciona listener para os botões de remover
                historyGrid.addEventListener('click', (e) => {
                    const removeButton = e.target.closest('.poster-grid-remove-button');
                    if (removeButton) {
                        e.stopPropagation(); // Impede que o modal de detalhes abra
                        const id = Number(removeButton.dataset.id);
                        const title = removeButton.dataset.title || 'este item';
                        
                        // Chama o modal de confirmação
                        this.#showConfirmationModal(
                            'Remover Título', 
                            `Deseja remover "${title}" da sua lista "Continuar Assistindo"?`, 
                            { action: 'removeFromContinue', id: id } // Passa um objeto de ação
                        );
                    }
                });
            }

            // --- Adiciona as colunas ao container principal ---
            mainContainer.appendChild(myListContainer);
            mainContainer.appendChild(historyContainer);
            dom.contentRowsContainer.appendChild(mainContainer);
            
            if (window.lucide) { lucide.createIcons(); }
        };

        this.#handlePageTransition(pageLogic);
    }
    
    // MÉTODO REMOVIDO (não é mais chamado, a lógica está no confirm)
    // #handleRemoveFromHistory(id) { ... }

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
                // MUDANÇA (Req 1/3): "Últimos Assistidos" lê do histórico principal
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
        dom.notificationMenu.classList.add('hidden'); // Esconde o sino
        if (window.lucide) {
            lucide.createIcons({
                nodes: dom.profileMenu.querySelectorAll('[data-lucide]')
            });
        }
    }
    
    // ==========================================================
    // MUDANÇA (Notificações): Atualiza o fechamento de menus
    // ==========================================================
    #handleWindowClickForMenus(event) {
        // Se o menu de perfil não estiver visível, não faz nada
        if (!dom.profileMenu.classList.contains('hidden')) {
             if (!dom.profileButton.contains(event.target) && !dom.profileMenu.contains(event.target)) {
                 dom.profileMenu.classList.add('hidden');
             }
        }
        
        // Se o menu de notificação não estiver visível, não faz nada
        if (!dom.notificationMenu.classList.contains('hidden')) {
             if (!dom.notificationButton.contains(event.target) && !dom.notificationMenu.contains(event.target)) {
                 dom.notificationMenu.classList.add('hidden');
             }
        }
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

    // ==========================================================
    // MUDANÇA (Req 2): #handleConfirmAction agora lida com OBJETOS
    // ==========================================================
    #handleConfirmAction() {
        const actionPayload = this.#pendingConfirmationAction;
        this.#closeConfirmationModal(); // Fecha o modal de confirmação
        dom.profileMenu.classList.add('hidden'); // Esconde o menu de perfil

        let actionType;
        let actionData = null;

        // Verifica se a ação é um string (antigo) ou um objeto (novo)
        if (typeof actionPayload === 'string') {
            actionType = actionPayload;
        } else if (typeof actionPayload === 'object' && actionPayload !== null) {
            actionType = actionPayload.action;
            actionData = actionPayload;
        } else {
            return; // Nenhuma ação válida
        }

        // Executa a ação pendente
        switch (actionType) {
            case 'clearList':
                Storage.clearMyList();
                if (this.#currentBrowseType === 'minha-lista') {
                    this.#showMinhaListaPage(null);
                }
                break;
            case 'clearHistory':
                Storage.clearAllHistory();
                if (this.#currentBrowseType === 'default') {
                    this.#fetchAndDisplayRows(categories.default);
                }
                if (this.#currentBrowseType === 'minha-lista') {
                    this.#showMinhaListaPage(null);
                }
                break;
            case 'logout':
                sessionStorage.removeItem('fudidoFlixAccess');
                window.location.replace('index.html');
                break;
            // MUDANÇA (Req 2/3): Novo case para remover de "Continuar Assistindo"
            case 'removeFromContinue':
                if (actionData && actionData.id) {
                    Storage.removeFromContinueWatching(actionData.id); // Chama a nova função
                    if (this.#currentBrowseType === 'minha-lista') {
                        this.#showMinhaListaPage(null); // Re-renderiza a página
                    }
                }
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
            'Tem certeza que deseja limpar TODO o seu histórico de visualização? (Isso inclui "Últimos Assistidos" e "Continuar Assistindo").',
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

    // ==========================================================
    // MUDANÇA (Notificações): Lógica do Inbox e Toast
    // ==========================================================

    /**
     * Verifica se há novos episódios para as séries em "Minha Lista".
     * Roda 1x por sessão (ou a cada 4 horas).
     */
    async #runNotificationCheck() {
        const lastCheck = Storage.getLastCheck();
        const now = new Date();

        // Se não houver 'lastCheck', define um de 4 horas atrás para não
        // notificar tudo na primeira vez.
        if (!lastCheck) {
            const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));
            Storage.setLastCheck(fourHoursAgo.toISOString());
            console.log("Definindo 'lastCheck' inicial.");
            return;
        }

        const lastCheckDate = new Date(lastCheck);
        const hoursDiff = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);

        // Limite: Só verifica a cada 4 horas
        if (hoursDiff < 4) {
            console.log("Verificação de notificações pulada (menos de 4h).");
            return;
        }

        console.log("Iniciando verificação de novas notificações...");
        
        let newNotificationsFound = [];

        // --- 1. Limpa notificações de lembrete antigas ---
        let currentInbox = Storage.getInbox();
        let newEps = currentInbox.filter(item => item.type === 'new_ep');
        // Sobrescreve o inbox SÓ com os eps novos (limpando lembretes)
        localStorage.setItem('fudidoFlixInbox', JSON.stringify(newEps));

        // --- 2. Verifica NOVOS EPISÓDIOS (lógica original) ---
        const myList = Storage.getMyList();
        const seriesToWatch = myList.filter(item => item.type === 'tv' || item.media_type === 'tv');
        
        if (seriesToWatch.length > 0) {
            for (const series of seriesToWatch) {
                const details = await Content.fetchSeriesDetails(series.id);
                
                if (details && details.last_episode_to_air && details.last_episode_to_air.air_date) {
                    const lastEpDate = new Date(details.last_episode_to_air.air_date);

                    if (lastEpDate > lastCheckDate) {
                        const ep = details.last_episode_to_air;
                        const notification = {
                            type: 'new_ep', // Tipo
                            seriesId: details.id,
                            seriesName: details.name,
                            season: ep.season_number,
                            episode: ep.episode_number,
                            uniqueId: `${details.id}-S${ep.season_number}-E${ep.episode_number}`
                        };
                        
                        Storage.saveToInbox(notification);
                        newNotificationsFound.push(notification);
                    }
                }
            }
        }
        
        // --- 3. Adiciona Lembrete de "Continuar Assistindo" ---
        // MUDANÇA (Req 1/3): Lê da nova lista
        const continueList = Storage.getContinueWatchingList();
        const watchedEpisodes = Storage.getWatchedEpisodes();
        const tvHistory = continueList.filter(h => h.type === 'tv' || h.media_type === 'tv');

        if (tvHistory.length > 0) {
            const lastWatchedSeries = tvHistory[0]; // Pega a série mais recente
            const lastEp = watchedEpisodes.find(ep => ep.id === lastWatchedSeries.id); // Pega o último ep assistido

            if(lastEp) {
                const notification = {
                    type: 'continue_watching',
                    seriesId: lastWatchedSeries.id,
                    seriesName: lastWatchedSeries.title,
                    season: lastEp.season,
                    episode: lastEp.episode + 1, // Sugere o *próximo*
                    uniqueId: `continue-${lastWatchedSeries.id}` // ID único de lembrete
                };
                Storage.saveToInbox(notification);
                // Não adiciona ao 'newNotificationsFound' para o toast não contar
            }
        }
        
        // --- 4. Adiciona Lembrete de "Minha Lista" ---
        if (myList.length > 0) {
            const randomItem = myList[Math.floor(Math.random() * myList.length)];
            const notification = {
                type: 'my_list_reminder',
                seriesId: randomItem.id, // Usamos 'seriesId' e 'seriesName' para consistência
                seriesName: randomItem.title || randomItem.name,
                itemType: randomItem.type || randomItem.media_type,
                uniqueId: `reminder-${randomItem.id}` // ID único de lembrete
            };
            Storage.saveToInbox(notification);
            // Não adiciona ao 'newNotificationsFound'
        }

        // --- 5. Finaliza ---
        Storage.setLastCheck(); // Marca a verificação como concluída

        if (newNotificationsFound.length > 0) {
            console.log(`Novas notificações encontradas: ${newNotificationsFound.length}`);
            // MUDANÇA (Req 2): Toast foi movido para #initializeApp
            // this.#showNotificationToast(newNotificationsFound.length);
        } else {
            console.log("Nenhuma notificação nova (de episódio) encontrada.");
        }

        // MUDANÇA (Req 2): Atualização da UI movida para #initializeApp
        // this.#updateNotificationUI();
    }

    /**
     * Mostra ou esconde o menu de notificações (sino).
     */
    #handleNotificationClick(event) {
        event.stopPropagation();
        dom.notificationMenu.classList.toggle('hidden');
        dom.profileMenu.classList.add('hidden'); // Esconde o perfil
        
        // Recria ícones se estiver abrindo
        if (!dom.notificationMenu.classList.contains('hidden')) {
            if (window.lucide) {
                lucide.createIcons({
                    nodes: dom.notificationMenu.querySelectorAll('[data-lucide]')
                });
            }
        }
    }

    /**
     * Lida com cliques dentro do menu de notificações (delegação).
     */
    #handleNotificationItemClick(event) {
        const clearButton = event.target.closest('.notification-clear-item');
        const link = event.target.closest('.notification-item-link');

        if (clearButton) {
            event.stopPropagation(); // Impede que o link seja clicado
            const uniqueId = clearButton.dataset.uid;
            Storage.removeFromInbox(uniqueId);
            this.#updateNotificationUI(); // Re-renderiza a lista
            return;
        }
        
        if (link) {
            event.preventDefault();
            const seriesId = link.dataset.id;
            const itemType = link.dataset.type || 'tv'; // Pega o tipo (padrão 'tv')

            // ==========================================================
            // MUDANÇA (Req 1): Remove a notificação ao clicar
            // ==========================================================
            const parentLi = link.closest('.notification-item');
            if (parentLi) {
                const btn = parentLi.querySelector('.notification-clear-item');
                if (btn) {
                    const uniqueId = btn.dataset.uid;
                    Storage.removeFromInbox(uniqueId);
                    this.#updateNotificationUI(); // Re-renderiza imediatamente
                }
            }
            // ==========================================================

            this.publicOpenDetailsModal(seriesId, itemType);
            dom.notificationMenu.classList.add('hidden'); // Fecha o menu
            return;
        }
    }

    /**
     * Limpa todas as notificações do Inbox.
     */
    #handleClearAllNotifications() {
        Storage.clearInbox();
        this.#updateNotificationUI(); // Re-renderiza a lista (que ficará vazia)
    }
    
    /**
     * Lê o Storage e atualiza a UI do sino (badge e lista).
     */
    #updateNotificationUI() {
        const inbox = Storage.getInbox();
        
        // ==========================================================
        // MUDANÇA (Ajuste Fino): Badge conta TUDO
        // ==========================================================
        if (inbox.length > 0) {
            dom.notificationBadge.classList.remove('hidden');
            // MUDANÇA (Req 1): Remove referência ao badge mobile
        } else {
            dom.notificationBadge.classList.add('hidden');
            // MUDANÇA (Req 1): Remove referência ao badge mobile
        }
        // ==========================================================

        // 2. Atualiza a Lista
        dom.notificationList.innerHTML = ''; // Limpa
        
        if (inbox.length === 0) {
            dom.notificationList.innerHTML = `
                <li id="notification-list-empty">Você está em dia!</li>
            `;
            return;
        }

        // MUDANÇA (Req 2): Mapeia prioridades e ordena o inbox
        const priority = { 'new_ep': 1, 'continue_watching': 2, 'my_list_reminder': 3 };
        const sortedInbox = inbox.sort((a, b) => {
            const priorityA = priority[a.type] || 99;
            const priorityB = priority[b.type] || 99;
            return priorityA - priorityB;
        });

        sortedInbox.forEach(item => {
            const li = document.createElement('li');
            li.className = 'notification-item';
            
            let html = '';
            
            switch (item.type) {
                case 'new_ep':
                    // MUDANÇA (Req 1): Remove S/E
                    html = `
                        <a href="#" class="notification-item-link" data-id="${item.seriesId}" data-type="tv">
                            <strong class="new-ep">Novo Ep:</strong> ${item.seriesName}
                        </a>`;
                    break;
                case 'continue_watching':
                    // MUDANÇA (Req 1): Remove S/E
                     html = `
                        <a href="#" class="notification-item-link" data-id="${item.seriesId}" data-type="tv">
                            <strong class="continue">Continue:</strong> ${item.seriesName}
                        </a>`;
                    break;
                case 'my_list_reminder':
                     html = `
                        <a href="#" class="notification-item-link" data-id="${item.seriesId}" data-type="${item.itemType}">
                            <strong class="my-list">Da sua lista:</strong> ${item.seriesName}
                        </a>`;
                    break;
                default:
                    return; // Pula item desconhecido
            }
            
            html += `
                <button class="notification-clear-item" data-uid="${item.uniqueId}" aria-label="Limpar notificação">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>`;
                
            li.innerHTML = html;
            dom.notificationList.appendChild(li);
        });
        
        // Recria ícones (apenas para os 'X' se o menu estiver visível)
        if (!dom.notificationMenu.classList.contains('hidden')) {
             if (window.lucide) {
                lucide.createIcons({
                    nodes: dom.notificationList.querySelectorAll('[data-lucide]')
                });
            }
        }
    }

    /**
     * Mostra o pop-up (toast) de notificação.
     * @param {number} count - O número de novidades.
     */
    #showNotificationToast(count) {
        if (this.#toastTimeout) clearTimeout(this.#toastTimeout);

        // ==========================================================
        // MUDANÇA (Ajuste Fino): Mensagem genérica
        // ==========================================================
        const message = (count === 1) 
            ? `Você tem 1 novidade! Confira no sino.`
            : `Você tem ${count} novidades! Confira no sino.`;
        // ==========================================================
        
        dom.notificationToastMessage.textContent = message;
        dom.notificationToast.classList.remove('hidden');
        
        // Força o navegador a aplicar a classe 'hidden' antes de 'visible'
        setTimeout(() => {
            dom.notificationToast.classList.add('visible');
            if (window.lucide) {
                lucide.createIcons({
                    nodes: dom.notificationToast.querySelectorAll('[data-lucide]')
                });
            }
        }, 10); // Pequeno delay

        // Esconde automaticamente após 5 segundos
        this.#toastTimeout = setTimeout(() => {
            this.#hideNotificationToast();
        }, 5000);
    }

    /**
     * Esconde o pop-up (toast) de notificação.
     */
    #hideNotificationToast() {
        if (this.#toastTimeout) clearTimeout(this.#toastTimeout);
        
        dom.notificationToast.classList.remove('visible');
        // Adiciona um delay para esconder, permitindo a animação de fade-out
        setTimeout(() => {
            dom.notificationToast.classList.add('hidden');
        }, 300); // Mesmo tempo da transição CSS
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
        // MUDANÇA: Atualiza a pág "Minha Lista" se estiver nela
        if (this.#currentBrowseType === 'minha-lista') {
            this.#showMinhaListaPage(null);
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