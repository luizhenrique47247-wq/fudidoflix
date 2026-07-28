/**
 * Classe principal da aplicação FUDIDOFLIX.
 * Organiza toda a lógica, seletores de DOM e ouvintes de eventos.
 */

import { dom } from './dom.js';
import { categories } from './config.js';

import { SortePage } from './sorte.js';
import { CalendarioPage } from './calendario.js'; 
import { AoVivoPage } from './aovivo.js';         
import { MangasPage } from './mangas.js';

import * as Storage from './storageService.js';
import { ModalManager } from './ModalManager.js';
import { UIBuilder } from './UIBuilder.js';
import * as Content from './contentFetcher.js';

const INTRO_WATCHED_KEY = 'fudidoFlixIntroWatched';

class FudidoFlixApp {
    
    #currentHeroItem = null;
    #sortePage = null;
    #calendarioPage = null; 
    #aoVivoPage = null;     
    #mangasPage = null;
    
    #modalManager = null;
    #uiBuilder = null;

    #currentBrowseType = 'default';
    #currentPage = 1;
    #isFetching = false;

    #currentSortBy = 'popularity.desc';
    #currentGenre = null;
    #currentProvider = null;
    #currentCompany = null;
    #currentKeyword = null;
    #currentCountry = null;
    #currentEra = null;
    #currentEraType = null;
    
    #pendingConfirmationAction = null;
    #toastTimeout = null;

    constructor() {
        document.addEventListener('DOMContentLoaded', () => {
            this.#initializeApp(); 
        });
    }

    async #initializeApp() {
        this.#modalManager = new ModalManager(this, dom);
        this.#uiBuilder = new UIBuilder(this.#modalManager);
        
        this.#sortePage = new SortePage(dom.contentRowsContainer, this);
        this.#calendarioPage = new CalendarioPage(dom.contentRowsContainer, this); 
        this.#aoVivoPage = new AoVivoPage(dom.contentRowsContainer, this);         
        this.#mangasPage = new MangasPage(dom.contentRowsContainer, this);
        
        if (sessionStorage.getItem(INTRO_WATCHED_KEY)) {
            dom.introModal.classList.add('hidden');
            dom.introVideo.pause();
            dom.mainNav.classList.remove('opacity-0');
            dom.mainContent.classList.remove('opacity-0');
        } else {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            dom.introVideo.play().catch(e => {
                console.warn("Autoplay da intro bloqueado.");
            });
        }
        
        this.#setupEventListeners();
        this.#initApp();

        await this.#runNotificationCheck();
        this.#updateNotificationUI();
        
        const inbox = Storage.getInbox();
        if (inbox.length > 0) {
            this.#showNotificationToast(inbox.length);
        }
    }
    
    #hideIntro() {
        if (dom.introModal.classList.contains('hidden')) return;

        dom.introModal.classList.add('hidden');
        dom.introVideo.pause();
        sessionStorage.setItem(INTRO_WATCHED_KEY, 'true');
        this.#restoreBodyScroll();
        
        dom.mainNav.classList.remove('opacity-0');
        dom.mainContent.classList.remove('opacity-0');
    }

    #setupEventListeners() {
        dom.skipIntroButton.addEventListener('click', () => this.#hideIntro());
        dom.introVideo.addEventListener('ended', () => this.#hideIntro());
        dom.introVideo.addEventListener('error', () => this.#hideIntro());

        window.addEventListener('scroll', () => this.#handleNavScroll());
        window.addEventListener('scroll', () => this.#handleInfiniteScroll());

        dom.logo.addEventListener('click', (e) => this.#handleLogoClick(e));
        dom.navInicio.addEventListener('click', (e) => this.#handleLogoClick(e));
        dom.navSeries.addEventListener('click', (e) => this.#showBrowsePage(e, 'tv', 'Séries'));
        dom.navFilmes.addEventListener('click', (e) => this.#showBrowsePage(e, 'movie', 'Filmes'));
        dom.navAnimes.addEventListener('click', (e) => this.#showBrowsePage(e, 'anime', 'Animes'));
        dom.navMangas.addEventListener('click', (e) => this.#showMangasPage(e));
        
        dom.navCalendario.addEventListener('click', (e) => this.#showCalendarioPage(e)); 
        dom.navAoVivo.addEventListener('click', (e) => this.#showAoVivoPage(e));         
        
        dom.navMinhaLista.addEventListener('click', (e) => this.#showMinhaListaPage(e));
        dom.navSorte.addEventListener('click', (e) => this.#showSortePage(e));

        dom.searchButton.addEventListener('click', () => this.#handleSearchClick());
        dom.searchInput.addEventListener('blur', () => this.#handleSearchBlur());
        dom.searchInput.addEventListener('keypress', (e) => this.#handleSearchKeypress(e));

        dom.notificationButton.addEventListener('click', (e) => this.#handleNotificationClick(e));
        dom.notificationMenu.addEventListener('click', (e) => this.#handleNotificationItemClick(e));
        dom.notificationClearAll.addEventListener('click', () => this.#handleClearAllNotifications());
        dom.notificationToastClose.addEventListener('click', () => this.#hideNotificationToast());

        dom.profileButton.addEventListener('click', (e) => this.#handleProfileClick(e));
        dom.profileClearListButton.addEventListener('click', () => this.#handleClearList());
        dom.profileClearHistoryButton.addEventListener('click', () => this.#handleClearHistory());
        dom.profileLogoutButton.addEventListener('click', () => this.#handleLogout());

        window.addEventListener('click', (e) => this.#handleWindowClickForMenus(e));
        
        dom.confirmationModalCancelButton.addEventListener('click', () => this.#handleCancelAction());
        dom.confirmationModalConfirmButton.addEventListener('click', () => this.#handleConfirmAction());
        dom.confirmationModal.addEventListener('click', (e) => {
            if (e.target === dom.confirmationModal) this.#handleCancelAction();
        });

        dom.hamburgerButton.addEventListener('click', () => this.#openMobileMenu());
        dom.mobileMenuCloseButton.addEventListener('click', () => this.#closeMobileMenu());
        dom.mobileMenuOverlay.addEventListener('click', () => this.#closeMobileMenu());
        
        dom.mobileNav.addEventListener('click', (e) => this.#handleMobileNavClick(e));

        dom.mobileClearListButton.addEventListener('click', () => {
            this.#closeMobileMenu();
            setTimeout(() => this.#handleClearList(), 310);
        });
        dom.mobileClearHistoryButton.addEventListener('click', () => {
            this.#closeMobileMenu();
            setTimeout(() => this.#handleClearHistory(), 310);
        });
        dom.mobileLogoutButton.addEventListener('click', () => {
            this.#closeMobileMenu();
            setTimeout(() => this.#handleLogout(), 310);
        });
        
        dom.backToTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    async #initApp() {
        if (window.lucide) {
            lucide.createIcons();
        }
        this.#handleLogoClick(null, true);
    }

    #handleNavScroll() {
        if (window.scrollY > 50) {
            dom.mainNav.classList.add('bg-[#141414]', 'shadow-lg');
        } else {
            dom.mainNav.classList.remove('bg-[#141414]', 'shadow-lg');
        }

        if (window.scrollY > 400) {
            dom.backToTopButton.classList.remove('hidden');
            dom.backToTopButton.classList.add('visible');
        } else {
            dom.backToTopButton.classList.remove('visible');
            setTimeout(() => {
                if (window.scrollY <= 400) { 
                    dom.backToTopButton.classList.add('hidden');
                }
            }, 300);
        }
    }

    #isModalOpen() {
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
        if (!this.#isModalOpen()) {
            document.documentElement.style.overflow = 'auto';
            document.body.style.overflow = 'auto';
        }
    }

    #openMobileMenu() {
        dom.mobileMenuOverlay.classList.remove('hidden');
        dom.mobileMenuPanel.classList.add('open');
        this.#lockBodyScroll(); 
        if (window.lucide) {
            lucide.createIcons({
                nodes: dom.mobileMenuPanel.querySelectorAll('[data-lucide]')
            });
        }
    }

    #closeMobileMenu() {
        dom.mobileMenuPanel.classList.remove('open');
        setTimeout(() => {
            dom.mobileMenuOverlay.classList.add('hidden');
        }, 300);
        this.#restoreBodyScroll();
    }

    #handleMobileNavClick(event) {
        const link = event.target.closest('a');
        if (!link) return;

        event.preventDefault();

        const desktopLinkId = link.id.replace('-mobile', '');
        const desktopLink = document.getElementById(desktopLinkId);
        
        if (desktopLink) {
            desktopLink.click();
        }
        
        this.#closeMobileMenu();
    }

    #handlePageTransition(contentCallback) {
        dom.mainContent.classList.add('opacity-0');
        
        setTimeout(() => {
            window.scrollTo(0, 0);
            contentCallback(); 
            
            setTimeout(() => {
                dom.mainContent.classList.remove('opacity-0');
            }, 50); 
        }, 300);
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
            dom.heroSection.classList.remove('hidden'); 
            dom.searchInput.value = '';
            dom.searchInput.classList.add('hidden', 'w-0');
            dom.searchInput.classList.remove('w-64');

            this.#fetchAndDisplayHero();
            this.#fetchAndDisplayRows(categories.default);
            this.#setActiveNavLink(dom.navInicio);
        };
        
        if (skipTransition) {
            pageLogic();
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

            dom.heroSection.classList.add('hidden'); 
            dom.contentRowsContainer.innerHTML = '';

            const headerElement = this.#uiBuilder.buildBrowseHeader(
                title, 
                type, 
                () => this.#handleFilterChange()
            );
            dom.contentRowsContainer.appendChild(headerElement);

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

    #showCalendarioPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'calendario';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            
            this.#calendarioPage.showPage(); 
            this.#setActiveNavLink(dom.navCalendario);
        };
        
        this.#handlePageTransition(pageLogic);
    }

    #showAoVivoPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'aovivo';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            
            this.#aoVivoPage.showPage(); 
            this.#setActiveNavLink(dom.navAoVivo);
        };
        
        this.#handlePageTransition(pageLogic);
    }
    
    #showMangasPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'mangas';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            
            this.#mangasPage.showPage(); 
            this.#setActiveNavLink(dom.navMangas);
        };
        
        this.#handlePageTransition(pageLogic);
    }

    #showMinhaListaPage(event) {
        if (event) event.preventDefault();

        const pageLogic = () => {
            this.#currentBrowseType = 'minha-lista';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = ''; 
            this.#setActiveNavLink(dom.navMinhaLista);
            
            const myList = Storage.getMyList();
            const historyList = Storage.getContinueWatchingList();

            const mainContainer = document.createElement('div');
            mainContainer.className = 'pt-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16';
            
            const myListContainer = document.createElement('div');
            
            const myListTitle = document.createElement('h2');
            myListTitle.className = 'text-3xl font-bold mb-6';
            myListTitle.textContent = 'Minha Lista';
            myListContainer.appendChild(myListTitle);

            if (myList.length === 0) {
                myListContainer.innerHTML += `<p class="text-gray-400 mt-4">Sua lista está vazia. Adicione filmes e séries para vê-los aqui.</p>`;
            } else {
                const myListGrid = document.createElement('div');
                myListGrid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-4';
                
                myList.forEach(item => {
                    if (item.poster_path) {
                        const gridItem = this.#uiBuilder.buildGridItem(item, item.type || 'movie');
                        myListGrid.appendChild(gridItem);
                    }
                });
                myListContainer.appendChild(myListGrid);
            }
            
            const historyContainer = document.createElement('div');
            
            const historyTitle = document.createElement('h2');
            historyTitle.className = 'text-3xl font-bold mb-6';
            historyTitle.textContent = 'Continuar Assistindo';
            historyContainer.appendChild(historyTitle);

            if (historyList.length === 0) {
                historyContainer.innerHTML += `<p class="text-gray-400 mt-4">Você ainda não assistiu nada. Seu histórico aparecerá aqui.</p>`;
            } else {
                const historyGrid = document.createElement('div');
                historyGrid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-4';
                
                historyList.forEach(item => {
                    if (item.poster_path) {
                        const gridItem = this.#uiBuilder.buildGridItem(item, item.type || 'movie', { showRemoveButton: true });
                        historyGrid.appendChild(gridItem);
                    }
                });
                historyContainer.appendChild(historyGrid);

                historyGrid.addEventListener('click', (e) => {
                    const removeButton = e.target.closest('.poster-grid-remove-button');
                    if (removeButton) {
                        e.stopPropagation(); 
                        const id = Number(removeButton.dataset.id);
                        const title = removeButton.dataset.title || 'este item';
                        
                        this.#showConfirmationModal(
                            'Remover Título', 
                            `Deseja remover "${title}" da sua lista "Continuar Assistindo"?`, 
                            { action: 'removeFromContinue', id: id } 
                        );
                    }
                });
            }

            mainContainer.appendChild(myListContainer);
            mainContainer.appendChild(historyContainer);
            dom.contentRowsContainer.appendChild(mainContainer);
            
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

    async #fetchAndDisplayHero() {
        this.#currentHeroItem = null;
        const item = await Content.fetchHeroData(); 

        if (item) {
            this.#currentHeroItem = item; 
            this.#uiBuilder.populateHero(item, dom); 
        } else {
            dom.heroTitle.textContent = "Não foi possível carregar o destaque";
            dom.heroOverview.textContent = "Verifique sua conexão ou a chave da API.";
        }
    }

    async #fetchAndDisplayRows(categoriesToShow) {
        dom.contentRowsContainer.innerHTML = '';

        for (const category of categoriesToShow) {
            let items = [];

            if (category.endpoint === 'localstorage' && category.title === "Últimos Assistidos") {
                items = Storage.getWatchedHistory(); 
                if (items.length === 0) {
                     continue;
                }
            } else if (category.endpoint) {
                items = await Content.fetchRowData(category.endpoint); 
            }

            if (items.length > 0) {
                const rowElement = this.#uiBuilder.buildCarousel(category.title, items); 
                dom.contentRowsContainer.appendChild(rowElement); 
            } else {
                 console.warn(`Nenhum item encontrado ou erro ao carregar: ${category.title}`);
            }
        }
        if (window.lucide) {
            lucide.createIcons();
        }
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

            this.#currentGenre = null; 
            this.#currentProvider = null; 
            this.#currentCompany = null;
            this.#currentKeyword = null; 
            this.#currentCountry = null; 
            this.#currentEra = null;

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

        const data = await Content.fetchGridData(filters);

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

    async #performSearch(query) {
        const pageLogic = async () => {
            this.#currentBrowseType = 'search';
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = '<p class="text-gray-400 text-lg pt-24">Buscando...</p>';
            this.#setActiveNavLink(null);

            const data = await Content.fetchSearchData(query);

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

    #handleProfileClick(event) {
        event.stopPropagation(); 
        dom.profileMenu.classList.toggle('hidden');
        dom.notificationMenu.classList.add('hidden'); 
        if (window.lucide) {
            lucide.createIcons({
                nodes: dom.profileMenu.querySelectorAll('[data-lucide]')
            });
        }
    }
    
    #handleWindowClickForMenus(event) {
        if (!dom.profileMenu.classList.contains('hidden')) {
             if (!dom.profileButton.contains(event.target) && !dom.profileMenu.contains(event.target)) {
                 dom.profileMenu.classList.add('hidden');
             }
        }
        
        if (!dom.notificationMenu.classList.contains('hidden')) {
             if (!dom.notificationButton.contains(event.target) && !dom.notificationMenu.contains(event.target)) {
                 dom.notificationMenu.classList.add('hidden');
             }
        }
    }
    
    #showConfirmationModal(title, message, action) {
        this.#pendingConfirmationAction = action;
        dom.confirmationModalTitle.textContent = title;
        dom.confirmationModalMessage.textContent = message;
        dom.confirmationModal.classList.remove('hidden');
        
        this.#lockBodyScroll();
    }

    #closeConfirmationModal() {
        this.#pendingConfirmationAction = null;
        dom.confirmationModal.classList.add('hidden');
        
        this.#restoreBodyScroll();
    }

    #handleCancelAction() {
        this.#closeConfirmationModal();
    }

    #handleConfirmAction() {
        const actionPayload = this.#pendingConfirmationAction;
        this.#closeConfirmationModal(); 
        dom.profileMenu.classList.add('hidden'); 

        let actionType;
        let actionData = null;

        if (typeof actionPayload === 'string') {
            actionType = actionPayload;
        } else if (typeof actionPayload === 'object' && actionPayload !== null) {
            actionType = actionPayload.action;
            actionData = actionPayload;
        } else {
            return; 
        }

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
            case 'removeFromContinue':
                if (actionData && actionData.id) {
                    Storage.removeFromContinueWatching(actionData.id); 
                    if (this.#currentBrowseType === 'minha-lista') {
                        this.#showMinhaListaPage(null); 
                    }
                }
                break;
        }
    }

    #handleClearList() {
        this.#showConfirmationModal(
            'Limpar Minha Lista',
            'Tem certeza que deseja limpar TODA a sua lista? Esta ação não pode ser desfeita.',
            'clearList'
        );
    }

    #handleClearHistory() {
        this.#showConfirmationModal(
            'Limpar Histórico',
            'Tem certeza que deseja limpar TODO o seu histórico de visualização? (Isso inclui "Últimos Assistidos" e "Continuar Assistindo").',
            'clearHistory'
        );
    }

    #handleLogout() {
        this.#showConfirmationModal(
            'Deslogar da Sessão',
            'Tem certeza que deseja sair da sua sessão?',
            'logout'
        );
    }

    async #runNotificationCheck() {
        const lastCheck = Storage.getLastCheck();
        const now = new Date();

        if (!lastCheck) {
            const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));
            Storage.setLastCheck(fourHoursAgo.toISOString());
            return;
        }

        const lastCheckDate = new Date(lastCheck);
        const hoursDiff = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 4) {
            return;
        }

        let newNotificationsFound = [];
        let currentInbox = Storage.getInbox();
        let newEps = currentInbox.filter(item => item.type === 'new_ep');
        localStorage.setItem('fudidoFlixInbox', JSON.stringify(newEps));

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
                            type: 'new_ep', 
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
        
        const continueList = Storage.getContinueWatchingList();
        const watchedEpisodes = Storage.getWatchedEpisodes();
        const tvHistory = continueList.filter(h => h.type === 'tv' || h.media_type === 'tv');

        if (tvHistory.length > 0) {
            const lastWatchedSeries = tvHistory[0]; 
            const lastEp = watchedEpisodes.find(ep => ep.id === lastWatchedSeries.id); 

            if(lastEp) {
                const notification = {
                    type: 'continue_watching',
                    seriesId: lastWatchedSeries.id,
                    seriesName: lastWatchedSeries.title,
                    season: lastEp.season,
                    episode: lastEp.episode + 1, 
                    uniqueId: `continue-${lastWatchedSeries.id}` 
                };
                Storage.saveToInbox(notification);
            }
        }
        
        if (myList.length > 0) {
            const randomItem = myList[Math.floor(Math.random() * myList.length)];
            const notification = {
                type: 'my_list_reminder',
                seriesId: randomItem.id, 
                seriesName: randomItem.title || randomItem.name,
                itemType: randomItem.type || randomItem.media_type,
                uniqueId: `reminder-${randomItem.id}` 
            };
            Storage.saveToInbox(notification);
        }

        Storage.setLastCheck(); 
    }

    #handleNotificationClick(event) {
        event.stopPropagation();
        dom.notificationMenu.classList.toggle('hidden');
        dom.profileMenu.classList.add('hidden'); 
        
        if (!dom.notificationMenu.classList.contains('hidden')) {
            if (window.lucide) {
                lucide.createIcons({
                    nodes: dom.notificationMenu.querySelectorAll('[data-lucide]')
                });
            }
        }
    }

    #handleNotificationItemClick(event) {
        const clearButton = event.target.closest('.notification-clear-item');
        const link = event.target.closest('.notification-item-link');

        if (clearButton) {
            event.stopPropagation(); 
            const uniqueId = clearButton.dataset.uid;
            Storage.removeFromInbox(uniqueId);
            this.#updateNotificationUI(); 
            return;
        }
        
        if (link) {
            event.preventDefault();
            const seriesId = link.dataset.id;
            const itemType = link.dataset.type || 'tv'; 

            const parentLi = link.closest('.notification-item');
            if (parentLi) {
                const btn = parentLi.querySelector('.notification-clear-item');
                if (btn) {
                    const uniqueId = btn.dataset.uid;
                    Storage.removeFromInbox(uniqueId);
                    this.#updateNotificationUI(); 
                }
            }

            this.publicOpenDetailsModal(seriesId, itemType);
            dom.notificationMenu.classList.add('hidden'); 
            return;
        }
    }

    #handleClearAllNotifications() {
        Storage.clearInbox();
        this.#updateNotificationUI(); 
    }
    
    #updateNotificationUI() {
        const inbox = Storage.getInbox();
        
        if (inbox.length > 0) {
            dom.notificationBadge.classList.remove('hidden');
        } else {
            dom.notificationBadge.classList.add('hidden');
        }

        dom.notificationList.innerHTML = ''; 
        
        if (inbox.length === 0) {
            dom.notificationList.innerHTML = `
                <li id="notification-list-empty">Você está em dia!</li>
            `;
            return;
        }

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
                    html = `
                        <a href="#" class="notification-item-link" data-id="${item.seriesId}" data-type="tv">
                            <strong class="new-ep">Novo Ep:</strong> ${item.seriesName}
                        </a>`;
                    break;
                case 'continue_watching':
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
                    return; 
            }
            
            html += `
                <button class="notification-clear-item" data-uid="${item.uniqueId}" aria-label="Limpar notificação">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>`;
                
            li.innerHTML = html;
            dom.notificationList.appendChild(li);
        });
        
        if (!dom.notificationMenu.classList.contains('hidden')) {
             if (window.lucide) {
                lucide.createIcons({
                    nodes: dom.notificationList.querySelectorAll('[data-lucide]')
                });
            }
        }
    }

    #showNotificationToast(count) {
        if (this.#toastTimeout) clearTimeout(this.#toastTimeout);

        const message = (count === 1) 
            ? `Você tem 1 novidade! Confira no sino.`
            : `Você tem ${count} novidades! Confira no sino.`;
        
        dom.notificationToastMessage.textContent = message;
        dom.notificationToast.classList.remove('hidden');
        
        setTimeout(() => {
            dom.notificationToast.classList.add('visible');
            if (window.lucide) {
                lucide.createIcons({
                    nodes: dom.notificationToast.querySelectorAll('[data-lucide]')
                });
            }
        }, 10); 

        this.#toastTimeout = setTimeout(() => {
            this.#hideNotificationToast();
        }, 5000);
    }

    #hideNotificationToast() {
        if (this.#toastTimeout) clearTimeout(this.#toastTimeout);
        
        dom.notificationToast.classList.remove('visible');
        setTimeout(() => {
            dom.notificationToast.classList.add('hidden');
        }, 300); 
    }

    publicOpenDetailsModal(id, type) {
        this.#modalManager.openDetailsModal(id, type);
    }

    publicOpenPlayer(id, type) {
        this.#modalManager.openPlayer(id, type);
    }
    
    publicShowBrowsePageForGenre(genreId, genreName, type) {
        const pageLogic = () => {
            this.#currentBrowseType = type; 
            this.#resetBrowseState();
            this.#currentGenre = genreId; 

            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = '';

            const title = (type === 'movie' ? 'Filmes de ' : 'Séries de ') + genreName;
            
            dom.contentRowsContainer.innerHTML = `
                <div class="pt-24">
                    <button id="grid-back-button" class="flex items-center space-x-2 text-gray-300 hover:text-white mb-6">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        <span>Voltar</span>
                    </button>
                </div>
            `;
            dom.contentRowsContainer.querySelector('#grid-back-button').addEventListener('click', () => this.#handleLogoClick(null));

            const headerElement = this.#uiBuilder.buildBrowseHeader(
                title, 
                type, 
                () => this.#handleFilterChange()
            );
            headerElement.classList.remove('pt-24');
            dom.contentRowsContainer.querySelector('.pt-24').appendChild(headerElement);

            const gridContainer = document.createElement('div');
            gridContainer.id = 'browse-grid';
            gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8';
            dom.contentRowsContainer.querySelector('.pt-24').appendChild(gridContainer);
            
            if (window.lucide) { lucide.createIcons(); }

            this.#fetchAndDisplayGrid(); 

            this.#setActiveNavLink(null); 
        };

        this.#handlePageTransition(pageLogic);
    }

    publicShowBrowsePageForActor(actorId, actorName) {
        const pageLogic = async () => {
            this.#currentBrowseType = 'search'; 
            this.#resetBrowseState();
            dom.heroSection.classList.add('hidden');
            dom.contentRowsContainer.innerHTML = `
                <div class="pt-24">
                    <button id="grid-back-button" class="flex items-center space-x-2 text-gray-300 hover:text-white mb-6">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        <span>Voltar</span>
                    </button>
                    <h2 class="text-3xl font-bold mb-8">Filmografia de ${actorName}</h2>
                    <p id="grid-loading" class="text-gray-400 text-lg">Buscando...</p>
                    <div id="search-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8"></div>
                </div>
            `;
            dom.contentRowsContainer.querySelector('#grid-back-button').addEventListener('click', () => this.#handleLogoClick(null));
            if (window.lucide) { lucide.createIcons(); }
            
            this.#setActiveNavLink(null);

            const data = await Content.fetchActorCredits(actorId);
            const gridContainer = dom.contentRowsContainer.querySelector('#search-grid');
            const loadingText = dom.contentRowsContainer.querySelector('#grid-loading');

            if (data && (data.movieCredits || data.tvCredits)) {
                
                const movieCast = (data.movieCredits.cast || []).map(m => ({...m, media_type: 'movie'}));
                const movieCrew = (data.movieCredits.crew || []).map(m => ({...m, media_type: 'movie'}));
                const tvCast = (data.tvCredits.cast || []).map(t => ({...t, media_type: 'tv'}));
                const tvCrew = (data.tvCredits.crew || []).map(t => ({...t, media_type: 'tv'}));

                const allCredits = [...movieCast, ...movieCrew, ...tvCast, ...tvCrew];
                const uniqueCredits = [...new Map(allCredits.map(item => [item['id'], item])).values()];
                
                const validResults = uniqueCredits
                    .filter(item => item.poster_path)
                    .sort((a, b) => b.popularity - a.popularity);

                if (validResults.length > 0) {
                    loadingText.classList.add('hidden'); 

                    validResults.forEach(item => {
                        const gridItem = this.#uiBuilder.buildGridItem(item, item.media_type || 'movie');
                        gridContainer.appendChild(gridItem);
                    });
                    
                    if (window.lucide) { lucide.createIcons(); }
                } else {
                    loadingText.textContent = `Nenhum filme ou série encontrado para ${actorName}.`;
                }
            } else {
                loadingText.textContent = 'Nenhum resultado encontrado.';
            }
        };

        this.#handlePageTransition(pageLogic);
    }

    onPlayerClose() {
        if (this.#currentBrowseType === 'default') {
            this.#fetchAndDisplayRows(categories.default);
        }
        if (this.#currentBrowseType === 'minha-lista') {
            this.#showMinhaListaPage(null);
        }
    }

    onModalClose() {
        if (this.#currentBrowseType === 'minha-lista') {
            this.#showMinhaListaPage(null);
        }
    }
}

new FudidoFlixApp();