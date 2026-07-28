// ARQUIVO: mangas.js

export class MangasPage {
    #container;
    #app;
    
    // MangaDex APIs
    #API_BASE = 'https://api.mangadex.org';
    #UPLOADS_BASE = 'https://uploads.mangadex.org';

    #currentChapters = [];
    #currentChapterIndex = -1;

    constructor(container, app) {
        this.#container = container;
        this.#app = app;
    }

    /**
     * Função Mágica Anti-CORS: 
     * Tenta puxar direto. Se o GitHub Pages for bloqueado, usa o Proxy automaticamente.
     */
    async #fetchAPI(endpoint) {
        const targetUrl = this.#API_BASE + endpoint;
        try {
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error('Bloqueio CORS ou erro na API');
            return await response.json();
        } catch (error) {
            console.warn("Conexão direta falhou. Ativando Proxy Anti-CORS...", error);
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
            const proxyResponse = await fetch(proxyUrl);
            return await proxyResponse.json();
        }
    }

    async showPage() {
        this.#container.innerHTML = `
            <div class="pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-20 min-h-screen flex flex-col">
                
                <div id="manga-view-grid" class="flex-1 transition-opacity duration-300">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div class="flex items-center">
                            <i data-lucide="book-open" class="w-10 h-10 text-[#E50914] mr-4"></i>
                            <h2 class="text-4xl font-bold">MangáReader</h2>
                        </div>
                        
                        <div class="flex items-center gap-4 w-full md:w-auto">
                            <div class="bg-[#181818] rounded-lg p-1 flex border border-gray-800">
                                <button id="btn-manga-populares" class="px-4 py-2 rounded-md bg-[#E50914] text-white font-semibold text-sm transition-colors">Populares</button>
                                <button id="btn-manga-atualizados" class="px-4 py-2 rounded-md text-gray-400 hover:text-white font-semibold text-sm transition-colors">Atualizados</button>
                            </div>
                            
                            <form id="manga-search-form" class="relative flex-1 md:w-64">
                                <i data-lucide="search" class="absolute left-3 top-2.5 w-5 h-5 text-gray-500"></i>
                                <input type="text" id="manga-search-input" class="w-full bg-[#181818] border border-gray-700 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:border-[#E50914] focus:outline-none transition-colors" placeholder="Pesquisar (ex: Zinabre)...">
                            </form>
                        </div>
                    </div>

                    <div id="manga-loading" class="hidden text-gray-400 text-lg flex items-center justify-center py-20">
                        <i data-lucide="loader-2" class="w-8 h-8 mr-3 animate-spin text-[#E50914]"></i> Buscando no MangaDex...
                    </div>

                    <div id="manga-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"></div>
                </div>

                <div id="manga-view-details" class="hidden flex-1 transition-opacity duration-300">
                    <button id="manga-back-btn" class="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-[#181818] px-4 py-2 rounded-lg border border-gray-800 w-fit hover:border-gray-600">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i> Voltar ao Catálogo
                    </button>
                    
                    <div class="bg-[#141414] rounded-2xl p-6 shadow-2xl border border-gray-800 flex flex-col md:flex-row gap-8 mb-8">
                        <div class="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                            <img id="manga-detail-cover" src="" referrerpolicy="no-referrer" class="w-full rounded-xl shadow-lg object-cover aspect-[2/3] border border-gray-800">
                            <div class="mt-4 flex gap-2 justify-center">
                                <span id="manga-detail-status" class="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full border border-green-500/30 uppercase">Status</span>
                                <span id="manga-detail-age" class="px-3 py-1 bg-[#181818] text-gray-300 text-xs font-bold rounded-full border border-gray-700">L</span>
                            </div>
                        </div>
                        
                        <div class="flex-1 flex flex-col">
                            <h1 id="manga-detail-title" class="text-3xl sm:text-5xl font-extrabold text-white mb-2 leading-tight">Carregando...</h1>
                            <p id="manga-detail-author" class="text-[#E50914] font-medium text-lg mb-6 flex items-center gap-2">
                                <i data-lucide="pen-tool" class="w-5 h-5"></i> Autor
                            </p>
                            
                            <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Sinopse</h3>
                            <p id="manga-detail-desc" class="text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-line bg-[#181818] p-4 rounded-xl border border-gray-800 mb-6">
                                Carregando...
                            </p>
                            
                            <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Gêneros</h3>
                            <div id="manga-detail-tags" class="flex flex-wrap gap-2 mb-4"></div>
                        </div>
                    </div>

                    <div class="mb-4 flex items-center justify-between">
                        <h2 class="text-2xl font-bold flex items-center gap-2"><i data-lucide="list" class="w-6 h-6 text-[#E50914]"></i> Capítulos (PT-BR)</h2>
                        <span id="manga-chapter-count" class="text-sm font-bold bg-[#E50914] px-3 py-1 rounded-full">0</span>
                    </div>
                    
                    <div id="manga-chapters-loading" class="hidden text-center py-10 text-gray-400">
                        <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-2"></i> Carregando capítulos...
                    </div>
                    
                    <div class="bg-[#181818] rounded-xl border border-gray-800 overflow-hidden">
                        <ul id="manga-chapters-list" class="divide-y divide-gray-800 max-h-[500px] overflow-y-auto"></ul>
                    </div>
                </div>

                <div id="manga-view-reader" class="hidden flex-1 bg-black rounded-xl border border-gray-800 overflow-hidden relative">
                    
                    <div class="sticky top-0 z-40 bg-[#101010]/95 backdrop-blur shadow-md border-b border-gray-800 p-4 flex items-center justify-between">
                        <button id="reader-close-btn" class="flex items-center gap-2 text-gray-300 hover:text-white bg-[#181818] hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors border border-gray-700">
                            <i data-lucide="x" class="w-5 h-5"></i> <span class="hidden sm:inline">Sair</span>
                        </button>
                        <div class="text-center flex-1 px-4">
                            <h2 id="reader-title" class="text-xs text-gray-400 truncate uppercase tracking-widest">Mangá</h2>
                            <h1 id="reader-chapter" class="text-lg font-bold text-white truncate">Capítulo</h1>
                        </div>
                        <div class="flex gap-2">
                            <button id="reader-prev-btn" class="flex items-center justify-center text-gray-300 hover:text-white bg-[#181818] hover:bg-gray-800 w-10 h-10 rounded-lg transition-colors border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Capítulo Anterior">
                                <i data-lucide="chevron-left" class="w-6 h-6"></i>
                            </button>
                            <button id="reader-next-btn" class="flex items-center justify-center text-gray-300 hover:text-white bg-[#181818] hover:bg-gray-800 w-10 h-10 rounded-lg transition-colors border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Próximo Capítulo">
                                <i data-lucide="chevron-right" class="w-6 h-6"></i>
                            </button>
                        </div>
                    </div>

                    <div id="reader-pages-container" class="flex flex-col gap-2 p-2 sm:p-4 pb-20 items-center bg-[#0a0a0a] min-h-[60vh]"></div>
                    
                    <div class="p-8 border-t border-gray-800 bg-[#101010] flex justify-center gap-4">
                        <button id="reader-next-bottom-btn" class="bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center gap-2 hidden">
                            Próximo Capítulo <i data-lucide="arrow-right" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>

            </div>
        `;
        
        if (window.lucide) { lucide.createIcons(); }
        this.#setupListeners();
        
        // Inicia na aba de populares
        this.#loadGrid('popular');
    }

    #setupListeners() {
        const btnPop = document.getElementById('btn-manga-populares');
        const btnAtu = document.getElementById('btn-manga-atualizados');
        const searchForm = document.getElementById('manga-search-form');
        
        btnPop.onclick = () => {
            btnPop.classList.replace('bg-transparent', 'bg-[#E50914]'); btnPop.classList.replace('text-gray-400', 'text-white');
            btnAtu.classList.replace('bg-[#E50914]', 'bg-transparent'); btnAtu.classList.replace('text-white', 'text-gray-400');
            document.getElementById('manga-search-input').value = '';
            this.#loadGrid('popular');
        };

        btnAtu.onclick = () => {
            btnAtu.classList.replace('bg-transparent', 'bg-[#E50914]'); btnAtu.classList.replace('text-gray-400', 'text-white');
            btnPop.classList.replace('bg-[#E50914]', 'bg-transparent'); btnPop.classList.replace('text-white', 'text-gray-400');
            document.getElementById('manga-search-input').value = '';
            this.#loadGrid('latest');
        };

        searchForm.onsubmit = (e) => {
            e.preventDefault();
            const query = document.getElementById('manga-search-input').value.trim();
            if (query) this.#loadGrid('search', query);
        };

        document.getElementById('manga-back-btn').onclick = () => this.#switchView('grid');
        document.getElementById('reader-close-btn').onclick = () => this.#switchView('details');
        
        document.getElementById('reader-prev-btn').onclick = () => this.#navigateChapter(-1);
        document.getElementById('reader-next-btn').onclick = () => this.#navigateChapter(1);
        document.getElementById('reader-next-bottom-btn').onclick = () => this.#navigateChapter(1);
    }

    #switchView(view) {
        document.getElementById('manga-view-grid').classList.add('hidden');
        document.getElementById('manga-view-details').classList.add('hidden');
        document.getElementById('manga-view-reader').classList.add('hidden');
        
        document.getElementById(`manga-view-${view}`).classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async #loadGrid(type, query = '') {
        const grid = document.getElementById('manga-grid');
        const loading = document.getElementById('manga-loading');
        
        grid.innerHTML = '';
        loading.classList.remove('hidden');

        try {
            let endpoint = '';
            const baseParams = 'limit=30&includes[]=cover_art&includes[]=author&availableTranslatedLanguage[]=pt-br&hasAvailableChapters=true';

            if (type === 'popular') endpoint = `/manga?${baseParams}&order[followedCount]=desc`;
            else if (type === 'latest') endpoint = `/manga?${baseParams}&order[latestUploadedChapter]=desc`;
            else if (type === 'search') endpoint = `/manga?title=${encodeURIComponent(query)}&${baseParams}&order[relevance]=desc`;

            const data = await this.#fetchAPI(endpoint);
            
            loading.classList.add('hidden');

            if (data.data.length === 0) {
                grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">Nenhum mangá encontrado.</div>`;
                return;
            }

            data.data.forEach(manga => {
                const title = manga.attributes.title['pt-br'] || manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Sem Título';
                const coverRel = manga.relationships.find(r => r.type === 'cover_art');
                const authorRel = manga.relationships.find(r => r.type === 'author');
                
                const coverImg = coverRel?.attributes?.fileName ? `${this.#UPLOADS_BASE}/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg` : `https://placehold.co/256x384/181818/FFF?text=Capa`;
                const authorName = authorRel?.attributes?.name || 'Desconhecido';

                const card = document.createElement('div');
                card.className = "group relative bg-[#141414] rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-transform duration-300 border border-gray-800 shadow-lg flex flex-col";
                card.onclick = () => this.#loadDetails(manga, coverImg, authorName);

                card.innerHTML = `
                    <div class="relative aspect-[2/3] bg-[#101010]">
                        <img src="${coverImg}" referrerpolicy="no-referrer" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" onerror="this.src='https://placehold.co/256x384/181818/FFF?text=Capa'">
                        <div class="absolute bottom-2 left-2 right-2 flex justify-between">
                            <span class="px-2 py-0.5 bg-black/80 rounded text-[10px] font-bold text-white border border-gray-700">${manga.attributes.status}</span>
                        </div>
                    </div>
                    <div class="p-3 flex-1 flex flex-col">
                        <h3 class="font-bold text-sm text-gray-200 line-clamp-2 group-hover:text-[#E50914] transition-colors">${title}</h3>
                        <p class="text-xs text-gray-500 mt-1 truncate">${authorName}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

        } catch (error) {
            console.error(error);
            loading.innerHTML = "Erro ao buscar mangás.";
        }
    }

    async #loadDetails(manga, coverUrl, authorName) {
        this.#switchView('details');
        
        const title = manga.attributes.title['pt-br'] || manga.attributes.title.en || Object.values(manga.attributes.title)[0];
        let desc = manga.attributes.description['pt-br'] || manga.attributes.description.en || Object.values(manga.attributes.description)[0] || 'Nenhuma descrição disponível.';

        document.getElementById('manga-detail-cover').src = coverUrl;
        document.getElementById('manga-detail-title').textContent = title;
        document.getElementById('manga-detail-author').innerHTML = `<i data-lucide="pen-tool" class="w-5 h-5"></i> ${authorName}`;
        document.getElementById('manga-detail-desc').textContent = desc;
        document.getElementById('manga-detail-status').textContent = manga.attributes.status;
        
        const isAdult = manga.attributes.contentRating !== 'safe';
        const ageEl = document.getElementById('manga-detail-age');
        ageEl.textContent = isAdult ? '+18' : 'L';
        ageEl.className = isAdult ? 'px-3 py-1 bg-red-900/30 text-red-500 text-xs font-bold rounded-full border border-red-800' : 'px-3 py-1 bg-green-900/30 text-green-500 text-xs font-bold rounded-full border border-green-800';

        const tagsContainer = document.getElementById('manga-detail-tags');
        tagsContainer.innerHTML = '';
        manga.attributes.tags.forEach(t => {
            const tagName = t.attributes.name['pt-br'] || t.attributes.name.en;
            if (tagName) tagsContainer.innerHTML += `<span class="px-3 py-1 bg-[#181818] text-gray-300 text-xs rounded-lg border border-gray-700">${tagName}</span>`;
        });

        if (window.lucide) { lucide.createIcons(); }

        // Carregar Capítulos
        const listEl = document.getElementById('manga-chapters-list');
        const loadingEl = document.getElementById('manga-chapters-loading');
        
        listEl.innerHTML = '';
        loadingEl.classList.remove('hidden');

        try {
            const data = await this.#fetchAPI(`/manga/${manga.id}/feed?limit=500&translatedLanguage[]=pt-br&order[chapter]=asc&includes[]=scanlation_group`);
            
            loadingEl.classList.add('hidden');
            
            const capitulosUnicos = new Map();

            data.data.forEach(ch => {
                const numCapitulo = ch.attributes.chapter || ('OneShot-' + ch.id);
                if (!capitulosUnicos.has(numCapitulo)) {
                    capitulosUnicos.set(numCapitulo, ch);
                }
            });

            this.#currentChapters = Array.from(capitulosUnicos.values()).sort((a, b) => {
                return parseFloat(a.attributes.chapter || 0) - parseFloat(b.attributes.chapter || 0);
            });

            document.getElementById('manga-chapter-count').textContent = this.#currentChapters.length;

            if (this.#currentChapters.length === 0) {
                listEl.innerHTML = `<div class="p-6 text-center text-gray-500">Nenhum capítulo em português encontrado.</div>`;
                return;
            }

            this.#currentChapters.forEach((ch, index) => {
                const num = ch.attributes.chapter ? `Capítulo ${ch.attributes.chapter}` : 'One-shot';
                const chTitle = ch.attributes.title ? `- ${ch.attributes.title}` : '';
                const group = ch.relationships.find(r => r.type === 'scanlation_group')?.attributes?.name || 'Scan Desconhecida';
                const date = new Date(ch.attributes.publishAt).toLocaleDateString('pt-BR');

                const li = document.createElement('li');
                li.className = "hover:bg-[#202020] transition-colors cursor-pointer p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 group";
                li.onclick = () => this.#openReader(index, title);

                li.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="bg-[#141414] p-2 rounded-lg text-[#E50914] group-hover:scale-110 transition-transform border border-gray-800">
                            <i data-lucide="book-open" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-200 group-hover:text-[#E50914] transition-colors">${num} <span class="font-normal text-gray-400">${chTitle}</span></div>
                            <div class="text-xs text-gray-500 mt-1 flex gap-3">
                                <span><i data-lucide="users" class="w-3 h-3 inline"></i> ${group}</span>
                                <span><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${date}</span>
                            </div>
                        </div>
                    </div>
                `;
                listEl.appendChild(li);
            });
            
            if (window.lucide) { lucide.createIcons(); }

        } catch (error) {
            loadingEl.classList.add('hidden');
            listEl.innerHTML = `<div class="p-4 text-red-500 text-center">Falha ao carregar capítulos.</div>`;
        }
    }

    async #openReader(chapterIndex, mangaTitleDisplay) {
        this.#currentChapterIndex = chapterIndex;
        const chapter = this.#currentChapters[chapterIndex];
        const chapterNum = chapter.attributes.chapter ? `Capítulo ${chapter.attributes.chapter}` : 'Volume Único';

        document.getElementById('reader-title').textContent = mangaTitleDisplay;
        document.getElementById('reader-chapter').textContent = chapterNum;
        
        const container = document.getElementById('reader-pages-container');
        container.innerHTML = `<div class="py-20 text-gray-400"><i data-lucide="loader-2" class="w-10 h-10 animate-spin mx-auto"></i></div>`;
        
        this.#updateReaderButtons();
        this.#switchView('reader');
        if (window.lucide) { lucide.createIcons(); }

        try {
            const serverData = await this.#fetchAPI(`/at-home/server/${chapter.id}`);
            
            const baseUrl = serverData.baseUrl;
            const hash = serverData.chapter.hash;
            const pages = serverData.chapter.data;

            container.innerHTML = ''; 

            pages.forEach((pageFilename, idx) => {
                const imgUrl = `${baseUrl}/data/${hash}/${pageFilename}`;
                const wrapper = document.createElement('div');
                wrapper.className = "w-full max-w-4xl bg-[#141414] rounded-lg overflow-hidden flex justify-center items-center min-h-[300px] border border-gray-800";
                
                wrapper.innerHTML = `
                    <div class="absolute text-gray-600 z-0 flex items-center"><i data-lucide="loader" class="animate-spin mr-2"></i> Pág ${idx+1}</div>
                    <img src="${imgUrl}" referrerpolicy="no-referrer" loading="lazy" class="w-full h-auto z-10 relative object-contain max-h-[1200px]" onerror="this.src='https://placehold.co/600x800/181818/FFF?text=Erro+ao+carregar+imagem'">
                `;
                container.appendChild(wrapper);
            });
            
            if (window.lucide) { lucide.createIcons(); }

        } catch (error) {
            container.innerHTML = `<div class="text-red-500 py-20 text-center font-bold">Erro ao carregar as imagens do servidor.</div>`;
        }
    }

    #updateReaderButtons() {
        const prevBtn = document.getElementById('reader-prev-btn');
        const nextBtn = document.getElementById('reader-next-btn');
        const nextBottomBtn = document.getElementById('reader-next-bottom-btn');

        const hasPrev = this.#currentChapterIndex > 0;
        const hasNext = this.#currentChapterIndex < this.#currentChapters.length - 1;

        prevBtn.disabled = !hasPrev;
        nextBtn.disabled = !hasNext;
        
        if (hasNext) {
            nextBottomBtn.classList.remove('hidden');
        } else {
            nextBottomBtn.classList.add('hidden');
        }
    }

    #navigateChapter(direction) {
        const newIndex = this.#currentChapterIndex + direction;
        if (newIndex >= 0 && newIndex < this.#currentChapters.length) {
            const title = document.getElementById('reader-title').textContent;
            this.#openReader(newIndex, title);
        }
    }
}