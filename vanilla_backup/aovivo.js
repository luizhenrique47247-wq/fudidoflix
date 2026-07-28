// ARQUIVO: aovivo.js

export class AoVivoPage {
    #container;
    #app;
    
    // Estado da Aplicação Ao Vivo
    #allChannels = [];
    #channelsByCategory = {};
    #categoryMap = {};
    #activeCategory = null;
    #currentChannelId = null;
    #hls = null;
    #inactivityTimer = null;
    #searchTimeout = null;

    // Dicionário de Categorias
    #categoryTranslations = {
        "kids": "Infantil & Animação",
        "movies": "Filmes",
        "series": "Séries",
        "sports": "Esportes",
        "news": "Notícias",
        "documentary": "Documentários",
        "music": "Música",
        "religious": "Religião",
        "general": "TV Aberta",
        "entertainment": "Entretenimento",
        "other": "Outros"
    };

    constructor(container, app) {
        this.#container = container;
        this.#app = app;
    }

    /**
     * Helper para gerenciar os favoritos no LocalStorage
     */
    #getFavs() {
        return JSON.parse(localStorage.getItem('fudidoFlixAovivoFavs') || '[]');
    }

    #saveFavs(favs) {
        localStorage.setItem('fudidoFlixAovivoFavs', JSON.stringify(favs));
    }

    /**
     * Carrega a biblioteca HLS.js dinamicamente
     */
    async #loadHlsJs() {
        return new Promise((resolve, reject) => {
            if (window.Hls) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Exibe a interface do Ao Vivo
     */
    async showPage() {
        const customStyles = `
            <style>
                .aovivo-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .aovivo-scrollbar::-webkit-scrollbar-track { background: #0f0f15; }
                .aovivo-scrollbar::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 3px; }
                .aovivo-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f4e; }
                
                .active-channel { background-color: #1f1f2e !important; }
                .active-channel .epg-block { border-color: #E50914 !important; background-color: #2a2a35 !important; }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                footer { display: none !important; }
                body, html { overflow: hidden !important; }
            </style>
        `;

        this.#container.innerHTML = `
            ${customStyles}
            
            <div class="fixed top-[68px] left-0 right-0 bottom-0 bg-[#000] flex flex-col z-40 aovivo-container">
                
                <div id="aovivo-loading" class="absolute inset-0 bg-[#0f0f15] flex flex-col items-center justify-center z-50 transition-opacity duration-500">
                    <div class="w-16 h-16 border-4 border-gray-800 border-t-[#E50914] rounded-full animate-spin mb-6"></div>
                    <div class="text-3xl font-bold tracking-tight mb-2 text-white">Fudido<span class="text-[#E50914]">AoVivo</span></div>
                    <div id="aovivo-loading-text" class="text-gray-400 text-sm mt-4">Sintonizando canais via IPTV...</div>
                </div>

                <section id="player-section" class="w-full flex-shrink-0 relative bg-black aspect-video md:h-[55vh] md:aspect-auto z-10 border-b border-gray-800 shadow-2xl group">
                    <video id="aovivo-player" class="w-full h-full object-contain" controls autoplay muted playsinline></video>
                    
                    <div id="player-overlay" class="absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/90 to-transparent pointer-events-none transition-opacity duration-300">
                        <h2 id="overlay-title" class="text-xl md:text-4xl font-bold text-white drop-shadow-lg">Bem-vindo ao Ao Vivo</h2>
                        <p id="overlay-desc" class="text-sm md:text-lg text-gray-300 drop-shadow-md mt-1">Selecione um canal no guia abaixo</p>
                        
                        <button id="btn-fav-channel" class="pointer-events-auto mt-4 flex items-center gap-2 px-4 py-2 bg-black/60 border border-gray-600 rounded-full text-white hover:bg-gray-800 transition-colors w-fit">
                            <i data-lucide="star" id="icon-fav" class="w-5 h-5"></i>
                            <span id="text-fav" class="text-sm font-bold">Favoritar Canal</span>
                        </button>
                    </div>

                    <div id="error-overlay" class="hidden absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-20">
                        <i data-lucide="wifi-off" class="w-12 h-12 text-[#E50914] mb-4"></i>
                        <p class="text-white font-bold text-lg text-center px-4">Sinal Indisponível</p>
                        <p class="text-gray-400 text-sm text-center px-4 mt-2 max-w-md">Este canal está offline no momento ou a transmissão falhou. Tente sintonizar outro canal.</p>
                    </div>
                </section>

                <section class="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-[#0a0a0f]">
                    <aside class="w-full md:w-64 flex-shrink-0 bg-[#14141c] flex flex-col border-b md:border-b-0 md:border-r border-gray-800 z-10">
                        <div class="p-3 border-b border-gray-800">
                            <div class="relative">
                                <i data-lucide="search" class="w-4 h-4 absolute left-3 top-3 text-gray-500"></i>
                                <input type="text" id="aovivo-search-input" placeholder="Buscar canal..." class="w-full bg-[#0a0a0f] border border-gray-700 rounded-full py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-[#E50914] transition-colors">
                            </div>
                        </div>
                        <div id="categories-container" class="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col aovivo-scrollbar no-scrollbar">
                        </div>
                    </aside>

                    <main class="flex-1 flex flex-col overflow-hidden">
                        <div class="flex items-center bg-[#14141c] border-b border-gray-800 flex-shrink-0">
                            <div class="w-24 md:w-40 flex-shrink-0 p-2 border-r border-gray-800 text-[10px] md:text-xs font-bold text-gray-500 text-center uppercase tracking-wider">Canal</div>
                            <div class="flex-1 flex text-[10px] md:text-xs font-bold text-gray-500 px-2 py-3 uppercase tracking-wider">
                                <div class="flex-1 pl-2">Passando Agora</div>
                            </div>
                        </div>
                        <div id="channels-container" class="flex-1 overflow-y-auto aovivo-scrollbar pb-4">
                        </div>
                    </main>
                </section>
            </div>
        `;
        
        if (window.lucide) { lucide.createIcons(); }

        try {
            await this.#loadHlsJs();
            await this.#initIPTV();
        } catch (error) {
            console.error("Erro ao inicializar o Ao Vivo:", error);
            document.getElementById('aovivo-loading-text').innerHTML = `<span class="text-red-500 text-center px-4">Erro fatal ao carregar o sistema IPTV. Tente novamente mais tarde.</span>`;
        }
    }

    async #fetchM3UChannels() {
        const urls = [
            'https://gist.githubusercontent.com/luizhenrique47247-wq/705c6a6157a5e44fd40bb52d83e1f9b9/raw',
            'https://raw.githubusercontent.com/wardenczn/iptv-brasil/master/iptv.m3u',
            'https://iptv-org.github.io/iptv/countries/br.m3u'
        ];
        
        let m3uChannels = [];
        
        for (let url of urls) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                
                const text = await response.text();
                const lines = text.split('\n');
                let currentChannel = null;

                for (let line of lines) {
                    line = line.trim();
                    if (line.startsWith('#EXTINF:')) {
                        const tvgLogoMatch = line.match(/tvg-logo="([^"]+)"/i);
                        const groupTitleMatch = line.match(/group-title="([^"]+)"/i);
                        const nameMatch = line.match(/,(.+)$/);
                        
                        let cat = 'other';
                        if (groupTitleMatch && groupTitleMatch[1] && groupTitleMatch[1].trim() !== '') {
                            cat = groupTitleMatch[1].trim();
                        }

                        currentChannel = {
                            id: 'm3u_' + Math.random().toString(36).substr(2, 9),
                            name: nameMatch ? nameMatch[1].trim() : 'Canal',
                            logoUrl: tvgLogoMatch ? tvgLogoMatch[1] : null,
                            categories: [cat],
                            streamQuality: 'HD', 
                            country: 'BR'
                        };
                    } else if (line.startsWith('http') && currentChannel) {
                        currentChannel.streamUrl = line;
                        m3uChannels.push(currentChannel);
                        currentChannel = null;
                    }
                }
                
                if(m3uChannels.length > 0) break; 
                
            } catch (e) {
                console.warn("Falha ao carregar lista M3U alternativa:", e);
            }
        }
        return m3uChannels;
    }

    async #initIPTV() {
        try {
            const results = await Promise.allSettled([
                fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json()),
                fetch('https://iptv-org.github.io/api/streams.json').then(r => r.json()),
                fetch('https://iptv-org.github.io/api/categories.json').then(r => r.json()),
                fetch('https://iptv-org.github.io/api/logos.json').then(r => r.json()),
                this.#fetchM3UChannels() 
            ]);

            if(results[0].status === 'rejected' || results[1].status === 'rejected') {
                throw new Error("As APIs principais de canais estão offline.");
            }

            const channelsRes = results[0].value || [];
            const streamsRes = results[1].value || [];
            const categoriesRes = results[2].value || [];
            const logosRes = results[3].status === 'fulfilled' ? results[3].value : [];
            const customM3UChannels = results[4].status === 'fulfilled' ? results[4].value : [];

            const streamMap = {};
            streamsRes.forEach(s => {
                if (s.channel && s.url && !streamMap[s.channel]) streamMap[s.channel] = s;
            });

            const logoMap = {};
            logosRes.forEach(l => {
                if (l.channel && l.url && !logoMap[l.channel]) logoMap[l.channel] = l.url;
            });

            categoriesRes.forEach(c => { this.#categoryMap[c.id] = this.#categoryTranslations[c.id] || c.name; });
            
            // Configurações Base e Favoritos
            this.#categoryMap['other'] = "Outros";
            this.#categoryMap['all'] = "Todos os Canais"; 
            this.#categoryMap['favorites'] = "⭐ Favoritos"; 
            
            this.#channelsByCategory['all'] = [];
            this.#channelsByCategory['favorites'] = [];
            this.#allChannels = [];

            // Processar API Oficial
            channelsRes.forEach(c => {
                if (c.is_nsfw || c.country !== 'BR') return;
                
                if (c.name && c.name.toLowerCase().includes('1001 noites')) return;

                if (streamMap[c.id]) {
                    this.#allChannels.push({
                        id: c.id,
                        name: c.name,
                        country: c.country,
                        streamUrl: streamMap[c.id].url,
                        streamQuality: streamMap[c.id].quality || 'SD',
                        logoUrl: logoMap[c.id] || null,
                        categories: (c.categories && c.categories.length > 0) ? c.categories : ['other']
                    });
                }
            });

            // Unir Canais M3U
            const existingUrls = new Set(this.#allChannels.map(c => c.streamUrl));
            customM3UChannels.forEach(c => {
                if (c.name && c.name.toLowerCase().includes('1001 noites')) return;

                if(!existingUrls.has(c.streamUrl)) {
                    this.#allChannels.push(c);
                    existingUrls.add(c.streamUrl);
                }
            });

            if (this.#allChannels.length === 0) throw new Error("Nenhum canal ativo encontrado para o Brasil.");

            // Popula os favoritos se houver salvos
            const savedFavs = this.#getFavs();
            this.#allChannels.forEach(c => {
                if(savedFavs.includes(c.id)) {
                    this.#channelsByCategory['favorites'].push(c);
                }
            });

            // Agrupamento Inteligente
            this.#allChannels.forEach(channelData => {
                this.#channelsByCategory['all'].push(channelData); 
                let normCategories = new Set();
                
                channelData.categories.forEach(catId => {
                    if (!catId || catId === 'undefined' || catId === 'null') {
                        normCategories.add('other');
                        return;
                    }

                    const splitCats = catId.split(/[;\|>,]/); 
                    splitCats.forEach(rawCat => {
                        let normCat = rawCat.toLowerCase().trim();
                        if (normCat.match(/kid|infantil|crianç|desenho|anim|toon/)) normCategories.add('kids');
                        else if (normCat.match(/filme|movie|cinema/)) normCategories.add('movies');
                        else if (normCat.match(/série|serie|season/)) normCategories.add('series');
                        else if (normCat.match(/sport|esporte|futebol|outdoor|combate|luta|jogo/)) normCategories.add('sports');
                        else if (normCat.match(/news|notícia|jornal|inform|tempo|weather/)) normCategories.add('news');
                        else if (normCat.match(/doc|hist|sci|nature|animal/)) normCategories.add('documentary');
                        else if (normCat.match(/music|música|show|clipe|radio|rádio/)) normCategories.add('music');
                        else if (normCat.match(/religi|gospel|católic|deus|fé|igreja|crist/)) normCategories.add('religious');
                        else if (normCat.match(/aberta|geral|nacional|local|public|globo|sbt|record|band|pluto/)) normCategories.add('general');
                        else if (normCat.match(/variedade|entretenimento|comédia|lifestyle|shop|culinária|food|viagem/)) normCategories.add('entertainment');
                        else normCategories.add('other');
                    });
                });
                
                channelData.categories = Array.from(normCategories);
                channelData.categories.forEach(normCat => {
                    if (!this.#channelsByCategory[normCat]) this.#channelsByCategory[normCat] = [];
                    this.#channelsByCategory[normCat].push(channelData);
                });
            });

            // Limpeza de abas pequenas (Exceto all, other e favorites)
            Object.keys(this.#channelsByCategory).forEach(key => {
                if (key !== 'all' && key !== 'other' && key !== 'favorites' && this.#channelsByCategory[key].length < 3) {
                    if(!this.#channelsByCategory['other']) this.#channelsByCategory['other'] = [];
                    this.#channelsByCategory[key].forEach(ch => {
                        if (!this.#channelsByCategory['other'].find(c => c.streamUrl === ch.streamUrl)) {
                            this.#channelsByCategory['other'].push(ch);
                        }
                    });
                    delete this.#channelsByCategory[key]; 
                }
            });

            this.#updateCategoryUI();
            
            const loadingScreen = document.getElementById('aovivo-loading');
            loadingScreen.classList.add('opacity-0');
            setTimeout(() => loadingScreen.style.display = 'none', 500);

            // Abre nos Favoritos se tiver, senão em 'all'
            const startCategory = this.#channelsByCategory['favorites'].length > 0 ? 'favorites' : 'all';
            this.#selectCategory(startCategory);
            
            if(this.#channelsByCategory[startCategory].length > 0) {
                this.#playChannel(this.#channelsByCategory[startCategory][0]);
            }

            this.#setupInteractions();

        } catch (error) {
            console.error("Erro na inicialização do IPTV:", error);
            document.getElementById('aovivo-loading-text').innerHTML = `<span class="text-[#E50914] font-bold text-center px-4">Erro: ${error.message}</span>`;
        }
    }

    #updateCategoryUI() {
        const availableCategoryIds = Object.keys(this.#channelsByCategory)
            .filter(id => id !== 'all' && id !== 'favorites')
            .sort((a, b) => (this.#categoryMap[a] || a).localeCompare(this.#categoryMap[b] || b));
        
        availableCategoryIds.unshift('all');
        availableCategoryIds.unshift('favorites'); // Coloca Favoritos no topo absoluto

        this.#renderCategories(availableCategoryIds);
    }

    #renderCategories(catIds) {
        const container = document.getElementById('categories-container');
        container.innerHTML = ''; // Limpa antes de injetar
        const frag = document.createDocumentFragment();
        
        catIds.forEach(id => {
            const btn = document.createElement('button');
            btn.className = `w-auto md:w-full text-left px-5 py-4 text-sm font-bold text-gray-400 hover:text-white hover:bg-[#1f1f2e] transition-colors flex items-center justify-between whitespace-nowrap flex-shrink-0 md:flex-shrink cat-btn outline-none`;
            btn.id = `cat-${id}`;
            btn.onclick = () => this.#selectCategory(id);
            
            btn.innerHTML = `
                <span>${this.#categoryMap[id] || id}</span>
                <span class="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-500 hidden md:inline-block ml-2">${this.#channelsByCategory[id].length}</span>
            `;
            frag.appendChild(btn);
        });
        container.appendChild(frag);
    }

    #selectCategory(id) {
        this.#activeCategory = id;
        
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.remove('border-b-4', 'md:border-b-0', 'md:border-l-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
            btn.classList.add('text-gray-400');
        });
        
        const activeBtn = document.getElementById(`cat-${id}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-400');
            if(window.innerWidth < 768) {
                activeBtn.classList.add('border-b-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
            } else {
                activeBtn.classList.add('md:border-l-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
            }
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        this.#renderChannels(this.#channelsByCategory[id] || []);
    }

    #renderChannels(channelsList) {
        const container = document.getElementById('channels-container');
        container.innerHTML = '';
        
        if(channelsList.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-gray-500">Nenhum canal encontrado nesta aba.</div>`;
            return;
        }

        const frag = document.createDocumentFragment();
        const savedFavs = this.#getFavs();

        channelsList.forEach(channel => {
            const row = document.createElement('div');
            const isActive = channel.id === this.#currentChannelId;
            const isFav = savedFavs.includes(channel.id);
            
            row.className = `flex items-stretch border-b border-gray-800 hover:bg-[#1a1a24] cursor-pointer transition-colors group channel-row ${isActive ? 'active-channel' : ''}`;
            row.id = `channel-${channel.id}`;
            row.onclick = () => this.#playChannel(channel);
            
            const logoHtml = channel.logoUrl 
                ? `<img src="${channel.logoUrl}" class="max-h-10 max-w-[70px] object-contain drop-shadow-md" alt="${channel.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                   <span class="text-xs font-bold text-center truncate w-full text-gray-300 hidden px-1">${channel.name}</span>`
                : `<span class="text-xs font-bold text-center truncate w-full text-gray-300 px-1">${channel.name}</span>`;

            const qualityBadge = channel.streamQuality && channel.streamQuality !== 'SD' 
                ? `<span class="text-[9px] font-bold bg-[#E50914]/20 text-[#E50914] px-1.5 py-0.5 rounded ml-2 border border-[#E50914]/30 shadow-sm flex-shrink-0">${channel.streamQuality}</span>` 
                : '';

            const starIcon = isFav ? `<i data-lucide="star" class="w-3 h-3 text-yellow-400 fill-yellow-400 ml-2"></i>` : '';

            row.innerHTML = `
                <div class="w-24 md:w-40 flex-shrink-0 flex flex-col items-center justify-center p-2 border-r border-gray-800 bg-[#0f0f15] relative indicator-container">
                    ${isActive ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-[#E50914] status-bar"></div>' : ''}
                    ${logoHtml}
                </div>
                <div class="flex-1 p-1 md:p-2 flex overflow-hidden">
                    <div class="epg-block flex-1 bg-[#1a1a24] rounded flex items-center px-3 md:px-4 py-2 md:py-3 border ${isActive ? 'border-[#E50914] bg-[#2a2a35]' : 'border-transparent group-hover:border-gray-600'} transition-all min-w-[200px]">
                         <div class="flex flex-col w-full overflow-hidden">
                             <div class="flex items-center w-full">
                                 <span class="text-white font-bold text-sm md:text-base truncate mr-2">${channel.name}</span>
                                 ${starIcon}
                                 <div class="flex-1"></div>
                                 ${qualityBadge}
                             </div>
                             <span class="text-xs text-gray-400 truncate mt-1 font-medium">Programação Ao Vivo</span>
                         </div>
                    </div>
                </div>
            `;
            frag.appendChild(row);
        });
        
        container.appendChild(frag);
        if (window.lucide) { lucide.createIcons({ nodes: container.querySelectorAll('[data-lucide]') }); }
    }

    #toggleFavorite() {
        if (!this.#currentChannelId) return;
        const favs = this.#getFavs();
        const index = favs.indexOf(this.#currentChannelId);
        
        if (index > -1) {
            favs.splice(index, 1);
        } else {
            favs.push(this.#currentChannelId);
        }
        
        this.#saveFavs(favs);
        
        // Reconstrói o array de favoritos
        this.#channelsByCategory['favorites'] = this.#allChannels.filter(c => favs.includes(c.id));
        
        // Atualiza a UI do botão e do Menu Lateral
        this.#updateFavButton();
        this.#updateCategoryUI();
        
        // Garante que o menu ativo ainda esteja pintado de vermelho
        const activeBtn = document.getElementById(`cat-${this.#activeCategory}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-400');
            if(window.innerWidth < 768) {
                activeBtn.classList.add('border-b-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
            } else {
                activeBtn.classList.add('md:border-l-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
            }
        }

        // Se estivermos dentro da aba de favoritos, re-renderiza os canais
        if (this.#activeCategory === 'favorites') {
            this.#renderChannels(this.#channelsByCategory['favorites']);
            if (this.#channelsByCategory['favorites'].length === 0) {
                this.#selectCategory('all');
            }
        } else {
            // Se estivermos em outra aba, re-renderiza só pra atualizar as estrelinhas na grade
            this.#renderChannels(this.#channelsByCategory[this.#activeCategory]);
        }
    }

    #updateFavButton() {
        const btn = document.getElementById('btn-fav-channel');
        const icon = document.getElementById('icon-fav');
        const text = document.getElementById('text-fav');
        if(!btn || !this.#currentChannelId) return;
        
        const isFav = this.#getFavs().includes(this.#currentChannelId);
        
        if(isFav) {
            btn.classList.add('bg-[#E50914]/20', 'border-[#E50914]');
            btn.classList.remove('bg-black/60', 'border-gray-600');
            text.innerText = "Nos Favoritos";
            icon.setAttribute('fill', '#E50914');
            icon.setAttribute('color', '#E50914');
        } else {
            btn.classList.remove('bg-[#E50914]/20', 'border-[#E50914]');
            btn.classList.add('bg-black/60', 'border-gray-600');
            text.innerText = "Adicionar aos Favoritos";
            icon.setAttribute('fill', 'none');
            icon.setAttribute('color', 'currentColor');
        }
    }

    #playChannel(channel) {
        this.#currentChannelId = channel.id;
        const video = document.getElementById('aovivo-player');
        const errorOverlay = document.getElementById('error-overlay');
        
        document.querySelectorAll('.channel-row').forEach(row => {
            row.classList.remove('active-channel');
            const block = row.querySelector('.epg-block');
            const indicator = row.querySelector('.status-bar');
            if(indicator) indicator.remove();
            if(block) {
                block.classList.remove('border-[#E50914]', 'bg-[#2a2a35]');
                block.classList.add('border-transparent');
            }
        });
        
        const activeRow = document.getElementById(`channel-${channel.id}`);
        if (activeRow) {
            activeRow.classList.add('active-channel');
            const imgContainer = activeRow.querySelector('.indicator-container');
            if(imgContainer && !imgContainer.querySelector('.status-bar')) {
                imgContainer.insertAdjacentHTML('afterbegin', '<div class="absolute left-0 top-0 bottom-0 w-1 bg-[#E50914] status-bar"></div>');
            }
            const block = activeRow.querySelector('.epg-block');
            if(block) {
                block.classList.remove('border-transparent');
                block.classList.add('border-[#E50914]', 'bg-[#2a2a35]');
            }
        }

        document.getElementById('overlay-title').innerText = channel.name;
        const channelCategoryText = (this.#activeCategory === 'all' || this.#activeCategory === 'favorites') && channel.categories[0] 
            ? this.#categoryMap[channel.categories[0]] || 'TV' 
            : this.#categoryMap[this.#activeCategory] || 'TV';
        document.getElementById('overlay-desc').innerText = `Ao Vivo • ${channelCategoryText}`;
        
        this.#updateFavButton();
        
        errorOverlay.classList.add('hidden');
        this.#resetOverlayTimer();

        if (this.#hls) { 
            this.#hls.destroy(); 
            this.#hls = null; 
        }

        const streamUrl = channel.streamUrl;

        if (Hls.isSupported()) {
            this.#hls = new Hls({ maxMaxBufferLength: 30, enableWorker: true });
            this.#hls.loadSource(streamUrl);
            this.#hls.attachMedia(video);
            
            this.#hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.warn("Autoplay bloqueado pelo navegador:", e));
            });
            
            this.#hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        this.#hls.startLoad();
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        this.#hls.recoverMediaError();
                    } else {
                        this.#hls.destroy();
                        this.#showError();
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.warn("Autoplay bloqueado pelo navegador:", e));
            });
            video.addEventListener('error', () => this.#showError());
        } else {
            this.#showError();
        }

        if(window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    #showError() {
        document.getElementById('error-overlay').classList.remove('hidden');
    }

    #resetOverlayTimer() {
        clearTimeout(this.#inactivityTimer);
        const overlay = document.getElementById('player-overlay');
        if(overlay) {
            overlay.style.opacity = '1';
            this.#inactivityTimer = setTimeout(() => { overlay.style.opacity = '0'; }, 3000);
        }
    }

    #setupInteractions() {
        const playerSection = document.getElementById('player-section');
        if (playerSection) {
            playerSection.addEventListener('mousemove', () => this.#resetOverlayTimer());
            playerSection.addEventListener('touchstart', () => this.#resetOverlayTimer());
        }

        // Listener do botão de Favoritar
        const favBtn = document.getElementById('btn-fav-channel');
        if (favBtn) {
            favBtn.addEventListener('click', () => this.#toggleFavorite());
        }

        const searchInput = document.getElementById('aovivo-search-input');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.#searchTimeout);
                
                this.#searchTimeout = setTimeout(() => {
                    const term = e.target.value.toLowerCase().trim();
                    
                    if (!term) {
                        this.#renderChannels(this.#channelsByCategory[this.#activeCategory] || []);
                        const activeBtn = document.getElementById(`cat-${this.#activeCategory}`);
                        if (activeBtn) {
                            activeBtn.classList.add(window.innerWidth < 768 ? 'border-b-4' : 'md:border-l-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
                        }
                        return;
                    }

                    document.querySelectorAll('.cat-btn').forEach(btn => {
                        btn.classList.remove('border-b-4', 'md:border-b-0', 'md:border-l-4', 'border-[#E50914]', 'bg-[#1f1f2e]', 'text-white');
                        btn.classList.add('text-gray-400');
                    });

                    const results = this.#allChannels.filter(c => c.name.toLowerCase().includes(term));
                    this.#renderChannels(results);
                }, 300);
            });
        }
        
        window.addEventListener('resize', () => {
            if(this.#activeCategory) this.#selectCategory(this.#activeCategory);
        });
    }
}