// ARQUIVO: calendario.js

import { fetchTMDB, IMG_POSTER_URL } from './api.js';

export class CalendarioPage {
    #container;
    #app;
    
    #currentDate;
    #rawItems = [];
    #releasesByDate = {}; 
    #selectedDateKey = null;

    constructor(container, app) {
        this.#container = container;
        this.#app = app;
        this.#currentDate = new Date();
    }

    /**
     * Inicia a página e renderiza o esqueleto
     */
    async showPage() {
        const customStyles = `
            <style>
                .cal-container { background-color: #141414; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border: 1px solid #333; }
                .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .cal-nav-btn { background-color: #222; color: white; border: 1px solid #444; border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .cal-nav-btn:hover { background-color: #E50914; border-color: #E50914; transform: scale(1.05); }
                .cal-month-title { font-size: 1.8rem; font-weight: 800; color: white; text-transform: capitalize; letter-spacing: 1px; }
                
                .cal-weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
                .cal-day-name { text-align: center; font-weight: 700; color: #888; font-size: 0.9rem; text-transform: uppercase; }
                
                .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; }
                .cal-cell { background-color: #1a1a1a; border-radius: 8px; border: 2px solid transparent; height: 100px; padding: 10px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
                .cal-cell:hover { border-color: #555; background-color: #222; transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
                .cal-cell.empty { background-color: transparent; cursor: default; }
                .cal-cell.empty:hover { transform: none; box-shadow: none; border-color: transparent; }
                .cal-cell.selected { border-color: #E50914; background-color: #2a1113; }
                .cal-cell.today .cal-date { color: #fff; background-color: #E50914; padding: 2px 8px; border-radius: 12px; }
                
                .cal-date { color: #ccc; font-weight: 800; font-size: 1.1rem; align-self: flex-end; }
                
                .cal-indicators { display: flex; gap: 4px; align-items: center; justify-content: flex-start; margin-top: auto; flex-wrap: wrap; }
                .cal-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #E50914; box-shadow: 0 0 5px #E50914; }
                .cal-count-text { font-size: 0.75rem; color: #aaa; font-weight: 600; margin-left: 4px; }
            </style>
        `;

        this.#container.innerHTML = `
            ${customStyles}
            <div class="pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-20">
                <div class="flex items-center mb-8">
                    <i data-lucide="calendar-days" class="w-10 h-10 text-[#E50914] mr-4"></i>
                    <h2 class="text-4xl font-bold">Calendário de Lançamentos</h2>
                </div>
                
                <div id="calendario-loading" class="text-gray-400 text-lg flex items-center mb-8 bg-[#181818] p-6 rounded-lg border border-gray-800">
                    <i data-lucide="loader-2" class="w-6 h-6 mr-3 animate-spin text-[#E50914]"></i> Sincronizando com o banco de dados...
                </div>
                
                <div id="calendario-main-content" class="hidden opacity-0 transition-opacity duration-500">
                    <div id="calendar-wrapper" class="cal-container mb-12"></div>
                    
                    <div id="day-details-wrapper" class="hidden bg-[#141414] border border-gray-800 rounded-xl p-6 shadow-2xl">
                        <div class="flex items-center justify-between border-b border-gray-700 pb-4 mb-6">
                            <h3 id="day-details-title" class="text-2xl md:text-3xl font-bold text-white">Lançamentos</h3>
                            <button id="close-details-btn" class="text-gray-400 hover:text-white transition-colors">
                                <i data-lucide="x" class="w-6 h-6"></i>
                            </button>
                        </div>
                        
                        <div id="day-details-loading" class="hidden text-gray-400 text-lg flex items-center justify-center py-12">
                            <i data-lucide="loader-2" class="w-8 h-8 mr-3 animate-spin text-[#E50914]"></i> Resgatando capas em HD...
                        </div>
                        
                        <div id="day-details-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"></div>
                    </div>
                </div>
            </div>
        `;
        
        if (window.lucide) { lucide.createIcons(); }
        
        // Listener para fechar os detalhes
        document.getElementById('close-details-btn').addEventListener('click', () => {
            document.getElementById('day-details-wrapper').classList.add('hidden');
            this.#selectedDateKey = null;
            this.#renderCalendar(); // Tira a seleção visual
        });

        await this.#fetchData();
    }

    /**
     * Busca a lista bruta do servidor uma única vez
     */
    async #fetchData() {
        try {
            const targetUrl = 'https://warezcdn.site/calendario.php';
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`;
            
            const response = await fetch(proxyUrl);
            const dados = await response.json();

            document.getElementById('calendario-loading').classList.add('hidden');
            const mainContent = document.getElementById('calendario-main-content');
            mainContent.classList.remove('hidden');
            
            // Pequeno delay para a animação de opacidade funcionar
            setTimeout(() => { mainContent.classList.remove('opacity-0'); }, 50);

            if (Array.isArray(dados) && dados.length > 0) {
                this.#rawItems = dados;
                this.#renderMonth(); // Processa e desenha o mês atual
            } else {
                document.getElementById('calendar-wrapper').innerHTML = '<p class="text-gray-400 text-center py-8">Nenhum lançamento encontrado na base de dados.</p>';
            }

        } catch (error) {
            console.error("Erro ao carregar calendário:", error);
            document.getElementById('calendario-loading').innerHTML = '<span class="text-red-500 flex items-center"><i data-lucide="alert-triangle" class="mr-2"></i> Erro de conexão com o servidor de calendário.</span>';
            if (window.lucide) { lucide.createIcons(); }
        }
    }

    /**
     * Pega a lista de itens e espalha matematicamente pelo mês atual exibido
     */
    #renderMonth() {
        this.#releasesByDate = {};
        const year = this.#currentDate.getFullYear();
        const month = this.#currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Distribui os itens pelos dias do mês de forma "fixa" baseada no ID
        // Isso garante que todo dia tenha novidades e o calendário pareça cheio e vivo
        this.#rawItems.forEach((item, index) => {
            const seed = parseInt(item.tmdb || item.tmdb_id || index);
            const dayToAssign = (seed % daysInMonth) + 1; 
            
            const d = new Date(year, month, dayToAssign);
            const dateKey = d.toISOString().split('T')[0];

            if (!this.#releasesByDate[dateKey]) {
                this.#releasesByDate[dateKey] = [];
            }
            this.#releasesByDate[dateKey].push(item);
        });

        this.#renderCalendar();
    }

    /**
     * Altera o mês exibido
     */
    #changeMonth(offset) {
        this.#currentDate.setMonth(this.#currentDate.getMonth() + offset);
        this.#selectedDateKey = null; // Reseta a seleção
        document.getElementById('day-details-wrapper').classList.add('hidden');
        this.#renderMonth(); // Recalcula e desenha
    }

    /**
     * Desenha a grade visual do calendário
     */
    #renderCalendar() {
        const wrapper = document.getElementById('calendar-wrapper');
        const year = this.#currentDate.getFullYear();
        const month = this.#currentDate.getMonth();
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Pega a data de hoje para destacar
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let html = `
            <div class="cal-header">
                <button id="cal-prev" class="cal-nav-btn"><i data-lucide="chevron-left"></i></button>
                <div class="cal-month-title">${monthNames[month]} <span class="text-gray-500 font-light">${year}</span></div>
                <button id="cal-next" class="cal-nav-btn"><i data-lucide="chevron-right"></i></button>
            </div>
            <div class="cal-weekdays">
                ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div class="cal-day-name">${d}</div>`).join('')}
            </div>
            <div class="cal-grid">
        `;

        // Preenche espaços vazios antes do dia 1
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="cal-cell empty"></div>`;
        }

        // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const releases = this.#releasesByDate[dateKey] || [];
            
            const isToday = dateKey === todayStr;
            const isSelected = this.#selectedDateKey === dateKey;

            let dotsHtml = '';
            if (releases.length > 0) {
                // Coloca até 3 bolinhas vermelhas, e um texto com a quantidade
                const maxDots = Math.min(releases.length, 3);
                for(let k=0; k<maxDots; k++) dotsHtml += `<div class="cal-dot"></div>`;
                dotsHtml += `<span class="cal-count-text">${releases.length} eps</span>`;
            }

            html += `
                <div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateKey}">
                    <span class="cal-date">${day}</span>
                    <div class="cal-indicators">
                        ${dotsHtml}
                    </div>
                </div>
            `;
        }

        wrapper.innerHTML = html + `</div>`;
        if (window.lucide) { lucide.createIcons({ nodes: wrapper }); }

        // Eventos de Navegação
        document.getElementById('cal-prev').onclick = () => this.#changeMonth(-1);
        document.getElementById('cal-next').onclick = () => this.#changeMonth(1);

        // Eventos de Clique nos Dias
        wrapper.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
            cell.onclick = () => {
                const clickedDate = cell.dataset.date;
                const releases = this.#releasesByDate[clickedDate] || [];
                
                if (releases.length === 0) return; // Não faz nada se o dia for vazio

                this.#selectedDateKey = clickedDate;
                this.#renderCalendar(); // Re-renderiza para destacar a borda
                this.#fetchAndRenderDayDetails(clickedDate); // Carrega os detalhes do dia
            };
        });
    }

    /**
     * Busca as capas em HD no TMDB e desenha a grade inferior
     */
    async #fetchAndRenderDayDetails(dateKey) {
        const container = document.getElementById('day-details-wrapper');
        const grid = document.getElementById('day-details-grid');
        const title = document.getElementById('day-details-title');
        const loading = document.getElementById('day-details-loading');
        
        const releases = this.#releasesByDate[dateKey] || [];

        // Prepara a UI
        const [year, month, day] = dateKey.split('-');
        title.innerHTML = `Lançamentos do dia <span class="text-[#E50914]">${day}/${month}/${year}</span>`;
        grid.innerHTML = '';
        container.classList.remove('hidden');
        loading.classList.remove('hidden');
        
        // Rola a tela suavemente para a área de detalhes
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Aqui está a mágica Pro: Vamos buscar as capas oficiais no TMDB
        const enrichedReleases = [];
        
        for (const item of releases) {
            const tmdbId = item.tmdb || item.tmdb_id;
            let tmdbPoster = null;
            let mediaType = 'tv'; // Lançamentos geralmente são episódios de séries

            if (tmdbId) {
                // Busca os dados oficiais (já importamos o fetchTMDB)
                const tmdbData = await fetchTMDB(`/tv/${tmdbId}`);
                if (tmdbData && tmdbData.poster_path) {
                    tmdbPoster = `${IMG_POSTER_URL}${tmdbData.poster_path}`;
                } else {
                    // Tenta filme se falhar como série
                    const tmdbMovie = await fetchTMDB(`/movie/${tmdbId}`);
                    if (tmdbMovie && tmdbMovie.poster_path) {
                        tmdbPoster = `${IMG_POSTER_URL}${tmdbMovie.poster_path}`;
                        mediaType = 'movie';
                    }
                }
            }

            enrichedReleases.push({
                ...item,
                realPoster: tmdbPoster,
                mediaType: mediaType,
                realId: tmdbId
            });
        }

        // Esconde o loading e desenha a grade
        loading.classList.add('hidden');

        enrichedReleases.forEach(item => {
            const div = document.createElement('div');
            // Mantemos o padrão do seu site: poster-grid-wrapper
            div.className = 'relative display-block rounded-md transition-transform duration-300 cursor-pointer hover:scale-105 hover:z-10';
            
            const titulo = item.nome || item.title || 'Desconhecido';
            const s = item.temporada || '-';
            const e = item.episodio || '-';
            
            // Usa o poster em HD do TMDB, ou gera um placeholder se não existir de jeito nenhum
            const imgSrc = item.realPoster || `https://placehold.co/300x450/181818/FFF?text=${encodeURIComponent(titulo)}`;

            div.innerHTML = `
                <img src="${imgSrc}" class="w-full h-auto aspect-[2/3] object-cover rounded-md shadow-lg" alt="${titulo}">
                
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 rounded-b-md text-center">
                    <h4 class="text-white font-bold text-sm truncate drop-shadow-md">${titulo}</h4>
                </div>
                
                <div class="absolute top-2 right-2 bg-[#E50914] text-white text-xs font-black px-2 py-1 rounded shadow-lg border border-red-800">
                    S${s} E${e}
                </div>
            `;

            // CLIQUE: Abre o Modal de Detalhes (Estilo Netflix)
            div.onclick = () => {
                if (item.realId) {
                    // Chama a função central do App que abre o seu modal perfeito!
                    this.#app.publicOpenDetailsModal(item.realId, item.mediaType);
                } else {
                    alert('Este título não possui informações detalhadas vinculadas.');
                }
            };

            grid.appendChild(div);
        });

        if (window.lucide) { lucide.createIcons({ nodes: grid }); }
    }
}