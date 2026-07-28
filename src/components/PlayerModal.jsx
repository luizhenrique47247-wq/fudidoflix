import React, { useState, useEffect, useRef } from 'react';
import { X, ListVideo, SkipForward, Loader2, Eye } from 'lucide-react';
import Hls from 'hls.js';
import { fetchTMDB, IMG_POSTER_URL } from '../services/api';
import * as Storage from '../services/storageService';

function getSeriesSlug(itemData) {
  if (!itemData) return '';
  const name = itemData.original_name || itemData.original_title || itemData.name || itemData.title || '';
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

const PLAYER_APIS = {
  viewplayer: {
    movie: (id, imdbId) => `https://viewplayer.online/filme/${imdbId || id}`,
    tv: (id, s, e, imdbId, itemData) => {
      const slug = getSeriesSlug(itemData);
      return slug ? `https://viewplayer.online/embed/${slug}/` : `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`;
    }
  },
  autoembed: {
    movie: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    tv: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`
  },
  vidsrcme: {
    movie: (id, imdbId) => `https://vidsrcme.ru/embed/movie?imdb=${imdbId || id}`,
    tv: (id, s, e, imdbId) => `https://vidsrcme.ru/embed/tv?imdb=${imdbId || id}&season=${s}&episode=${e}`
  },
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

export default function PlayerModal({ id, type, initialSeason, initialEpisode, itemData, resolvedStreamUrl, isTrailer, trailerKey, onClose, onPlayerClose }) {
  // Default server: ViewPlayer for Movies, AutoEmbed for TV Series
  const [server, setServer] = useState(type === 'tv' ? 'autoembed' : 'viewplayer');
  const [imdbId, setImdbId] = useState(itemData?.imdb_id || (typeof id === 'string' && id.startsWith('tt') ? id : ''));
  const [currentSeason, setCurrentSeason] = useState(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode || 1);
  const [epListOpen, setEpListOpen] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [selectedEpListSeason, setSelectedEpListSeason] = useState(initialSeason || 1);
  const [epListEpisodes, setEpListEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [playerUrl, setPlayerUrl] = useState('');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Fetch IMDb ID if missing (needed for ViewPlayer)
  useEffect(() => {
    if (!imdbId && id && type !== 'channel') {
      const endpoint = type === 'movie' ? `/movie/${id}/external_ids` : `/tv/${id}/external_ids`;
      fetchTMDB(endpoint)
        .then(data => {
          if (data && data.imdb_id) {
            setImdbId(data.imdb_id);
          }
        })
        .catch(() => {});
    }
  }, [id, type, imdbId]);

  // Initialize playback URL and history tracking
  useEffect(() => {
    if (isTrailer) {
      setPlayerUrl(trailerKey ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&controls=1&rel=0` : '');
      return;
    }

    if (type === 'channel') {
      // HLS stream (IPTV)
      setPlayerUrl(id);
      return;
    }

    // Save to history
    if (itemData) {
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

    Storage.saveWatchedEpisode({
      id: id,
      type: type,
      season: currentSeason,
      episode: currentEpisode
    });

    // Set playback source URL with IMDb ID resolution
    if (resolvedStreamUrl && currentSeason === (initialSeason || 1) && currentEpisode === (initialEpisode || 1)) {
      setPlayerUrl(resolvedStreamUrl);
    } else {
      const serverConfig = PLAYER_APIS[server] || PLAYER_APIS.viewplayer;
      const targetId = imdbId || id;

      if (type === 'movie') {
        setPlayerUrl(serverConfig.movie(id, targetId));
      } else if (type === 'tv') {
        setPlayerUrl(serverConfig.tv(id, currentSeason, currentEpisode, targetId, itemData));
      }
    }
  }, [id, type, currentSeason, currentEpisode, server, isTrailer, trailerKey, itemData, resolvedStreamUrl, initialSeason, initialEpisode, imdbId]);

  // Load Seasons and Episodes guide for TV Shows in player
  useEffect(() => {
    if (type !== 'tv' || isTrailer) return;

    const loadSeasons = async () => {
      let fullSeasons = itemData?.fullSeasonsData;
      
      if (!fullSeasons) {
        try {
          const details = await fetchTMDB(`/tv/${id}`);
          if (details && details.seasons) {
            fullSeasons = details.seasons;
          }
        } catch (e) {
          console.error("Erro ao carregar temporadas para o player:", e);
        }
      }

      if (fullSeasons) {
        const validSeasons = fullSeasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        setSeasons(validSeasons);
      }
    };

    loadSeasons();
  }, [id, type, isTrailer, itemData]);

  // Load episodes of currently selected season in the slide guide
  useEffect(() => {
    if (type !== 'tv' || !epListOpen) return;

    const loadEpisodes = async () => {
      setLoadingEpisodes(true);
      try {
        const data = await fetchTMDB(`/tv/${id}/season/${selectedEpListSeason}`);
        if (data && data.episodes) {
          setEpListEpisodes(data.episodes);
        }
      } catch (e) {
        console.error("Erro ao carregar episódios da temporada:", e);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    loadEpisodes();
  }, [id, type, selectedEpListSeason, epListOpen]);

  // IPTV Native HLS.js integration
  useEffect(() => {
    const isCustomVideo = type === 'channel' || (resolvedStreamUrl && currentSeason === (initialSeason || 1) && currentEpisode === (initialEpisode || 1));
    if (!isCustomVideo || !videoRef.current || !playerUrl) return;

    const video = videoRef.current;
    const isHls = playerUrl.includes('.m3u8') || type === 'channel';
    
    if (isHls) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          maxMaxBufferLength: 10,
          enableWorker: true
        });
        hlsRef.current = hls;
        hls.loadSource(playerUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(err => console.log("HLS autoplay blocked:", err));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playerUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(err => console.log("Native autoplay blocked:", err));
        });
      }
    } else {
      video.src = playerUrl;
      video.load();
      video.play().catch(err => console.log("Direct video autoplay blocked:", err));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playerUrl, type, currentSeason, currentEpisode, resolvedStreamUrl, initialSeason, initialEpisode]);

  const handleNextEpisode = () => {
    const currentSeasonData = seasons.find(s => s.season_number === currentSeason);
    const maxEpisodes = currentSeasonData ? currentSeasonData.episode_count : 99;

    if (currentEpisode < maxEpisodes) {
      setCurrentEpisode(currentEpisode + 1);
    } else {
      const nextSeasonIdx = seasons.findIndex(s => s.season_number === currentSeason) + 1;
      if (nextSeasonIdx < seasons.length) {
        const nextSeason = seasons[nextSeasonIdx].season_number;
        setCurrentSeason(nextSeason);
        setSelectedEpListSeason(nextSeason);
        setCurrentEpisode(1);
      } else {
        alert("Você chegou ao último episódio da série!");
      }
    }
  };

  const handleClose = () => {
    onClose();
    if (onPlayerClose) {
      onPlayerClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col select-none overflow-hidden animate-fade-in">
      {/* Controls Overlay Header */}
      <div className="absolute top-4 left-4 z-40 flex items-center space-x-3 pointer-events-auto">
        <button 
          onClick={handleClose} 
          className="text-white bg-zinc-950/80 hover:bg-zinc-800/80 rounded-full p-3 shadow-2xl border border-zinc-800/40 backdrop-blur-sm cursor-pointer"
          aria-label="Fechar player"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Server select dropdown */}
        {type !== 'channel' && !isTrailer && (
          <select 
            value={server} 
            onChange={(e) => setServer(e.target.value)}
            className="bg-zinc-950/80 text-white text-sm font-bold py-3 px-4 rounded-xl border border-zinc-800/40 hover:bg-zinc-900/80 focus:outline-none focus:ring-2 focus:ring-[#E50914] cursor-pointer shadow-2xl backdrop-blur-sm"
          >
            {type === 'movie' ? (
              <>
                <option value="viewplayer">🎬 Servidor 1: ViewPlayer (Padrão Filmes)</option>
                <option value="autoembed">🌐 Servidor 2: AutoEmbed HD</option>
                <option value="warezcdn">🇧🇷 Servidor 3: Warez (Dublado PT-BR)</option>
                <option value="vidsrcme">🇺🇸 Servidor 4: VidSrc HD</option>
                <option value="embedmovies">🇧🇷 Servidor 5: EmbedMovies (Dublado)</option>
              </>
            ) : (
              <>
                <option value="autoembed">📺 Servidor 1: AutoEmbed HD (Padrão Séries)</option>
                <option value="warezcdn">🇧🇷 Servidor 2: Warez (Dublado PT-BR)</option>
                <option value="vidsrcme">🇺🇸 Servidor 3: VidSrc HD (Legendado)</option>
                <option value="embedmovies">🇧🇷 Servidor 4: EmbedMovies (Dublado)</option>
                <option value="vidsrc">🌐 Servidor 5: VidSrc CC</option>
              </>
            )}
          </select>
        )}
      </div>

      {/* TV Playback Control Buttons */}
      {type === 'tv' && !isTrailer && (
        <div className="absolute top-4 right-4 z-40 flex space-x-3 pointer-events-auto">
          <button 
            onClick={() => setEpListOpen(!epListOpen)} 
            className={`text-white rounded-full p-3 shadow-2xl border border-zinc-800/40 backdrop-blur-sm cursor-pointer transition-colors ${
              epListOpen ? 'bg-[#E50914] border-red-500/30' : 'bg-zinc-950/80 hover:bg-zinc-800/80'
            }`}
            aria-label="Lista de episódios"
          >
            <ListVideo className="w-6 h-6" />
          </button>
          
          <button 
            onClick={handleNextEpisode} 
            className="text-white bg-zinc-950/80 hover:bg-zinc-800/80 rounded-full p-3 shadow-2xl border border-zinc-800/40 backdrop-blur-sm cursor-pointer"
            aria-label="Próximo episódio"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main Player Screen */}
      <div className="w-full h-full flex-grow relative bg-black flex items-center justify-center">
        {(type === 'channel' || (resolvedStreamUrl && currentSeason === (initialSeason || 1) && currentEpisode === (initialEpisode || 1))) ? (
          <video 
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            muted={type === 'channel'}
            playsInline
          />
        ) : (
          playerUrl && (
            <iframe
              src={playerUrl}
              title="Player de Vídeo"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *;"
              className="w-full h-full"
            />
          )
        )}
      </div>

      {/* Dynamic Slide-out TV Episodes List Guide (Netflix Style) */}
      {type === 'tv' && !isTrailer && (
        <div className={`player-episode-panel shadow-2xl transition-transform duration-300 ${epListOpen ? 'visible' : ''}`}>
          <div className="flex justify-between items-center p-4 border-b border-zinc-800">
            <h4 className="text-xl font-black text-white">Guia de Episódios</h4>
            <button 
              onClick={() => setEpListOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 border-b border-zinc-900/60 bg-zinc-950/40">
            <select 
              value={selectedEpListSeason}
              onChange={(e) => setSelectedEpListSeason(parseInt(e.target.value))}
              className="w-full p-3 rounded-lg bg-zinc-950 text-white border border-zinc-800 text-sm font-bold cursor-pointer focus:outline-none"
            >
              {seasons.map(s => (
                <option key={s.season_number} value={s.season_number}>
                  Temporada {s.season_number} ({s.episode_count} ep.)
                </option>
              ))}
            </select>
          </div>

          <ul className="flex-grow overflow-y-auto divide-y divide-zinc-900/40 scrollbar-none">
            {loadingEpisodes ? (
              <li className="flex items-center justify-center p-12 text-zinc-500 font-medium text-sm">
                <Loader2 className="w-5 h-5 text-[#E50914] animate-spin mr-2" />
                Buscando episódios...
              </li>
            ) : (
              epListEpisodes.map(ep => {
                const isActive = currentSeason === selectedEpListSeason && currentEpisode === ep.episode_number;
                const isWatched = Storage.isEpisodeWatched(id, 'tv', selectedEpListSeason, ep.episode_number);
                const fallbackImg = 'https://placehold.co/120x70/181818/333?text=EP';
                const epImg = ep.still_path ? `${IMG_POSTER_URL}${ep.still_path}` : fallbackImg;
                
                return (
                  <li 
                    key={ep.id}
                    onClick={() => {
                      setCurrentSeason(selectedEpListSeason);
                      setCurrentEpisode(ep.episode_number);
                    }}
                    className={`episode-item p-4 flex gap-3 hover:bg-zinc-900/50 cursor-pointer transition-colors ${
                      isActive ? 'bg-zinc-900/80 border-l-4 border-[#E50914] pl-3' : ''
                    }`}
                  >
                    <span className="text-zinc-500 font-black text-sm w-5 text-center mt-1">{ep.episode_number}</span>
                    <div className="relative flex-shrink-0">
                      <img 
                        src={epImg} 
                        alt={ep.name}
                        className="w-24 h-16 object-cover rounded-lg border border-zinc-800/40"
                        onError={(e) => { e.target.src = fallbackImg; }}
                      />
                      {isWatched && !isActive && (
                        <div className="absolute bottom-1 right-1 bg-black/75 rounded-full p-0.5 border border-red-500/20">
                          <Eye className="w-3 h-3 text-red-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h5 className="text-white text-sm font-bold truncate mb-0.5">{ep.name}</h5>
                      <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                        {ep.overview || 'Sem descrição.'}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
