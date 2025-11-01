// ARQUIVO: sorte.js (Substitua o conteúdo deste arquivo)

import { fetchTMDB, IMG_POSTER_URL } from './api.js';

/**
 * Classe para gerenciar a lógica da página "Sorte".
 * Inclui o modal "Surpreenda-me" e o novo modal "Roleta de Filmes".
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
    
    // Apenas 3 tons de vermelho
    #roletaCores = ['#E50914', '#B20710', '#831010'];
    
    #searchTimeout = null;
    #isSpinning = false;
    #currentRotation = 0;
    #SPIN_DURATION = 10000; // 10 segundos

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

        // --- Card 3: Em Breve ---
        const card3 = document.createElement('div');
        card3.className = 'bg-gray-900 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[250px] opacity-50 cursor-not-allowed';
        card3.innerHTML = `
            <i data-lucide="sparkles" class="w-16 h-16 text-gray-600 mb-4"></i>
            <h3 class="text-2xl font-bold mb-2">Em Breve</h3>
            <p class="text-gray-500">Novas formas divertidas de descobrir conteúdo.</p>
        `;
        gridContainer.appendChild(card3);

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // ==========================================================
    // MÉTODOS DO MODAL "ROLETAS"
    // ==========================================================

    /**
     * Injeta o HTML e CSS do modal da Roleta no <body>.
     */
    #buildAndInjectRouletteModal() {
        if (document.getElementById('roulette-modal')) return; // Já existe

        const modalHTML = `
            <style>
                #roulette-modal { background-color: rgba(0,0,0,0.85); backdrop-filter: blur(5px); }
                #roulette-modal-content { background-color: #181818; max-height: 95vh; }
                #roulette-search-input { background-color: #333; }
                #roulette-search-results {
                    position: absolute;
                    top: 100%; /* Posiciona abaixo do input */
                    left: 0;
                    right: 0;
                    background-color: #222;
                    max-height: 300px;
                    z-index: 20; /* Garante que fique sobre a lista de itens */
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

                /* ========================================================== */
                /* MUDANÇA (Request 1): Seta com contorno preto via ::after */
                /* ========================================================== */
                #roulette-pointer {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0; 
                    height: 0;
                    z-index: 10;
                    /* Triângulo PRETO (borda) - 2px maior */
                    border-left: 22px solid transparent;
                    border-right: 22px solid transparent;
                    border-top: 33px solid #000;
                }
                #roulette-pointer::after {
                    content: '';
                    position: absolute;
                    top: -32px; /* 1px abaixo da borda preta */
                    left: -20px; /* 2px de borda de cada lado */
                    width: 0;
                    height: 0;
                    /* Triângulo VERMELHO (preenchimento) */
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
                                <input type="text" id="roulette-search-input" placeholder="Pesquisar filme ou série..." class="w-full p-3 rounded-md text-white border-0 focus:ring-2 focus:ring-red-500">
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

        // Armazena referências
        this.#rouletteModal = document.getElementById('roulette-modal');
        this.#roletaCanvas = document.getElementById('roulette-canvas');
        this.#roletaCtx = this.#roletaCanvas.getContext('2d');
        
        // Adiciona Listeners
        this.#addRouletteListeners();
        
        // Desenha o estado inicial
        this.#updateRouletteListUI(); // Garante que a msg de vazio apareça
        this.#drawRoulette();
    }
    
    /**
     * Adiciona todos os event listeners para o modal da roleta.
     */
    #addRouletteListeners() {
        const modal = this.#rouletteModal;
        if (!modal) return;

        // Botões de fechar
        modal.querySelector('#roulette-close-button').addEventListener('click', () => this.#closeRouletteModal());
        document.getElementById('roulette-result-close-btn').addEventListener('click', () => this.#closeResultModal());

        // Botão de Detalhes
        document.getElementById('roulette-result-details-btn').addEventListener('click', () => this.#handleResultDetailsClick());

        // Botão Girar
        document.getElementById('roulette-spin-button').addEventListener('click', () => this.#handleSpinClick());

        // Busca
        const searchInput = document.getElementById('roulette-search-input');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.#searchTimeout);
            this.#searchTimeout = setTimeout(() => this.#runSearch(e.target.value), 300); 
        });

        // Limpa resultados ao perder foco
        searchInput.addEventListener('blur', () => {
            setTimeout(() => document.getElementById('roulette-search-results').innerHTML = '', 200); // Pequeno delay
        });

        // Lista de Itens (para remoção)
        document.getElementById('roulette-items-list').addEventListener('click', (e) => {
            if (e.target.closest('.remove-roleta-item')) {
                const id = e.target.closest('.roulette-list-item').dataset.id;
                this.#removeItemFromRoulette(Number(id));
            }
        });
    }

    #openRouletteModal() {
        this.#buildAndInjectRouletteModal(); // Garante que existe
        
        // MUDANÇA (Request 2): Esconde a barra de rolagem principal
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        this.#rouletteModal.classList.remove('pointer-events-none', 'opacity-0');
        this.#rouletteModal.querySelector('#roulette-modal-content').classList.remove('scale-95');
        
        // MUDANÇA (Request 2): Garante que a roleta comece limpa
        if (this.#roletaItems.length > 0) {
            this.#roletaItems = [];
            this.#saveRoletaItems(); // Salva o array vazio (ou remove)
            this.#updateRouletteListUI();
            this.#drawRoulette();
        }
    }

    #closeRouletteModal() {
        // MUDANÇA (Request 2): Restaura a barra de rolagem principal
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        this.#rouletteModal.classList.add('opacity-0');
        this.#rouletteModal.querySelector('#roulette-modal-content').classList.add('scale-95');
        setTimeout(() => this.#rouletteModal.classList.add('pointer-events-none'), 300);

        // MUDANÇA (Request 2): Limpa os itens ao fechar
        this.#roletaItems = [];
        this.#saveRoletaItems(); // Remove do localStorage
        this.#updateRouletteListUI();
        this.#drawRoulette(); // Redesenha para o estado vazio
    }

    /**
     * Executa a busca na API TMDB.
     * @param {string} query 
     */
    async #runSearch(query) {
        const resultsContainer = document.getElementById('roulette-search-results');
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }

        const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
        const results = data?.results || [];
        
        // Filtra pessoas, itens sem poster, e pega no max 5
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
            // Adiciona o item ao clicar
            itemEl.addEventListener('mousedown', () => { // mousedown para ser mais rápido que o 'blur'
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
        // Evita duplicatas
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

    /**
     * Atualiza a lista visual de itens adicionados.
     */
    #updateRouletteListUI() {
        const listEl = document.getElementById('roulette-items-list');
        listEl.innerHTML = ''; // Limpa

        if (this.#roletaItems.length === 0) {
            // ==========================================================
            // MUDANÇA (Request 2 - bug fix): Recria a mensagem de vazio
            // ==========================================================
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

    /**
     * Salva/Carrega a lista da roleta no localStorage.
     */
    #saveRoletaItems() {
        if (this.#roletaItems.length > 0) {
            localStorage.setItem('fudidoFlixRoleta', JSON.stringify(this.#roletaItems));
        } else {
            localStorage.removeItem('fudidoFlixRoleta');
        }
    }
    
    /**
     * Desenha a roleta no Canvas.
     */
    #drawRoulette() {
        const n = this.#roletaItems.length;
        const canvas = this.#roletaCanvas;
        const ctx = this.#roletaCtx;

        // Limpa o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Habilita/Desabilita o botão
        document.getElementById('roulette-spin-button').disabled = (n < 2);

        // Define o contorno
        ctx.strokeStyle = '#000000'; // Contorno preto
        ctx.lineWidth = 2;         // Largura do contorno

        if (n < 1) {
            // Desenha um placeholder (círculo cinza)
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(200, 200, 190, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke(); // Adiciona contorno ao círculo vazio
            return;
        }

        const arcSize = (2 * Math.PI) / n;
        const radius = 190; // Raio
        const center = 200; // Centro (x e y)

        for (let i = 0; i < n; i++) {
            const item = this.#roletaItems[i];
            const angle = (i * arcSize) - (Math.PI / 2); // Começa do topo

            // 1. Desenha o segmento
            ctx.beginPath();
            ctx.fillStyle = this.#roletaCores[i % this.#roletaCores.length];
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, angle, angle + arcSize);
            ctx.closePath();
            ctx.fill();
            
            // Desenha o contorno do segmento
            ctx.stroke();

            // 2. Desenha o texto
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(angle + arcSize / 2); // Rotaciona para o meio do segmento
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFFFFF'; // Texto sempre branco
            ctx.font = 'bold 14px Inter, sans-serif';
            
            // Trunca texto longo
            let title = item.title;
            if (title.length > 18) {
                title = title.substring(0, 15) + '...';
            }
            
            ctx.fillText(title, radius - 15, 5); // 15px de padding da borda
            ctx.restore();
        }
    }

    /**
     * Lógica para girar a roleta.
     */
    #handleSpinClick() {
        if (this.#isSpinning) return;
        this.#isSpinning = true;

        // Desabilita controles
        this.#setControlsDisabled(true);
        
        // Zera a rotação do canvas para o CSS funcionar corretamente
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

        // Aplica a animação
        this.#roletaCanvas.style.transition = `transform ${this.#SPIN_DURATION / 1000}s cubic-bezier(0.22, 1, 0.36, 1)`;
        this.#roletaCanvas.style.transform = `rotate(${this.#currentRotation}deg)`;

        // Define o vencedor
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

    /**
     * Mostra o modal de resultado com o vencedor.
     * @param {object} winner 
     */
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

        // Re-habilita os controles
        this.#setControlsDisabled(false);
    }

    /**
     * Abre o modal de detalhes do app principal.
     */
    #handleResultDetailsClick() {
        const winnerData = document.getElementById('roulette-result-details-btn').dataset.winner;
        if (!winnerData) return;

        const winner = JSON.parse(winnerData);
        this.#closeResultModal();
        this.#closeRouletteModal();
        this.#app.publicOpenDetailsModal(winner.id, winner.media_type);
    }

    /**
     * Habilita/Desabilita todos os controles da roleta.
     * @param {boolean} disabled 
     */
    #setControlsDisabled(disabled) {
        document.getElementById('roulette-search-input').disabled = disabled;
        document.getElementById('roulette-spin-button').disabled = disabled || (this.#roletaItems.length < 2);
        
        document.querySelectorAll('.remove-roleta-item').forEach(btn => {
            btn.disabled = disabled;
        });

        // MUDANÇA (Request 3): Remove a opacidade
        // (As linhas que mudavam a opacidade foram removidas)
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
        
        // MUDANÇA (Request 2): Esconde a barra de rolagem principal
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
        // MUDANÇA (Request 2): Restaura a barra de rolagem principal
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        this.#surpriseModal.classList.add('opacity-0');
        this.#surpriseModal.querySelector('#surprise-modal-content').classList.add('scale-9E5');
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