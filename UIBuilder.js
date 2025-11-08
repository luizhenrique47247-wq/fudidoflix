// ARQUIVO: UIBuilder.js

/**
 * Classe "Fábrica" responsável por construir componentes de UI (HTML Elements).
 * Recebe dados e retorna elementos prontos para serem inseridos no DOM.
 */

import { IMG_BASE_URL, IMG_POSTER_URL } from './api.js';
import { movieFilters, tvFilters, sortByOptions } from './config.js';

export class UIBuilder {

    #modalManager;

    constructor(modalManager) {
        this.#modalManager = modalManager;
    }

    /**
     * Popula o componente Hero com dados.
     * @param {object} item - O item em destaque (filme ou série).
     * @param {object} dom - O objeto DOM importado.
     */
    populateHero(item, dom) {
        const itemType = item.media_type || (item.title ? 'movie' : 'tv');

        dom.heroTitle.textContent = item.title || item.name;
        dom.heroOverview.textContent = item.overview;
        dom.heroSection.style.backgroundImage = `url(${IMG_BASE_URL}${item.backdrop_path})`;

        dom.heroPlayButton.onclick = () => {
            const season = itemType === 'tv' ? 1 : null;
            const episode = itemType === 'tv' ? 1 : null;
            this.#modalManager.openPlayer(item.id, itemType, season, episode, item);
        };

        dom.heroInfoButton.onclick = () => {
            this.#modalManager.openDetailsModal(item.id, itemType);
        };
    }

    /**
     * Constrói um carrossel (fileira) completo.
     * @param {string} title - O título da fileira.
     * @param {Array} items - Array de itens (filmes/séries).
     * @returns {HTMLElement} O elemento rowWrapper pronto.
     */
    buildCarousel(title, items) {
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

        const validItems = items.filter(item => item.poster_path && (item.media_type !== 'person' || title === "Últimos Assistidos"));

        if (validItems.length === 0) {
             if (title === "Últimos Assistidos") {
                // Retorna um fragmento vazio se for "Últimos Assistidos" e não tiver nada
                return document.createDocumentFragment(); 
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
                    this.#modalManager.openDetailsModal(item.id, itemType);
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
        return rowWrapper;
    }

    /**
     * Constrói um único item da grade (poster).
     * @param {object} item - O item (filme/série).
     * @param {string} typeForEndpoint - O tipo ('movie' ou 'tv') para fallback.
     * @param {object} [options={}] - Opções adicionais, como { showRemoveButton: true }.
     * @returns {HTMLElement} O elemento poster-grid-wrapper pronto.
     */
    buildGridItem(item, typeForEndpoint = 'movie', options = {}) {
        const type = item.media_type || item.type || typeForEndpoint;

        // 1. Criar o Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'poster-grid-wrapper';

        // 2. Criar a Imagem
        const img = document.createElement('img');
        img.src = `${IMG_POSTER_URL}${item.poster_path}`;
        img.alt = item.title || item.name;
        img.className = 'poster-grid';
        img.loading = 'lazy';
        
        // 3. Criar o Overlay
        const titleOverlay = document.createElement('div');
        titleOverlay.className = 'poster-title-overlay';
        titleOverlay.textContent = item.title || item.name || '';
        
        // 4. Mover o listener para o Wrapper
        // ==========================================================
        // MUDANÇA (Req 1): Adiciona verificação no listener
        // ==========================================================
        wrapper.addEventListener('click', (e) => {
            // Se o alvo do clique (ou seu pai) for o botão de remover,
            // não faça nada. Deixe o 'app.js' lidar com isso.
            if (e.target.closest('.poster-grid-remove-button')) {
                return;
            }
            // Caso contrário, abra o modal de detalhes.
            this.#modalManager.openDetailsModal(item.id, type);
        });
        // ==========================================================

        // 5. Montar
        wrapper.appendChild(img);
        wrapper.appendChild(titleOverlay);
        
        // ==========================================================
        // MUDANÇA (Req 2): Adiciona o botão de remover se solicitado
        // ==========================================================
        if (options.showRemoveButton) {
            const removeButton = document.createElement('button');
            removeButton.className = 'poster-grid-remove-button'; // Estilo definido no style.css
            removeButton.innerHTML = `<i data-lucide="x" class="w-4 h-4"></i>`;
            removeButton.dataset.id = item.id;
            removeButton.dataset.type = type;
            // MUDANÇA (Req 2): Adiciona o título para o modal de confirmação
            removeButton.dataset.title = item.title || item.name;
            removeButton.setAttribute('aria-label', 'Remover do histórico');
            
            // O listener de clique será adicionado no app.js (delegação)
            
            wrapper.appendChild(removeButton);
            
            // MUDANÇA (Req 2): Adiciona classe para targeting de CSS
            wrapper.classList.add('has-remove-button');
        }
        // ==========================================================
        
        return wrapper;
    }

    /**
     * Constrói o cabeçalho da página "Explorar" com filtros.
     * @param {string} title - O título da página.
     * @param {string} type - 'movie', 'tv' ou 'anime'.
     * @param {function} filterChangeCallback - A função a ser chamada quando um filtro mudar.
     * @returns {HTMLElement} O elemento headerContainer pronto.
     */
    buildBrowseHeader(title, type, filterChangeCallback) {
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
            genreSelect.addEventListener('change', filterChangeCallback);
            selectorsContainer.appendChild(genreSelect);
        }

        const sortSelect = this.#createSortSelect('sort-by-select', (type === 'movie') ? sortByOptions.movie : sortByOptions.tv);
        sortSelect.addEventListener('change', filterChangeCallback);
        selectorsContainer.appendChild(sortSelect);

        headerContainer.appendChild(selectorsContainer);
        return headerContainer;
    }

    // ========================================================================
    //  MÉTODOS PRIVADOS (Helpers de construção)
    // ========================================================================

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
}