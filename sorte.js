// ARQUIVO: sorte.js (Substitua o conteúdo deste arquivo)

import { fetchTMDB, IMG_POSTER_URL } from './api.js';

/**
 * Classe para gerenciar a lógica da página "Sorte".
 * Inclui "Surpreenda-me", "Roleta de Filmes" e o novo modal "Descobrir".
 */
export class SortePage {
    #container;
    #app; // Referência à classe FudidoFlixApp principal
    
    // --- Estado do "Surpreenda-me" ---
    #surpriseModal = null; 
    #genres = []; 

    // --- Estado da "Roleta" ---
    #rouletteModal = null;
    #roletaItems = []; // Array de {id, title, poster_path, media_type}
    #roletaCanvas = null;
    #roletaCtx = null;
    #roletaCores = ['#E50914', '#B20710', '#831010'];
    #searchTimeout = null;
    #isSpinning = false;
    #currentRotation = 0;
    #SPIN_DURATION = 10000; // 10 segundos

    // --- Estado do "Descobrir" ---
    #discoverModal = null;
    #discoverSearchTimeout = null;
    #discoverGridResults = []; // Armazena os resultados da grade para reordenar
    
    // ==========================================================
    // MUDANÇA (Correção do Bug): Links de logo ATUALIZADOS
    // ==========================================================
    #discoverStudioList = [
        { id: 41077, name: 'A24', logo_path: '/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png' }, // CORRIGIDO
        { id: 10342, name: 'Studio Ghibli', logo_path: '/uFuxPEZRUcBTEiYIxjHJq62Vr77.png' },
        { id: 3, name: 'Pixar', logo_path: '/1TjvGVDMYsj6JBxOAkUHpPEwLf7.png' },
        { id: 420, name: 'Marvel Studios', logo_path: '/hUzeosd33nzE5MCNsZxCGEKTXaQ.png' },
        { id: 174, name: 'Warner Bros. Pictures', logo_path: '/IuAlhI9eVC9Z8UQWOIDdWRKSEJ.png' },
        { id: 33, name: 'Universal Pictures', logo_path: '/8lvHyhjr8oUKOOy2dKXoALWKdp0.png' },
        { id: 521, name: 'DreamWorks Animation', logo_path: '/3BPX5VGBov8SDqTV7wC1L1xShAS.png' },
        { id: 2, name: 'Walt Disney Pictures', logo_path: '/6SeZO9r3RpIGezMELFj8iiz3UEG.png' },
        { id: 128064, name: 'DC Films', logo_path: '/eOL4PkiC0zkDpxKFQhBnmCtwx5p.png' }, // CORRIGIDO
        { id: 34, name: 'Sony Pictures', logo_path: '/GagSvqWlyPdkGPwaKkBN2iN9lBL.png' }
    ];

    constructor(container, app) {
        this.#container = container;
        this.#app = app;
    }

    /**
     * Limpa o container e exibe o conteúdo da página "Sorte".
     */
    showPage() {
        this.#container.innerHTML = '';

        const titleEl = document.createElement('h2');
        titleEl.className = 'text-3xl font-bold pt-24 mb-8';
        titleEl.textContent = 'Sorte';
        this.#container.appendChild(titleEl);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid grid-cols-1 md:grid-cols-3 gap-6';
        this.#container.appendChild(gridContainer);

        // --- Card 1: Surpreenda-me ---
        const card1 = document.createElement('div');
        card1.className = 'bg-gray-900 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-800 transition-colors cursor-pointer min-h-[250px]';
        card1.innerHTML = `
            <i data-lucide="dices" class="w-16 h-16 text-red-500 mb-4"></i>
            <h3 class="text-2xl font-bold mb-2">Surpreenda-me</h3>
            <p class="text-gray-400">Encontre um filme ou série aleatória para assistir agora.</p>
        `;
        card1.addEventListener('click', () => this.#openSurpriseModal());
        gridContainer.appendChild(card1);

        // --- Card 2: Roleta ---
        const card2 = document.createElement('div');
        card2.className = 'bg-gray-900 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-800 transition-colors cursor-pointer min-h-[250px]';
        card2.innerHTML = `
            <i data-lucide="disc-3" class="w-16 h-16 text-red-500 mb-4"></i>
            <h3 class="text-2xl font-bold mb-2">Roleta</h3>
            <p class="text-gray-400">Monte uma roleta com seus amigos para decidir o que assistir.</p>
        `;
        card2.addEventListener('click', () => this.#openRouletteModal());
        gridContainer.appendChild(card2);

        // --- Card 3: Descobrir ---
        const card3 = document.createElement('div');
        card3.className = 'bg-gray-900 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-800 transition-colors cursor-pointer min-h-[250px]';
        card3.innerHTML = `
            <i data-lucide="compass" class="w-16 h-16 text-red-500 mb-4"></i> 
            <h3 class="text-2xl font-bold mb-2">Descobrir</h3>
            <p class="text-gray-400">Explore por estúdios e atores populares.</p>
        `;
        card3.addEventListener('click', () => this.#openDiscoverModal());
        gridContainer.appendChild(card3);

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // ==========================================================
    // MÉTODOS DO MODAL "ROLETAS" (Existentes)
    // ==========================================================

    #buildAndInjectRouletteModal() {
        if (document.getElementById('roulette-modal')) return;

        const modalHTML = `
            <style>
                #roulette-modal { background-color: rgba(0,0,0,0.85); backdrop-filter: blur(5px); }
                #roulette-modal-content { background-color: #181818; max-height: 95vh; }
                #roulette-search-input { background-color: #333; }
                #roulette-search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: #222;
                    max-height: 300px;
                    z-index: 20;
                }
                .search-item { background-color: #333; }
                .search-item:hover { background-color: #444; }
                .roulette-list-item { background-color: #222; }
                
                #roulette-container {
                    position: relative;
                    width: 400px;
                    height: 400px;
                    max-width: 90vw;
                    max-height: 90vw;
                    margin: auto;
                }
                
                #roulette-pointer {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0; 
                    height: 0;
                    z-index: 10;
                    border-left: 22px solid transparent;
                    border-right: 22px solid transparent;
                    border-top: 33px solid #000;
                }
                #roulette-pointer::after {
                    content: '';
                    position: absolute;
                    top: -32px; 
                    left: -20px; 
                    width: 0;
                    height: 0;
                    border-left: 20px solid transparent;
                    border-right: 20px solid transparent;
                    border-top: 30px solid #E50914;
                }
                
                #roulette-canvas {
                    width: 100%;
                    height: 100%;
                    transition: transform 10s cubic-bezier(0.22, 1, 0.36, 1);
                }
                #roulette-spin-button {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 80px;
                    height: 80px;
                    background-color: #fff;
                    color: #E50914;
                    border: 6px solid #E50914;
                    border-radius: 50%;
                    font-weight: 800;
                    text-transform: uppercase;
                    cursor: pointer;
                    z-index: 5;
                    box-shadow: 0 0 15px rgba(0,0,0,0.5);
                }
                #roulette-spin-button:disabled {
                    background-color: #aaa;
                    color: #777;
                    border-color: #777;
                    cursor: not-allowed;
                }
                #roulette-result-modal {
                    background-color: rgba(0,0,0,0.85); backdrop-filter: blur(5px);
                }
                #roulette-result-content { background-color: #181818; }
            </style>

            <div id="roulette-modal" class="fixed inset-0 z-[120] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300 pointer-events-none">
                <div id="roulette-modal-content" class="rounded-lg shadow-xl w-full max-w-6xl transform scale-95 transition-all duration-300 overflow-hidden">
                    <div class="flex justify-between items-center p-4 border-b border-gray-700">
                        <h3 class="text-xl font-bold">Roleta Cinéfila</h3>
                        <button id="roulette-close-button" class="text-gray-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                        <div class="space-y-4">
                            <div class="relative z-10">
                                <label for="roulette-search-input" class="block text-sm font-medium text-gray-300 mb-2">Adicionar à Roleta</label>
                                <input type="text" id="roulette-search-input" placeholder="Pesquisar filme ou série..." class="w-full p-3 rounded-md text-white border-0 focus:ring-2 focus:ring-red-500" style="background-color: #333;">
                                <div id="roulette-search-results" class="w-full rounded-b-md overflow-hidden overflow-y-auto">
                                    </div>
                            </div>
                            <div class="relative z-0">
                                <h4 class="text-lg font-semibold mb-2">Itens na Roleta</h4>
                                <ul id="roulette-items-list" class="space-y-2 max-h-64 overflow-y-auto">
                                    </ul>
                            </div>
                        </div>

                        <div class="flex items-center justify-center">
                            <div id="roulette-container">
                                <div id="roulette-pointer"></div>
                                <canvas id="roulette-canvas" width="400" height="400"></canvas>
                                <button id="roulette-spin-button" disabled>Girar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="roulette-result-modal" class="fixed inset-0 z-[130] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300 pointer-events-none">
                <div id="roulette-result-content" class="rounded-lg shadow-xl w-full max-w-md transform scale-95 transition-all duration-300 text-center p-6">
                    <h3 class="text-2xl font-bold mb-4">E o vencedor é...</h3>
                    <img id="roulette-result-poster" src="" alt="Poster do Vencedor" class="w-2/3 mx-auto rounded-md mb-4">
                    <h4 id="roulette-result-title" class="text-xl font-semibold mb-6"></h4>
                    <div class="flex space-x-4">
                        <button id="roulette-result-details-btn" class="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors">Ver Detalhes</button>
                        <button id="roulette-result-close-btn" class="flex-1 px-4 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700 transition-colors">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        if (window.lucide) {
            lucide.createIcons();
        }

        this.#rouletteModal = document.getElementById('roulette-modal');
        this.#roletaCanvas = document.getElementById('roulette-canvas');
        this.#roletaCtx = this.#roletaCanvas.getContext('2d');
        
        this.#addRouletteListeners();
        
        this.#updateRouletteListUI();
        this.#drawRoulette();
    }
    
    #addRouletteListeners() {
        const modal = this.#rouletteModal;
        if (!modal) return;

        modal.querySelector('#roulette-close-button').addEventListener('click', () => this.#closeRouletteModal());
        document.getElementById('roulette-result-close-btn').addEventListener('click', () => this.#closeResultModal());
        document.getElementById('roulette-result-details-btn').addEventListener('click', () => this.#handleResultDetailsClick());
        document.getElementById('roulette-spin-button').addEventListener('click', () => this.#handleSpinClick());
        
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.#closeRouletteModal();
            }
        });

        const searchInput = document.getElementById('roulette-search-input');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.#searchTimeout);
            this.#searchTimeout = setTimeout(() => this.#runSearch(e.target.value), 300); 
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => document.getElementById('roulette-search-results').innerHTML = '', 200);
        });

        document.getElementById('roulette-items-list').addEventListener('click', (e) => {
            if (e.target.closest('.remove-roleta-item')) {
                const id = e.target.closest('.roulette-list-item').dataset.id;
                this.#removeItemFromRoulette(Number(id));
            }
        });
    }

    #openRouletteModal() {
        this.#buildAndInjectRouletteModal();
        
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        this.#rouletteModal.classList.remove('pointer-events-none', 'opacity-0');
        this.#rouletteModal.querySelector('#roulette-modal-content').classList.remove('scale-95');
        
        if (this.#roletaItems.length > 0) {
            this.#roletaItems = [];
            this.#saveRoletaItems();
            this.#updateRouletteListUI();
            this.#drawRoulette();
        }
    }

    #closeRouletteModal() {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        this.#rouletteModal.classList.add('opacity-0');
        this.#rouletteModal.querySelector('#roulette-modal-content').classList.add('scale-95');
        setTimeout(() => this.#rouletteModal.classList.add('pointer-events-none'), 300);

        this.#roletaItems = [];
        this.#saveRoletaItems();
        this.#updateRouletteListUI();
        this.#drawRoulette();
    }

    async #runSearch(query) {
        const resultsContainer = document.getElementById('roulette-search-results');
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }

        const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
        const results = data?.results || [];
        
        const validResults = results
            .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
            .slice(0, 5);

        resultsContainer.innerHTML = '';
        if (validResults.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-gray-400">Nenhum resultado...</div>';
            return;
        }

        validResults.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'search-item flex items-center p-2 cursor-pointer';
            itemEl.innerHTML = `
                <img src="${IMG_POSTER_URL}${item.poster_path}" class="w-10 h-16 object-cover rounded-sm mr-3">
                <span class="text-white">${item.title || item.name}</span>
            `;
            itemEl.addEventListener('mousedown', () => {
                this.#addItemToRoulette({
                    id: item.id,
                    title: item.title || item.name,
                    poster_path: item.poster_path,
                    media_type: item.media_type
                });
                document.getElementById('roulette-search-input').value = '';
                resultsContainer.innerHTML = '';
            });
            resultsContainer.appendChild(itemEl);
        });
    }

    #addItemToRoulette(item) {
        if (this.#roletaItems.some(i => i.id === item.id)) return;
        
        this.#roletaItems.push(item);
        this.#saveRoletaItems();
        this.#updateRouletteListUI();
        this.#drawRoulette();
    }

    #removeItemFromRoulette(id) {
        this.#roletaItems = this.#roletaItems.filter(i => i.id !== id);
        this.#saveRoletaItems();
        this.#updateRouletteListUI();
        this.#drawRoulette();
    }

    #updateRouletteListUI() {
        const listEl = document.getElementById('roulette-items-list');
        listEl.innerHTML = '';

        if (this.#roletaItems.length === 0) {
            listEl.innerHTML = '<li id="roulette-empty-msg" class="text-gray-500 text-center p-4">Adicione 2 ou mais itens...</li>';
            return;
        }

        this.#roletaItems.forEach(item => {
            const itemEl = document.createElement('li');
            itemEl.className = 'roulette-list-item flex items-center justify-between p-2 rounded';
            itemEl.dataset.id = item.id;
            itemEl.innerHTML = `
                <span class="text-gray-300 truncate w-4/5">${item.title}</span>
                <button class="remove-roleta-item text-gray-500 hover:text-red-500">
                    <i data-lucide="x-circle" class="w-5 h-5"></i>
                </button>
            `;
            listEl.appendChild(itemEl);
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    #saveRoletaItems() {
        if (this.#roletaItems.length > 0) {
            localStorage.setItem('fudidoFlixRoleta', JSON.stringify(this.#roletaItems));
        } else {
            localStorage.removeItem('fudidoFlixRoleta');
        }
    }
    
    #drawRoulette() {
        const n = this.#roletaItems.length;
        const canvas = this.#roletaCanvas;
        const ctx = this.#roletaCtx;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('roulette-spin-button').disabled = (n < 2);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        if (n < 1) {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(200, 200, 190, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            return;
        }

        const arcSize = (2 * Math.PI) / n;
        const radius = 190;
        const center = 200;

        for (let i = 0; i < n; i++) {
            const item = this.#roletaItems[i];
            const angle = (i * arcSize) - (Math.PI / 2);

            ctx.beginPath();
            ctx.fillStyle = this.#roletaCores[i % this.#roletaCores.length];
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, angle, angle + arcSize);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(angle + arcSize / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Inter, sans-serif';
            
            let title = item.title;
            if (title.length > 18) {
                title = title.substring(0, 15) + '...';
            }
            
            ctx.fillText(title, radius - 15, 5);
            ctx.restore();
        }
    }

    #handleSpinClick() {
        if (this.#isSpinning) return;
        this.#isSpinning = true;

        this.#setControlsDisabled(true);
        
        this.#roletaCanvas.style.transition = 'none';
        this.#roletaCanvas.style.transform = `rotate(${this.#currentRotation % 360}deg)`;
        
        void this.#roletaCanvas.offsetWidth; 

        const n = this.#roletaItems.length;
        const segmentDegrees = 360 / n;
        
        const baseSpins = 5 * 360; 
        const randomSegmentOffset = Math.random() * segmentDegrees;
        const stopAngle = (Math.floor(Math.random() * n) * segmentDegrees) + (segmentDegrees / 2) + randomSegmentOffset;

        const totalRotation = baseSpins - stopAngle;
        
        this.#currentRotation += totalRotation;

        this.#roletaCanvas.style.transition = `transform ${this.#SPIN_DURATION / 1000}s cubic-bezier(0.22, 1, 0.36, 1)`;
        this.#roletaCanvas.style.transform = `rotate(${this.#currentRotation}deg)`;

        setTimeout(() => this.#onSpinComplete(), this.#SPIN_DURATION);
    }

    #onSpinComplete() {
        this.#isSpinning = false;
        
        const n = this.#roletaItems.length;
        const segmentAngle = 360 / n;
        
        const finalAngle = (this.#currentRotation % 360 + 360) % 360;
        const winningAngle = (360 - finalAngle) % 360;
        const winningIndex = Math.floor(winningAngle / segmentAngle);

        if (winningIndex >= 0 && winningIndex < this.#roletaItems.length) {
            const winner = this.#roletaItems[winningIndex];
            this.#showResultModal(winner);
        } else {
            console.error("Erro ao calcular vencedor.", { finalAngle, winningAngle, winningIndex });
            this.#setControlsDisabled(false);
        }
    }

    #showResultModal(winner) {
        const modal = document.getElementById('roulette-result-modal');
        document.getElementById('roulette-result-poster').src = `${IMG_POSTER_URL}${winner.poster_path}`;
        document.getElementById('roulette-result-title').textContent = winner.title;
        
        document.getElementById('roulette-result-details-btn').dataset.winner = JSON.stringify(winner);

        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.querySelector('#roulette-result-content').classList.remove('scale-95');
    }

    #closeResultModal() {
        const modal = document.getElementById('roulette-result-modal');
        modal.classList.add('opacity-0');
        modal.querySelector('#roulette-result-content').classList.add('scale-95');
        setTimeout(() => modal.classList.add('pointer-events-none'), 300);

        this.#setControlsDisabled(false);
    }

    #handleResultDetailsClick() {
        const winnerData = document.getElementById('roulette-result-details-btn').dataset.winner;
        if (!winnerData) return;

        const winner = JSON.parse(winnerData);
        this.#closeResultModal();
        this.#closeRouletteModal();
        this.#app.publicOpenDetailsModal(winner.id, winner.media_type);
    }

    #setControlsDisabled(disabled) {
        document.getElementById('roulette-search-input').disabled = disabled;
        document.getElementById('roulette-spin-button').disabled = disabled || (this.#roletaItems.length < 2);
        
        document.querySelectorAll('.remove-roleta-item').forEach(btn => {
            btn.disabled = disabled;
        });
    }

    // ==========================================================
    // MÉTODOS DO MODAL "DESCOBRIR" (ATUALIZADO)
    // ==========================================================

    /**
     * Injeta o HTML e CSS do modal "Descobrir" no <body>.
     */
    #buildAndInjectDiscoverModal() {
        if (document.getElementById('discover-modal')) return;

        const modalHTML = `
            <style>
                #discover-modal { background-color: rgba(0,0,0,0.85); backdrop-filter: blur(5px); }
                
                #discover-modal-content { 
                    background-color: #181818; 
                    background-image: linear-gradient(to bottom, #181818, #141414);
                    max-height: 90vh; 
                    overflow-y: auto; 
                }

                #discover-modal-content::-webkit-scrollbar {
                    width: 8px;
                }
                #discover-modal-content::-webkit-scrollbar-track {
                    background: #181818; 
                    border-radius: 4px;
                }
                #discover-modal-content::-webkit-scrollbar-thumb {
                    background: #555; 
                    border-radius: 4px;
                }
                #discover-modal-content::-webkit-scrollbar-thumb:hover {
                    background: #E50914; 
                }

                #discover-search-input { background-color: #333; }
                
                .discover-scroll-container {
                    display: flex;
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding-bottom: 16px; 
                    gap: 16px;
                }
                .discover-scroll-container::-webkit-scrollbar { height: 8px; }
                .discover-scroll-container::-webkit-scrollbar-track { background: #222; border-radius: 4px; }
                .discover-scroll-container::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
                .discover-scroll-container::-webkit-scrollbar-thumb:hover { background: #777; }

                /* Card de Estúdio */
                .discover-studio-card {
                    flex: 0 0 180px;
                    width: 180px;
                    background-color: #222;
                    border-radius: 8px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    border: 1px solid #2a2a2a;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                }
                .discover-studio-card:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    z-index: 10;
                }
                .discover-studio-card .logo-container {
                    width: 100%;
                    height: 100px;
                    background-color: #fff;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .discover-studio-card img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .discover-studio-card span {
                    display: block;
                    text-align: center;
                    padding: 12px 8px;
                    font-weight: 600;
                    color: #eee;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .discover-studio-card .logo-container .studio-initials {
                    font-size: 2.5rem; /* 40px */
                    font-weight: 800;
                    color: #333;
                    line-height: 1;
                    font-family: Inter, sans-serif;
                }

                /* Card de Ator/Atriz */
                .discover-actor-card {
                    flex: 0 0 140px;
                    width: 140px;
                    background-color: #222;
                    border-radius: 8px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    border: 1px solid #2a2a2a;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                }
                .discover-actor-card:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    z-index: 10;
                }
                .discover-actor-card img {
                    width: 100%;
                    height: 210px;
                    object-fit: cover;
                    background-color: #333;
                }
                .discover-actor-card span {
                    display: block;
                    text-align: center;
                    padding: 10px 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #eee;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .discover-loader {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 150px;
                    color: #888;
                }
                
                .discover-sort-select {
                    background-color: #222;
                    color: #eee;
                    border: 1px solid #444;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-weight: 500;
                }

                .discover-results-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 16px;
                }
                
                .discover-grid-item {
                    cursor: pointer;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: transform 0.2s;
                    background-color: #222;
                    position: relative; 
                }
                .discover-grid-item:hover {
                    transform: scale(1.05);
                    z-index: 10;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                }
                .discover-grid-item img {
                    width: 100%;
                    display: block;
                }
                .discover-grid-item .title-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0));
                    color: white;
                    padding: 16px 8px 8px 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    text-align: center;
                    opacity: 0; 
                    transition: opacity 0.2s ease-in-out;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .discover-grid-item:hover .title-overlay {
                    opacity: 1; 
                }
            </style>
            
            <div id="discover-modal" class="fixed inset-0 z-[120] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300 pointer-events-none">
                
                <div id="discover-modal-content" class="rounded-lg shadow-xl w-full max-w-5xl transform scale-95 transition-all duration-300">
                    
                    <div class="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-[#181818] z-10 gap-4">
                        <h3 class="text-xl font-bold whitespace-nowrap">Descobrir</h3>
                        
                        <div class="relative w-full max-w-lg">
                            <input type="text" id="discover-search-input" placeholder="Buscar por ator, atriz ou estúdio..." class="w-full p-2 pl-10 rounded-md text-white border-0 focus:ring-2 focus:ring-red-500" style="background-color: #333;">
                            <i data-lucide="search" class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                        </div>
                        
                        <button id="discover-close-button" class="text-gray-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <div class="p-6"> 
                        <div id="discover-search-content" class="hidden space-y-6">
                            <div>
                                <h4 class="text-lg font-semibold mb-3">Atores Encontrados</h4>
                                <div id="discover-search-actors-list" class="discover-scroll-container">
                                    </div>
                            </div>
                            <div>
                                <h4 class="text-lg font-semibold mb-3">Estúdios Encontrados</h4>
                                <div id="discover-search-studios-list" class="discover-scroll-container">
                                    </div>
                            </div>
                        </div>
                        
                        <div id="discover-popular-content" class="space-y-6">
                            <div>
                                <h4 class="text-lg font-semibold mb-3">Estúdios Populares (Em Destaque)</h4>
                                <div id="discover-studios-list" class="discover-scroll-container">
                                    </div>
                            </div>
                            <div>
                                <h4 class="text-lg font-semibold mb-3">Atores Populares</h4>
                                <div id="discover-actors-list" class="discover-scroll-container">
                                    <div id="discover-actors-loader" class="discover-loader w-full">
                                        <i data-lucide="loader-2" class="w-8 h-8 animate-spin"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        if (window.lucide) {
            lucide.createIcons();
        }

        this.#discoverModal = document.getElementById('discover-modal');
        this.#addDiscoverListeners(); // Adiciona os listeners
    }

    /**
     * Adiciona listeners para o modal "Descobrir" (Fechar e Buscar).
     */
    #addDiscoverListeners() {
        this.#discoverModal.addEventListener('click', (event) => {
            if (event.target === this.#discoverModal) {
                this.#closeDiscoverModal();
            }
        });

        this.#discoverModal.querySelector('#discover-close-button').addEventListener('click', () => this.#closeDiscoverModal());

        // Listener da Busca
        this.#discoverModal.querySelector('#discover-search-input').addEventListener('input', (e) => {
            clearTimeout(this.#discoverSearchTimeout);
            const query = e.target.value.trim();

            if (query.length === 0) {
                // Limpa e volta ao popular
                document.getElementById('discover-popular-content').classList.remove('hidden');
                document.getElementById('discover-search-content').classList.add('hidden');
                document.getElementById('discover-search-actors-list').innerHTML = '';
                document.getElementById('discover-search-studios-list').innerHTML = '';
                
                // Recarrega os dados populares (especialmente os estúdios)
                this.#loadDiscoverData(true); 
            } else if (query.length >= 3) {
                // Espera para buscar
                this.#discoverSearchTimeout = setTimeout(() => this.#runDiscoverSearch(query), 400);
            }
        });
    }

    /**
     * Executa a busca por Atores E Estúdios
     * @param {string} query 
     */
    async #runDiscoverSearch(query) {
        const popularContent = document.getElementById('discover-popular-content');
        const searchContent = document.getElementById('discover-search-content');
        const actorResultsList = document.getElementById('discover-search-actors-list');
        const studioResultsList = document.getElementById('discover-search-studios-list');

        popularContent.classList.add('hidden');
        searchContent.classList.remove('hidden');
        
        const loaderHTML = `<div class="discover-loader w-full"><i data-lucide="loader-2" class="w-8 h-8 animate-spin"></i></div>`;
        actorResultsList.innerHTML = loaderHTML;
        studioResultsList.innerHTML = loaderHTML;
        if (window.lucide) lucide.createIcons();

        try {
            // Faz duas buscas simultâneas
            const [personData, companyData] = await Promise.all([
                fetchTMDB(`/search/person?query=${encodeURIComponent(query)}`),
                fetchTMDB(`/search/company?query=${encodeURIComponent(query)}`)
            ]);

            // Renderiza Atores
            this.#renderDiscoverActors(personData.results || [], actorResultsList);
            
            // Renderiza Estúdios (filtrando os que têm logo)
            const validStudios = (companyData.results || []).filter(studio => studio.logo_path);
            this.#renderDiscoverStudios(validStudios, studioResultsList);

        } catch (error) {
            console.error("Erro ao buscar (multi):", error);
            actorResultsList.innerHTML = '<div class="discover-loader w-full text-red-400">Erro ao buscar atores.</div>';
            studioResultsList.innerHTML = '<div class="discover-loader w-full text-red-400">Erro ao buscar estúdios.</div>';
        }
    }

    #openDiscoverModal() {
        this.#buildAndInjectDiscoverModal();
        
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        this.#discoverModal.classList.remove('pointer-events-none', 'opacity-0');
        this.#discoverModal.querySelector('#discover-modal-content').classList.remove('scale-95');
        
        // Limpa a busca e restaura a visualização popular ao abrir
        document.getElementById('discover-search-input').value = '';
        document.getElementById('discover-popular-content').classList.remove('hidden');
        document.getElementById('discover-search-content').classList.add('hidden');
        document.getElementById('discover-search-actors-list').innerHTML = '';
        document.getElementById('discover-search-studios-list').innerHTML = '';

        // Carrega os dados populares
        this.#loadDiscoverData();
    }

    #closeDiscoverModal() {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        this.#discoverModal.classList.add('opacity-0');
        this.#discoverModal.querySelector('#discover-modal-content').classList.add('scale-95');
        setTimeout(() => this.#discoverModal.classList.add('pointer-events-none'), 300);
    }

    /**
     * Carrega e renderiza o conteúdo popular (Estúdios e Atores).
     * @param {boolean} force - Força o recarregamento.
     */
    async #loadDiscoverData(force = false) {
        // Renderiza estúdios (lista estática)
        const studioContainer = document.getElementById('discover-studios-list');
        if (!studioContainer.querySelector('div') || force) {
            this.#renderDiscoverStudios(this.#discoverStudioList, studioContainer);
        }

        // Carrega e renderiza atores populares
        const actorsContainer = document.getElementById('discover-actors-list');
        if (!actorsContainer.innerHTML.includes('discover-actor-card') || force) {
            actorsContainer.innerHTML = `<div id="discover-actors-loader" class="discover-loader w-full"><i data-lucide="loader-2" class="w-8 h-8 animate-spin"></i></div>`;
            if (window.lucide) lucide.createIcons();

            try {
                const data = await fetchTMDB('/person/popular');
                this.#renderDiscoverActors(data.results || [], actorsContainer);
            } catch (error) {
                console.error("Erro ao carregar atores populares:", error);
                actorsContainer.innerHTML = 
                    '<div class="discover-loader w-full text-red-400">Erro ao carregar atores.</div>';
            }
        }
    }

    /**
     * Renderiza os cards de Estúdio no container especificado.
     * @param {Array} studios 
     * @param {HTMLElement} container
     */
    #renderDiscoverStudios(studios, container) {
        container.innerHTML = ''; // Limpa

        if (studios.length === 0) {
            container.innerHTML = '<p class="text-gray-500 p-4 text-center w-full">Nenhum estúdio encontrado.</p>';
            return;
        }

        // ==========================================================
        // MUDANÇA (Correção do Bug): USA A VARIÁVEL IMPORTADA IMG_POSTER_URL
        // ==========================================================
        // Troca o 'w500' (ou outro) da sua variável para 'w300'
        const logoBaseUrl = IMG_POSTER_URL.replace(/w\d+|original/, 'w300'); 

        studios.forEach(studio => {
            // Lógica para criar as iniciais (Sua Sugestão)
            let initials = '';
            const words = studio.name.split(' ');
            if (studio.id === 41077) {
                initials = 'A24';
            } else if (studio.id === 128064) {
                initials = 'DC';
            } else if (studio.id === 10342) {
                initials = 'SG';
            } else if (studio.id === 521) {
                initials = 'DWA';
            } else if (studio.id === 2) {
                initials = 'WDP';
            } else if (studio.id === 34) {
                initials = 'SONY';
            } else if (words.length >= 2) {
                initials = (words[0][0] + (words[1][0] || '')).toUpperCase();
            } else {
                initials = words[0].substring(0, 3).toUpperCase();
            }
            
            const card = document.createElement('div');
            card.className = 'discover-studio-card';
            
            const logoContainer = document.createElement('div');
            logoContainer.className = 'logo-container';
            
            const fallback = document.createElement('div');
            fallback.className = 'studio-initials';
            fallback.textContent = initials;

            // Se não tiver logo_path, já usa o fallback
            if (!studio.logo_path) {
                logoContainer.appendChild(fallback);
            } else {
                const img = document.createElement('img');
                img.src = `${logoBaseUrl}${studio.logo_path}`;
                img.alt = `Logo ${studio.name}`;
                
                // Listener de ERRO (o jeito certo)
                img.addEventListener('error', () => {
                    img.remove(); // Remove a imagem quebrada
                    logoContainer.appendChild(fallback); // Adiciona o fallback
                });
                
                logoContainer.appendChild(img);
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = studio.name;
            
            card.appendChild(logoContainer);
            card.appendChild(nameSpan);
            
            card.addEventListener('click', () => {
                this.#handleDiscoverStudioClick(studio.id, studio.name);
            });
            container.appendChild(card);
        });
    }

    /**
     * Renderiza os cards de Atores no container especificado.
     * @param {Array} actors 
     * @param {HTMLElement} container
     */
    #renderDiscoverActors(actors, container) {
        container.innerHTML = ''; // Limpa loader/conteúdo anterior

        const validActors = actors.filter(actor => actor.profile_path);

        if (validActors.length === 0) {
            container.innerHTML = '<p class="text-gray-500 p-4 text-center w-full">Nenhum ator encontrado.</p>';
            return;
        }

        validActors.forEach(actor => {
            const card = document.createElement('div');
            card.className = 'discover-actor-card';
            card.innerHTML = `
                <img src="${IMG_POSTER_URL}${actor.profile_path}" alt="${actor.name}">
                <span>${actor.name}</span>
            `;
            card.addEventListener('click', () => {
                this.#handleDiscoverActorClick(actor.id, actor.name);
            });
            container.appendChild(card);
        });
    }

    /**
     * Ação de clique no Estúdio: fecha modal e mostra grade.
     * @param {number} id 
     * @param {string} name 
     */
    #handleDiscoverStudioClick(id, name) {
        this.#closeDiscoverModal();
        this.#showDiscoverGrid(`Filmes de: ${name}`, id, 'movie');
    }

    /**
     * Ação de clique no Ator: fecha modal e mostra grade.
     * @param {number} id 
     * @param {string} name 
     */
    #handleDiscoverActorClick(id, name) {
        this.#closeDiscoverModal();
        this.#showDiscoverGrid(`Filmografia de: ${name}`, id, 'person');
    }

    /**
     * Limpa a página Sorte e exibe uma grade de resultados.
     * @param {string} title 
     * @param {number} entityId - O ID do estúdio ou da pessoa.
     * @param {'movie' | 'person'} fetchType 
     */
    async #showDiscoverGrid(title, entityId, fetchType) {
        this.#container.innerHTML = ''; // Limpa a página Sorte

        const gridHTML = `
            <div class="pt-24">
                <button id="discover-back-button" class="flex items-center space-x-2 text-gray-300 hover:text-white mb-6">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                    <span>Voltar</span>
                </button>
                
                <div class="flex justify-between items-center mb-8 gap-4">
                    <h2 class="text-3xl font-bold truncate">${title}</h2>
                    <select id="discover-sort-select" class="discover-sort-select flex-shrink-0">
                        <option value="popularity">Mais Populares</option>
                        <option value="rating">Melhores Avaliados</option>
                        <option value="date">Mais Recentes</option>
                        <option value="alpha">Ordem Alfabética (A-Z)</option>
                    </select>
                </div>

                <div id="discover-grid-loader" class="discover-loader h-64">
                    <i data-lucide="loader-2" class="w-10 h-10 animate-spin"></i>
                </div>
                <div id="discover-results-grid-container" class="discover-results-grid">
                    </div>
            </div>
        `;
        this.#container.innerHTML = gridHTML;
        if (window.lucide) {
            lucide.createIcons();
        }

        document.getElementById('discover-back-button').addEventListener('click', () => {
            this.showPage();
            this.#openDiscoverModal();
        });

        document.getElementById('discover-sort-select').addEventListener('change', (e) => {
            this.#sortAndRenderGrid(e.target.value);
        });

        try {
            let results = [];
            const gridContainer = document.getElementById('discover-results-grid-container');

            if (fetchType === 'movie') {
                const endpoint = `/discover/movie?with_companies=${entityId}&sort_by=popularity.desc`;
                const pagePromises = [];
                for (let i = 1; i <= 5; i++) { 
                    pagePromises.push(fetchTMDB(`${endpoint}&page=${i}`));
                }
                const responses = await Promise.all(pagePromises);
                const allResults = responses.flatMap(res => res.results || []);
                results = [...new Map(allResults.map(item => [item['id'], item])).values()];

            } else if (fetchType === 'person') {
                const [movieData, tvData] = await Promise.all([
                    fetchTMDB(`/person/${entityId}/movie_credits`),
                    fetchTMDB(`/person/${entityId}/tv_credits`)
                ]);

                const movieCast = (movieData.cast || []).map(m => ({...m, media_type: 'movie'}));
                const movieCrew = (movieData.crew || []).map(m => ({...m, media_type: 'movie'}));
                const tvCast = (tvData.cast || []).map(t => ({...t, media_type: 'tv'}));
                const tvCrew = (tvData.crew || []).map(t => ({...t, media_type: 'tv'}));

                const allCredits = [...movieCast, ...movieCrew, ...tvCast, ...tvCrew];
                const uniqueCredits = [...new Map(allCredits.map(item => [item['id'], item])).values()];
                
                results = uniqueCredits.sort((a, b) => b.popularity - a.popularity);
            }

            document.getElementById('discover-grid-loader').style.display = 'none';
            
            this.#discoverGridResults = results; 
            this.#renderGridItems(gridContainer, results); 

        } catch (error) {
            console.error(`Erro ao buscar dados para a grade: ${title}`, error);
            document.getElementById('discover-grid-loader').innerHTML = 
                '<div class="discover-loader w-full text-red-400">Erro ao carregar resultados.</div>';
        }
    }

    /**
     * Reordena e renderiza a grade
     * @param {string} sortType 
     */
    #sortAndRenderGrid(sortType) {
        let sortedResults = [...this.#discoverGridResults]; 

        switch (sortType) {
            case 'popularity':
                sortedResults.sort((a, b) => b.popularity - a.popularity);
                break;
            case 'rating':
                sortedResults.sort((a, b) => b.vote_average - a.vote_average);
                break;
            case 'date':
                sortedResults.sort((a, b) => {
                    const dateA = new Date(a.release_date || a.first_air_date || 0);
                    const dateB = new Date(b.release_date || b.first_air_date || 0);
                    return dateB - dateA;
                });
                break;
            case 'alpha':
                sortedResults.sort((a, b) => {
                    const titleA = a.title || a.name || '';
                    const titleB = b.title || b.name || '';
                    return titleA.localeCompare(titleB);
                });
                break;
        }

        const gridContainer = document.getElementById('discover-results-grid-container');
        this.#renderGridItems(gridContainer, sortedResults); 
    }


    /**
     * Renderiza os itens na grade de resultados.
     * @param {HTMLElement} container 
     * @param {Array} items 
     */
    #renderGridItems(container, items) {
        container.innerHTML = ''; 
        const validItems = items.filter(item => item.poster_path); 

        if (validItems.length === 0) {
            container.innerHTML = '<p class="text-gray-400">Nenhum resultado encontrado.</p>';
            return;
        }

        validItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'discover-grid-item';
            
            card.innerHTML = `
                <img src="${IMG_POSTER_URL}${item.poster_path}" alt="${item.title || item.name}">
                <div class="title-overlay">${item.title || item.name}</div>
            `;
            
            const mediaType = item.media_type || 'movie';

            card.addEventListener('click', () => {
                this.#app.publicOpenDetailsModal(item.id, mediaType);
            });
            container.appendChild(card);
        });
    }


    // ==========================================================
    // MÉTODOS DO MODAL "SURPREENDA-ME" (Existentes)
    // ==========================================================

    #buildAndInjectModal() {
        if (document.getElementById('surprise-modal')) return;

        const modalHTML = `
            <style>
                #surprise-modal-content { background-color: #181818; }
                input[type="radio"]:checked + div {
                    border-color: #E50914;
                }
                input[type="radio"]:checked + div div {
                    background-color: #E50914;
                    transform: scale(1);
                }
            </style>
            
            <div id="surprise-modal" class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-filter backdrop-blur-sm opacity-0 transition-opacity duration-300 pointer-events-none">
                
                <div id="surprise-modal-content" class="rounded-lg shadow-xl w-full max-w-lg transform scale-95 transition-all duration-300">
                    <div class="flex justify-between items-center p-4 border-b border-gray-700">
                        <h3 class="text-xl font-bold">Surpreenda-me</h3>
                        <button id="surprise-modal-close" class="text-gray-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <div class="p-6 space-y-6">
                        <p class="text-gray-300">Como você quer sua surpresa?</p>
                        <div class="space-y-3">
                            <label class="flex items-center p-3 bg-[#1f1f1f] rounded-lg hover:bg-[#333] transition-colors cursor-pointer">
                                <input type="radio" name="surprise-type" value="random" class="hidden" checked>
                                <div class="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center mr-3 transition-all duration-200 ease-in-out">
                                    <div class="w-3 h-3 rounded-full bg-transparent transform scale-0 transition-transform duration-200 ease-in-out"></div>
                                </div>
                                <span class="font-medium text-lg">Totalmente Aleatório</span>
                            </label>
                            <label class="flex items-center p-3 bg-[#1f1f1f] rounded-lg hover:bg-[#333] transition-colors cursor-pointer">
                                <input type="radio" name="surprise-type" value="genre" class="hidden">
                                <div class="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center mr-3 transition-all duration-200 ease-in-out">
                                    <div class="w-3 h-3 rounded-full bg-transparent transform scale-0 transition-transform duration-200 ease-in-out"></div>
                                </div>
                                <span class="font-medium text-lg">Por Gênero</span>
                            </label>
                        </div>
                        <div id="surprise-genre-select-container" class="hidden mt-4 pt-2">
                            <select id="surprise-genre-select" class="w-full p-3 bg-[#1f1f1f] border border-gray-600 rounded-md text-white focus:ring-red-500 focus:border-red-500 transition-colors">
                                <option value="">Carregando gêneros...</option>
                            </select>
                        </div>
                        <p id="surprise-error-message" class="text-red-400 text-sm hidden pt-2 text-center"></p>
                    </div>

                    <div class="p-4 bg-black/20 rounded-b-lg">
                        <button id="surprise-find-button" class="w-full flex items-center justify-center px-6 py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors space-x-2">
                            <span id="surprise-button-text">Encontrar Surpresa</span>
                            <i id="surprise-button-loader" data-lucide="loader-2" class="w-6 h-6 animate-spin hidden"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        if (window.lucide) {
            lucide.createIcons();
        }
        this.#surpriseModal = document.getElementById('surprise-modal');
        this.#addModalListeners();
    }

    #addModalListeners() {
        const modal = this.#surpriseModal;
        if (!modal) return;
        modal.querySelector('#surprise-modal-close').addEventListener('click', () => this.#closeSurpriseModal());
        
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.#closeSurpriseModal();
            }
        });

        modal.querySelectorAll('input[name="surprise-type"]').forEach(radio => {
            radio.addEventListener('change', (event) => this.#toggleGenreSelect(event.target.value));
        });
        modal.querySelector('#surprise-find-button').addEventListener('click', () => this.#handleSurpriseClick());
    }

    #openSurpriseModal() {
        this.#buildAndInjectModal();
        
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        if (this.#genres.length === 0) {
            this.#loadGenres();
        }
        this.#surpriseModal.querySelector('input[value="random"]').checked = true;
        this.#surpriseModal.querySelector('#surprise-genre-select-container').classList.add('hidden');
        this.#surpriseModal.querySelector('#surprise-error-message').classList.add('hidden');
        this.#setLoadingState(false);
        this.#surpriseModal.classList.remove('pointer-events-none', 'opacity-0');
        this.#surpriseModal.querySelector('#surprise-modal-content').classList.remove('scale-95');
    }

    #closeSurpriseModal() {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        this.#surpriseModal.classList.add('opacity-0');
        this.#surpriseModal.querySelector('#surprise-modal-content').classList.add('scale-95');
        setTimeout(() => this.#surpriseModal.classList.add('pointer-events-none'), 300);
    }

    #toggleGenreSelect(selectedValue) {
        const genreContainer = this.#surpriseModal.querySelector('#surprise-genre-select-container');
        if (selectedValue === 'genre') {
            genreContainer.classList.remove('hidden');
        } else {
            genreContainer.classList.add('hidden');
        }
    }

    async #loadGenres() {
        const select = this.#surpriseModal.querySelector('#surprise-genre-select');
        try {
            const [movieGenresData, tvGenresData] = await Promise.all([
                fetchTMDB('/genre/movie/list'),
                fetchTMDB('/genre/tv/list')
            ]);
            const movieGenres = movieGenresData?.genres || [];
            const tvGenres = tvGenresData?.genres || [];
            const genreMap = new Map();
            [...movieGenres, ...tvGenres].forEach(genre => {
                genreMap.set(genre.id, genre.name);
            });
            this.#genres = Array.from(genreMap, ([id, name]) => ({ id, name }))
                                .sort((a, b) => a.name.localeCompare(b.name));
            select.innerHTML = '<option value="">Selecione um gênero</option>';
            this.#genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.id;
                option.textContent = genre.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Erro ao carregar gêneros:", error);
            select.innerHTML = '<option value="">Não foi possível carregar</option>';
            this.#showError("Erro ao carregar gêneros. Tente fechar e abrir o modal.");
        }
    }

    #setLoadingState(isLoading) {
        const button = this.#surpriseModal.querySelector('#surprise-find-button');
        const text = this.#surpriseModal.querySelector('#surprise-button-text');
        const loader = this.#surpriseModal.querySelector('#surprise-button-loader');
        if (isLoading) {
            button.disabled = true;
            text.classList.add('hidden');
            loader.classList.remove('hidden');
            this.#showError(false);
        } else {
            button.disabled = false;
            text.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    #showError(message) {
        const errorEl = this.#surpriseModal.querySelector('#surprise-error-message');
        if (message) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        } else {
            errorEl.classList.add('hidden');
        }
    }

    async #handleSurpriseClick() {
        this.#setLoadingState(true);
        const surpriseType = this.#surpriseModal.querySelector('input[name="surprise-type"]:checked').value;
        const selectedGenreId = this.#surpriseModal.querySelector('#surprise-genre-select').value;

        if (surpriseType === 'genre' && !selectedGenreId) {
            this.#showError("Por favor, selecione um gênero.");
            this.#setLoadingState(false);
            return;
        }

        let foundItem = null;
        let foundMediaType = null;
        const MAX_ATTEMPTS = 5;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                const mediaType = (Math.random() < 0.5) ? 'movie' : 'tv';
                let baseUrl = `/discover/${mediaType}?sort_by=popularity.desc&vote_count.gte=100`;
                if (surpriseType === 'genre' && selectedGenreId) {
                    baseUrl += `&with_genres=${selectedGenreId}`;
                }
                const firstResponse = await fetchTMDB(`${baseUrl}&page=1`);
                const totalPages = firstResponse?.total_pages || 0;
                if (totalPages === 0) {
                    console.warn(`Tentativa ${attempt+1}: Nenhum resultado para ${mediaType} com gênero ${selectedGenreId}.`);
                    continue; 
                }
                const randomPage = Math.floor(Math.random() * Math.min(totalPages, 500)) + 1;
                const secondResponse = await fetchTMDB(`${baseUrl}&page=${randomPage}`);
                const results = secondResponse?.results || [];
                const validItems = results.filter(item => item.poster_path && item.backdrop_path && item.overview);
                if (validItems.length > 0) {
                    foundItem = validItems[Math.floor(Math.random() * validItems.length)];
                    foundMediaType = mediaType;
                    break; 
                }
            } catch (error) {
                console.error(`Tentativa ${attempt+1} falhou:`, error);
            }
        }

        this.#setLoadingState(false);
        if (foundItem && foundMediaType) {
            this.#closeSurpriseModal();
            this.#app.publicOpenDetailsModal(foundItem.id, foundMediaType);
        } else {
            this.#showError("Não encontramos uma surpresa com esses critérios. Tente novamente!");
        }
    }
}