// ARQUIVO: ModalManager.js

import { fetchTMDB, IMG_BASE_URL, IMG_POSTER_URL } from './api.js';
import * as Storage from './storageService.js';

// ==========================================================
// CONFIGURAÇÃO DOS SERVIDORES MULTI-PLAYER (APIs)
// ==========================================================
const PLAYER_APIS = {
    warezcdn: {
        movie: (id) => `https://warezcdn.site/filme/${id}`,
        tv: (id, s, e) => `https://warezcdn.site/serie/${id}/${s}/${e}`
    },
    embedmovies: {
        movie: (id) => `https://myembed.biz/filme/${id}`,
        tv: (id, s, e) => `https://myembed.biz/serie/${id}/${s}/${e}`
    },
    vidsrc: {
        movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
        tv: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`
    }
};

export class ModalManager {

    #app;
    #dom;

    #currentModalItem = null;
    #ytPlayer = null;
    
    #currentPlayerItem = null;
    #currentPlayerSeason = null;
    #currentPlayerEpisode = null;
    #isEpisodePanelOpen = false;

    constructor(app, dom) {
        this.#app = app; 
        this.#dom = dom;
        this.#setupModalListeners();
    }

    #setupModalListeners() {
        // Player Modais
        this.#dom.closePlayerButton.addEventListener('click', () => this.closePlayer());
        
        // Troca de Servidor
        this.#dom.playerServerSelect.addEventListener('change', () => this.#handleServerChange());

        // Botões do Player TV
        this.#dom.playerEpisodesButton.addEventListener('click', () => this.#handlePlayerEpisodesClick());
        this.#dom.playerNextButton.addEventListener('click', () => this.#handlePlayerNextClick());

        // Painel de Episódios
        this.#dom.playerEpListCloseButton.addEventListener('click', () => this.#closeInPlayerEpisodeList());
        this.#dom.playerEpListSeasonSelect.addEventListener('change', (e) => this.#handleInPlayerSeasonChange(e));
        this.#dom.playerEpListContainer.addEventListener('click', (e) => this.#handleInPlayerEpisodeClick(e));
        this.#dom.playerModalContent.addEventListener('click', (e) => this.#handlePlayerModalClick(e));

        // Details Modal
        this.#dom.detailsModal.addEventListener('click', (event) => {
            if (event.target === this.#dom.detailsModal) this.closeDetailsModal();
        });
        this.#dom.closeDetailsModalButton.addEventListener('click', () => this.closeDetailsModal());
        
        this.#dom.detailsModalPlayButton.addEventListener('click', () => this.#handleModalPlayClick());
        this.#dom.detailsModalTrailerButton.addEventListener('click', () => this.#handleModalTrailerClick());
        this.#dom.detailsModalSeasonSelect.addEventListener('change', (e) => this.#handleSeasonChange(e));
        this.#dom.detailsModalEpisodesList.addEventListener('click', (e) => this.#handleEpisodeClick(e));
        this.#dom.detailsModalAddListButton.addEventListener('click', () => this.#handleToggleMyList());

        this.#dom.detailsModalGenres.addEventListener('click', (e) => this.#handleGenreClick(e));
        this.#dom.detailsModalCast.addEventListener('click', (e) => this.#handleActorClick(e));
    }

    #handleServerChange() {
        if (!this.#currentPlayerItem) return;
        
        const id = this.#currentPlayerItem.id;
        const type = this.#currentPlayerItem.media_type;
        const season = this.#currentPlayerSeason;
        const episode = this.#currentPlayerEpisode;
        
        this.openPlayer(id, type, season, episode, this.#currentPlayerItem, true);
    }

    #handlePlayerModalClick(event) {
        if (this.#isEpisodePanelOpen && event.target === this.#dom.playerModalContent) {
            this.#closeInPlayerEpisodeList();
        }
    }

    #handlePlayerEpisodesClick() {
        if (this.#isEpisodePanelOpen) {
            this.#closeInPlayerEpisodeList();
        } else {
            this.#openInPlayerEpisodeList();
        }
    }
    
    async #openInPlayerEpisodeList() {
        if (!this.#currentPlayerItem || (this.#currentPlayerItem.media_type !== 'tv' && !this.#currentPlayerItem.fullSeasonsData)) {
            if (this.#currentPlayerItem && this.#currentPlayerItem.media_type === 'tv') {
                const details = await fetchTMDB(`/${this.#currentPlayerItem.media_type}/${this.#currentPlayerItem.id}`);
                if (details && details.seasons) {
                    this.#currentPlayerItem.fullSeasonsData = details.seasons;
                } else {
                     console.error("Não foi possível buscar dados da temporada.");
                     return;
                }
            } else {
                console.warn("Item não é uma série ou não tem dados de temporada.");
                return;
            }
        }
        
        this.#dom.playerEpisodeListPanel.classList.add('visible');
        this.#dom.playerContainer.style.pointerEvents = 'none'; 
        this.#isEpisodePanelOpen = true;

        const seasons = this.#currentPlayerItem.fullSeasonsData || [];
        const validSeasons = seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        this.#dom.playerEpListSeasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `Temporada ${season.season_number} (${season.episode_count} ep.)`;
            this.#dom.playerEpListSeasonSelect.appendChild(option);
        });

        const currentSeasonNum = this.#currentPlayerSeason || validSeasons[0]?.season_number || 1;
        this.#dom.playerEpListSeasonSelect.value = currentSeasonNum;

        await this.#displayInPlayerEpisodes(currentSeasonNum);
    }

    #closeInPlayerEpisodeList() {
        this.#dom.playerEpisodeListPanel.classList.remove('visible');
        this.#dom.playerContainer.style.pointerEvents = 'auto'; 
        this.#isEpisodePanelOpen = false;
    }

    async #handleInPlayerSeasonChange(event) {
        const seasonNumber = parseInt(event.target.value);
        await this.#displayInPlayerEpisodes(seasonNumber);
    }

    async #displayInPlayerEpisodes(seasonNumber) {
        this.#dom.playerEpListContainer.innerHTML = '<li class="text-gray-500 p-4">Carregando episódios...</li>';

        const tvId = this.#currentPlayerItem.id;
        let season = this.#currentPlayerItem.fullSeasonsData?.find(s => s.season_number === seasonNumber);
        let episodes = season?.episodes;

        if (season && !episodes) {
            try {
                const seasonDetails = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
                if (seasonDetails && seasonDetails.episodes) {
                    episodes = seasonDetails.episodes;
                    season.episodes = episodes; 
                }
            } catch (error) {
                console.error(`Erro ao buscar detalhes da temporada ${seasonNumber}:`, error);
                episodes = null;
            }
        }

        this.#dom.playerEpListContainer.innerHTML = '';

        if (episodes && episodes.length > 0) {
            episodes.forEach(episode => {
                const listItem = document.createElement('li');
                listItem.className = 'episode-item'; 
                listItem.dataset.episodeNumber = episode.episode_number;
                listItem.dataset.seasonNumber = seasonNumber;

                if (episode.episode_number === this.#currentPlayerEpisode && seasonNumber === this.#currentPlayerSeason) {
                    listItem.classList.add('active');
                }

                const isWatched = Storage.isEpisodeWatched(
                    this.#currentPlayerItem.id, 'tv', seasonNumber, episode.episode_number
                );
                
                const watchedIcon = isWatched 
                    ? '<i data-lucide="eye" class="w-4 h-4 text-red-500 ml-auto flex-shrink-0 inline-block -translate-y-2"></i>' 
                    : '';

                const placeholderImg = 'https://placehold.co/120x70/181818/333?text=EP';
                const imgSrc = episode.still_path ? `${IMG_POSTER_URL}${episode.still_path}` : placeholderImg;

                listItem.innerHTML = `
                    <div class="flex-shrink-0 text-gray-500 text-lg font-semibold w-8 text-center">${episode.episode_number}</div>
                    <img src="${imgSrc}" alt="Episódio ${episode.episode_number}" class="episode-thumbnail" onerror="this.src='${placeholderImg}'">
                    <div class="flex-grow">
                        <h5 class="text-white text-base font-semibold mb-1">${episode.name || `Episódio ${episode.episode_number}`}</h5>
                        <p class="text-gray-400 text-xs line-clamp-2">${episode.overview || 'Sem descrição.'}</p>
                        <p class="text-gray-500 text-xs mt-1">${episode.runtime ? `${episode.runtime} min` : ''}</p>
                    </div>
                    ${watchedIcon}`;

                this.#dom.playerEpListContainer.appendChild(listItem);
            });
            
            if (window.lucide) { 
                lucide.createIcons({ 
                    nodes: this.#dom.playerEpListContainer.querySelectorAll('[data-lucide]') 
                }); 
            }
        } else {
            this.#dom.playerEpListContainer.innerHTML = '<li class="text-gray-500 p-4">Nenhum episódio encontrado.</li>';
        }
    }

    async #handleInPlayerEpisodeClick(event) {
        const clickedItem = event.target.closest('.episode-item');
        if (!clickedItem || !this.#currentPlayerItem) return;

        try {
            const tvId = this.#currentPlayerItem.id;
            const type = this.#currentPlayerItem.media_type;
            const seasonNum = parseInt(clickedItem.dataset.seasonNumber);
            const episodeNum = parseInt(clickedItem.dataset.episodeNumber);

            if (tvId && type === 'tv' && seasonNum && episodeNum) {
                this.openPlayer(tvId, type, seasonNum, episodeNum, this.#currentPlayerItem);
                this.#closeInPlayerEpisodeList();
            } else {
                console.error('Dados insuficientes para tocar o episódio.', { tvId, type, seasonNum, episodeNum });
            }
        } catch (error) {
            console.error('Erro ao tentar tocar o episódio:', error);
        }
    }

    #handlePlayerNextClick() {
        if (!this.#currentPlayerItem || this.#currentPlayerItem.media_type !== 'tv' || !this.#currentPlayerSeason || !this.#currentPlayerEpisode) {
            console.warn("Dados insuficientes para pular para o próximo episódio.");
            return;
        }
        
        const nextEpisode = this.#currentPlayerEpisode + 1;
        this.openPlayer(
            this.#currentPlayerItem.id, 
            this.#currentPlayerItem.media_type, 
            this.#currentPlayerSeason, 
            nextEpisode, 
            this.#currentPlayerItem
        );
    }

    /**
     * Abre o player principal (Filme, Série ou Canal).
     */
    openPlayer(id, type, season = null, episode = null, itemData = null, isServerChange = false) {
        let playerUrl = '';

        if (this.#ytPlayer) {
            try { this.#ytPlayer.stopVideo(); this.#ytPlayer.destroy(); } catch(e) {}
            this.#ytPlayer = null;
        }

        if (!isServerChange && itemData && this.#currentPlayerItem && this.#currentPlayerItem.id === id &&
            this.#currentPlayerSeason === season && this.#currentPlayerEpisode === episode) {
            console.log("Player já está tocando este item.");
            return;
        }

        this.#currentPlayerItem = itemData || this.#currentPlayerItem;
        this.#currentPlayerSeason = season;
        this.#currentPlayerEpisode = episode;

        const selectedServer = this.#dom.playerServerSelect.value || 'warezcdn';
        const serverConfig = PLAYER_APIS[selectedServer];

        // Lógica de qual tipo de mídia estamos abrindo
        if (type === 'channel') {
            playerUrl = id; // A API de canais já nos devolve a URL pronta
            this.#dom.playerControlsTV.classList.add('hidden');
            this.#dom.playerServerSelect.parentElement.classList.add('hidden'); // Oculta o seletor
            this.#closeInPlayerEpisodeList();
            
        } else if (type === 'movie') {
            playerUrl = serverConfig.movie(id); 
            this.#dom.playerControlsTV.classList.add('hidden');
            this.#dom.playerServerSelect.parentElement.classList.remove('hidden'); // Mostra o seletor
            this.#closeInPlayerEpisodeList();
            
        } else if (type === 'tv' && season && episode) {
            playerUrl = serverConfig.tv(id, season, episode);
            this.#dom.playerControlsTV.classList.remove('hidden');
            this.#dom.playerNextButton.classList.remove('hidden');
            this.#dom.playerServerSelect.parentElement.classList.remove('hidden'); // Mostra o seletor
            
        } else {
            console.error("[openPlayer] Tipo de mídia ou informações inválidas para o player.");
            return;
        }
        
        // Histórico (Apenas para Filmes e Séries, ignora Canais Ao Vivo)
        if (itemData && type !== 'channel') {
             Storage.saveToWatchedHistory({
                 id: id, 
                 type: type, 
                 title: itemData.title || itemData.name, 
                 poster_path: itemData.poster_path
             });
             if (Storage.isItemInMyList(id, type)) {
                 Storage.removeFromMyList(id, type);
             }
        }

        if (type !== 'channel') {
            try { 
                Storage.saveWatchedEpisode({ 
                    id: id, 
                    type: type, 
                    season: season, 
                    episode: episode 
                }); 
            } catch (e) { 
                console.error("Erro ao salvar no histórico detalhado:", e); 
            }
        }

        // Injeta o Iframe
        try {
            this.#dom.playerContainer.innerHTML = `
                <iframe
                    src="${playerUrl}"
                    width="100%" height="100%" frameborder="0" 
                    scrolling="no"
                    allowfullscreen
                    allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *;">
                </iframe>`;
        } catch (error) {
             console.error("ERRO ao carregar o player:", error);
             alert("Ocorreu um erro ao tentar carregar o player.");
             this.closePlayer(); 
             return;
        }

        // Mostra o Modal
        this.#dom.playerModal.classList.remove('hidden');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        if (window.lucide) { 
            lucide.createIcons(); 
        }

        // Abre a lista de episódios se ela já estava aberta na série anterior
        if (this.#isEpisodePanelOpen && type === 'tv') {
            this.#displayInPlayerEpisodes(season);
        }
    }

    async fetchAndPlayTrailer(id, type) {
        const endpoint = type === 'movie' ? `/movie/${id}/videos` : `/tv/${id}/videos`;
        const data = await fetchTMDB(endpoint);

        let trailerKey = null;
        
        if (data && data.results && data.results.length > 0) {
             const trailers = data.results.filter(v => v.site === 'YouTube' && v.type === 'Trailer');
             let officialTrailer = trailers.find(t => t.official && (t.iso_639_1 === 'pt' || t.iso_639_1 === 'en'));
             
             if (!officialTrailer) officialTrailer = trailers.find(t => t.official);
             if (!officialTrailer) officialTrailer = trailers[0];

             if (officialTrailer) { 
                 trailerKey = officialTrailer.key; 
             } else { 
                 const firstVideo = data.results.find(v => v.site === 'YouTube'); 
                 if (firstVideo) trailerKey = firstVideo.key; 
             }
        }

        if (trailerKey) {
            this.#dom.playerContainer.innerHTML = '<div id="youtube-player-div" class="w-full h-full"></div>';
            this.#dom.playerModal.classList.remove('hidden');
            
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            if (this.#currentPlayerItem && this.#currentPlayerItem.media_type === 'tv') {
                this.#dom.playerControlsTV.classList.remove('hidden');
                this.#dom.playerNextButton.classList.add('hidden');
            } else {
                this.#dom.playerControlsTV.classList.add('hidden');
            }
            
            this.#closeInPlayerEpisodeList();

            if (this.#ytPlayer) {
                try { this.#ytPlayer.destroy(); } catch(e){}
                this.#ytPlayer = null;
            }

            if (typeof YT !== 'undefined' && YT.Player) {
                this.#ytPlayer = new YT.Player('youtube-player-div', {
                    height: '100%', 
                    width: '100%', 
                    videoId: trailerKey,
                    playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0 },
                    events: { 'onReady': (event) => event.target.playVideo() }
                });
            } else { 
                console.error("API do YouTube (YT) não encontrada."); 
            }
            
            if (window.lucide) { 
                lucide.createIcons(); 
            }
        } else {
            alert("Nenhum trailer ou vídeo do YouTube encontrado para este título.");
        }
    }

    closePlayer() {
        this.#dom.playerModal.classList.add('hidden');
        if (this.#ytPlayer) {
            try { this.#ytPlayer.stopVideo(); this.#ytPlayer.destroy(); } catch (e) {}
            this.#ytPlayer = null;
        }
        
        this.#dom.playerContainer.innerHTML = '';
        this.#dom.playerContainer.style.pointerEvents = 'auto'; 
        
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        this.#currentPlayerItem = null;
        this.#currentPlayerSeason = null;
        this.#currentPlayerEpisode = null;
        
        this.#dom.playerControlsTV.classList.add('hidden');
        this.#dom.playerNextButton.classList.remove('hidden');
        
        this.#closeInPlayerEpisodeList();

        this.#app.onPlayerClose();
    }

    #handleGenreClick(e) {
        const target = e.target.closest('.clickable-genre');
        if (!target) return;
        
        const genreId = target.dataset.genreId;
        const genreName = target.textContent;
        const type = this.#currentModalItem.media_type; 
        
        this.closeDetailsModal();
        
        setTimeout(() => { 
            this.#app.publicShowBrowsePageForGenre(genreId, genreName, type); 
        }, 300);
    }

    #handleActorClick(e) {
        const target = e.target.closest('.clickable-actor');
        if (!target) return;
        
        const actorId = target.dataset.actorId;
        const actorName = target.textContent;
        
        this.closeDetailsModal();
        
        setTimeout(() => { 
            this.#app.publicShowBrowsePageForActor(actorId, actorName); 
        }, 300);
    }
    
    #handleToggleMyList() {
        if (!this.#currentModalItem) return;

        const { id, media_type, title, name, poster_path } = this.#currentModalItem;
        const itemData = { 
            id: id, 
            type: media_type, 
            title: title || name, 
            poster_path: poster_path, 
            media_type: media_type 
        };

        if (Storage.isItemInMyList(id, media_type)) { 
            Storage.removeFromMyList(id, media_type); 
        } else { 
            Storage.saveToMyList(itemData); 
        }
        
        this.#updateMyListButtonIcon(id, media_type);
    }
    
    #updateMyListButtonIcon(id, type) {
        const currentIcon = this.#dom.detailsModalAddListButton.querySelector('i, svg');
        if (currentIcon) { 
            currentIcon.remove(); 
        }
        
        const isInList = Storage.isItemInMyList(id, type);
        const iconName = isInList ? 'check' : 'plus';

        const newIcon = document.createElement('i');
        newIcon.setAttribute('data-lucide', iconName);
        newIcon.className = isInList ? 'w-5 h-5 text-green-500' : 'w-5 h-5';
        
        this.#dom.detailsModalAddListButton.appendChild(newIcon);
        
        if (window.lucide) { 
            lucide.createIcons({ nodes: [newIcon] }); 
        }
    }

    async #handleEpisodeClick(event) {
        const clickedItem = event.target.closest('.episode-item');
        if (!clickedItem || !this.#currentModalItem) return;

        clickedItem.parentElement.querySelectorAll('li').forEach(li => li.classList.remove('active'));
        clickedItem.classList.add('active');

        try {
            const tvId = this.#currentModalItem.id;
            const type = this.#currentModalItem.media_type;
            const seasonNum = parseInt(this.#dom.detailsModalSeasonSelect.value);
            const episodeNum = parseInt(clickedItem.dataset.episodeNumber);

            if (tvId && type === 'tv' && seasonNum && episodeNum) {
                this.openPlayer(tvId, type, seasonNum, episodeNum, this.#currentModalItem);
                this.closeDetailsModal();
            } else { 
                console.error('Dados insuficientes para tocar o episódio.', { tvId, type, seasonNum, episodeNum }); 
            }
        } catch (error) { 
            console.error('Erro ao tentar tocar o episódio:', error); 
        }
    }

    #handleModalPlayClick() {
        if (!this.#currentModalItem) return;

        let season = 1, episode = 1;
        const type = this.#currentModalItem.media_type;

        if (type === 'tv' && !this.#dom.seriesSeasonsContainer.classList.contains('hidden')) {
            season = parseInt(this.#dom.detailsModalSeasonSelect.value) || 1;
            const selectedEpisodeEl = this.#dom.detailsModalEpisodesList.querySelector('li.active');
            episode = selectedEpisodeEl ? parseInt(selectedEpisodeEl.dataset.episodeNumber) : 1;
        }

        this.openPlayer(this.#currentModalItem.id, type, season, episode, this.#currentModalItem);
        this.closeDetailsModal();
    }

    #handleModalTrailerClick() {
        if (this.#currentModalItem) {
            this.#currentPlayerItem = this.#currentModalItem; 
            this.fetchAndPlayTrailer(this.#currentModalItem.id, this.#currentModalItem.media_type);
            this.closeDetailsModal();
        }
    }

    async #handleSeasonChange(event) {
        if (this.#currentModalItem && this.#currentModalItem.media_type === 'tv') {
            const seasonNumber = parseInt(event.target.value);
            await this.#displayEpisodesForSeason(
                this.#currentModalItem.id, 
                seasonNumber, 
                this.#dom.detailsModalEpisodesList, 
                this.#currentModalItem.fullSeasonsData
            );
        }
    }

    async openDetailsModal(id, type) {
        this.#currentModalItem = null;
        let details = null, credits = null, videos = null, certifications = null;

        try {
            const requests = [fetchTMDB(`/${type}/${id}`)];
            requests.push(fetchTMDB(`/${type}/${id}/credits`));
            requests.push(fetchTMDB(`/${type}/${id}/videos`));
            
            if (type === 'movie') {
                requests.push(fetchTMDB(`/movie/${id}/release_dates`));
            } else {
                requests.push(fetchTMDB(`/tv/${id}/content_ratings`));
            }

            const [detailsData, creditsData, videosData, certData] = await Promise.all(requests);

            details = detailsData; 
            credits = creditsData; 
            videos = videosData; 
            certifications = certData;

            if (!details) throw new Error("Não foi possível carregar os detalhes.");

            this.#currentModalItem = { 
                ...details, 
                media_type: type, 
                fullCreditsData: credits, 
                fullVideosData: videos, 
                fullSeasonsData: details.seasons 
            };
            
            this.#updateMyListButtonIcon(id, type);
            
            this.#dom.detailsModalBackdropImage.style.backgroundImage = `url(${IMG_BASE_URL}${details.backdrop_path || details.poster_path})`;
            this.#dom.detailsModalTitle.textContent = details.title || details.name;
            this.#dom.detailsModalOverview.textContent = details.overview || "Nenhuma descrição disponível.";
            
            const voteAverage = details.vote_average ? (details.vote_average * 10).toFixed(0) : '--';
            this.#dom.detailsModalRating.textContent = `${voteAverage}% relevante`;
            
            const date = details.release_date || details.first_air_date;
            this.#dom.detailsModalReleaseDate.textContent = date ? new Date(date).getFullYear() : '----';
            
            if (type === 'movie' && details.runtime) {
                const hours = Math.floor(details.runtime / 60); 
                const minutes = details.runtime % 60;
                
                this.#dom.detailsModalRuntime.textContent = `${hours}h ${minutes}min`;
                this.#dom.detailsModalRuntime.classList.remove('hidden');
                this.#dom.detailsModalSeasons.classList.add('hidden');
            } else if (type === 'tv' && details.number_of_seasons) {
                this.#dom.detailsModalRuntime.classList.add('hidden');
                this.#dom.detailsModalSeasons.textContent = `${details.number_of_seasons} Temporada${details.number_of_seasons > 1 ? 's' : ''}`;
                this.#dom.detailsModalSeasons.classList.remove('hidden');
            } else {
                this.#dom.detailsModalRuntime.classList.add('hidden'); 
                this.#dom.detailsModalSeasons.classList.add('hidden');
            }
            
            this.#dom.detailsModalAgeRating.textContent = this.#getAgeRating(certifications, type);
            this.#dom.detailsModalTags.textContent = details.tagline || (details.overview ? details.overview.split(' ').slice(0, 6).join(' ') + '...' : 'Não especificado');

            this.#dom.detailsModalGenres.innerHTML = ''; 
            if (details.genres?.length > 0) {
                details.genres.forEach((g, index) => {
                    const el = document.createElement('span'); 
                    el.className = 'clickable-genre'; 
                    el.textContent = g.name; 
                    el.dataset.genreId = g.id;
                    this.#dom.detailsModalGenres.appendChild(el);
                    
                    if (index < details.genres.length - 1) { 
                        this.#dom.detailsModalGenres.append(', '); 
                    }
                });
            } else { 
                this.#dom.detailsModalGenres.textContent = 'Não especificado'; 
            }

            this.#dom.detailsModalCast.innerHTML = ''; 
            const cast = credits?.cast?.slice(0, 3);
            if (cast?.length > 0) {
                cast.forEach((c, index) => {
                    const el = document.createElement('span'); 
                    el.className = 'clickable-actor'; 
                    el.textContent = c.name; 
                    el.dataset.actorId = c.id;
                    this.#dom.detailsModalCast.appendChild(el);
                    
                    if (index < cast.length - 1) { 
                        this.#dom.detailsModalCast.append(', '); 
                    }
                });
            } else { 
                this.#dom.detailsModalCast.textContent = 'Não disponível'; 
            }

            if (type === 'tv' && details.seasons && details.seasons.length > 0) {
                this.#dom.seriesSeasonsContainer.classList.remove('hidden');
                this.#dom.detailsModalSeasonSelect.innerHTML = '';

                const validSeasons = details.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);

                validSeasons.forEach(season => {
                    const option = document.createElement('option');
                    option.value = season.season_number; 
                    option.textContent = `Temporada ${season.season_number} (${season.episode_count} ep.)`;
                    this.#dom.detailsModalSeasonSelect.appendChild(option);
                });

                if (validSeasons.length > 0) {
                    const defaultSeason = validSeasons[0].season_number;
                    this.#dom.detailsModalSeasonSelect.value = defaultSeason;
                    await this.#displayEpisodesForSeason(id, defaultSeason, this.#dom.detailsModalEpisodesList, this.#currentModalItem.fullSeasonsData); 
                } else { 
                    this.#dom.detailsModalEpisodesList.innerHTML = '<li class="text-gray-500 p-2">Nenhuma temporada com episódios disponível.</li>'; 
                }
            } else {
                 this.#dom.seriesSeasonsContainer.classList.add('hidden');
                 this.#dom.detailsModalEpisodesList.innerHTML = ''; 
                 this.#dom.detailsModalSeasonSelect.innerHTML = '';
            }

            const playButton = this.#dom.detailsModalPlayButton;
            const oldWatchedIcon = playButton.querySelector('.watched-icon');
            if (oldWatchedIcon) { 
                oldWatchedIcon.remove(); 
            }
            
            if (type === 'movie') {
                const isWatched = Storage.isEpisodeWatched(id, 'movie');
                if (isWatched) {
                    const watchedIcon = document.createElement('i');
                    watchedIcon.setAttribute('data-lucide', 'eye');
                    watchedIcon.className = 'w-5 h-5 ml-2 text-red-500 watched-icon';
                    watchedIcon.style.display = 'inline-block'; 
                    watchedIcon.style.filter = 'drop-shadow(0 0 5px rgba(0, 0, 0, 0.8))';
                    playButton.appendChild(watchedIcon);
                }
            }

            this.#dom.detailsModal.classList.remove('hidden');
            document.documentElement.style.overflow = 'hidden'; 
            document.body.style.overflow = 'hidden';
            
            if (window.lucide) { 
                lucide.createIcons(); 
            }

        } catch (error) {
            console.error("Erro ao abrir modal de detalhes:", error);
            alert("Não foi possível carregar os detalhes.");
            this.closeDetailsModal();
        }
    }

    #getAgeRating(certifications, type) {
        let ageRating = 'L';
        if (certifications && certifications.results) {
            let brRatingData;
            if (type === 'movie') {
                brRatingData = certifications.results.find(res => res.iso_3166_1 === 'BR');
                if (brRatingData && brRatingData.release_dates?.length > 0) { 
                    ageRating = brRatingData.release_dates.find(rd => rd.certification)?.certification || 'L'; 
                }
            } else if (type === 'tv') {
                brRatingData = certifications.results.find(res => res.iso_3166_1 === 'BR');
                if (brRatingData) {
                    ageRating = brRatingData.rating || 'L';
                }
            }
        }
         if (ageRating && !isNaN(parseInt(ageRating))) { 
             return `${ageRating}`; 
         }
         return ageRating === '' ? 'L' : ageRating;
    }

    async #displayEpisodesForSeason(tvId, seasonNumber, listElement, seasonsData) {
        listElement.innerHTML = '<li class="text-gray-500 p-2">Carregando episódios...</li>';

        let season = seasonsData?.find(s => s.season_number === seasonNumber);
        let episodes = season?.episodes;

        if (season && !episodes) {
             try {
                const seasonDetails = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
                if (seasonDetails && seasonDetails.episodes) { 
                    episodes = seasonDetails.episodes; 
                    season.episodes = episodes; 
                }
             } catch (error) { 
                 console.error(`Erro ao buscar detalhes da temporada ${seasonNumber}:`, error); 
                 episodes = null; 
             }
        }

        listElement.innerHTML = ''; 

        if (episodes && episodes.length > 0) {
            episodes.forEach(episode => {
                const listItem = document.createElement('li');
                listItem.className = 'episode-item'; 
                listItem.dataset.episodeNumber = episode.episode_number;

                if (episode.episode_number === 1) {
                    listItem.classList.add('active');
                }

                const isWatched = Storage.isEpisodeWatched(tvId, 'tv', seasonNumber, episode.episode_number);
                const watchedIcon = isWatched 
                    ? '<i data-lucide="eye" class="w-4 h-4 text-red-500 ml-auto flex-shrink-0 inline-block -translate-y-9"></i>' 
                    : '';

                const placeholderImg = 'https://placehold.co/120x70/181818/333?text=EP';
                const imgSrc = episode.still_path ? `${IMG_POSTER_URL}${episode.still_path}` : placeholderImg;

                listItem.innerHTML = `
                    <div class="flex-shrink-0 text-gray-500 text-lg font-semibold w-8 text-center">${episode.episode_number}</div>
                    <img src="${imgSrc}" alt="Episódio ${episode.episode_number}" class="episode-thumbnail" onerror="this.src='${placeholderImg}'">
                    <div class="flex-grow">
                        <h5 class="text-white text-base font-semibold mb-1">${episode.name || `Episódio ${episode.episode_number}`}</h5>
                        <p class="text-gray-400 text-xs line-clamp-2">${episode.overview || 'Sem descrição.'}</p>
                        <p class="text-gray-500 text-xs mt-1">${episode.runtime ? `${episode.runtime} min` : ''}</p>
                    </div>
                    ${watchedIcon}`;

                listElement.appendChild(listItem);
            });
            
            if (window.lucide) { 
                lucide.createIcons({ nodes: listElement.querySelectorAll('[data-lucide]') }); 
            }
        } else { 
            listElement.innerHTML = '<li class="text-gray-500 p-2">Nenhum episódio encontrado para esta temporada.</li>'; 
        }
    }

    closeDetailsModal() {
        this.#dom.detailsModal.classList.add('hidden');
        document.documentElement.style.overflow = 'auto'; 
        document.body.style.overflow = 'auto';
        
        this.#currentModalItem = null;
        this.#dom.detailsModalEpisodesList.innerHTML = ''; 
        this.#dom.detailsModalSeasonSelect.innerHTML = '';
        
        this.#dom.detailsModalTitle.textContent = 'Carregando...'; 
        this.#dom.detailsModalOverview.textContent = '';
        this.#dom.detailsModalBackdropImage.style.backgroundImage = 'none'; 
        this.#dom.detailsModalRating.textContent = '--%';
        this.#dom.detailsModalReleaseDate.textContent = '----'; 
        this.#dom.detailsModalRuntime.textContent = '--h --min';
        
        this.#dom.detailsModalCast.textContent = 'Carregando...'; 
        this.#dom.detailsModalGenres.textContent = 'Carregando...';
        this.#dom.detailsModalTags.textContent = 'Carregando...';
        
        const playButton = this.#dom.detailsModalPlayButton;
        const oldWatchedIcon = playButton.querySelector('.watched-icon');
        if (oldWatchedIcon) { 
            oldWatchedIcon.remove(); 
        }
        
        this.#app.onModalClose();
    }
}