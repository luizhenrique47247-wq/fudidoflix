import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DetailsModal from './components/DetailsModal';
import PlayerModal from './components/PlayerModal';
import Login from './views/Login';
import Home from './views/Home';
import Browse from './views/Browse';
import CategoryPage from './views/CategoryPage';
import MinhaLista from './views/MinhaLista';
import Historico from './views/Historico';
import AoVivo from './views/AoVivo';
import Sorte from './views/Sorte';
import Profiles from './views/Profiles';
import * as Storage from './services/storageService';
import { ArrowLeft, Loader2, ArrowUp, Trash2, LogOut, History } from 'lucide-react';
import { fetchTMDB, IMG_POSTER_URL } from './services/api';

const INTRO_WATCHED_KEY = 'fudidoFlixIntroWatched';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('fudidoFlixAccess') === 'granted'
  );
  const [activeTab, setActiveTab] = useState('inicio');
  const [introOpen, setIntroOpen] = useState(
    !sessionStorage.getItem(INTRO_WATCHED_KEY)
  );
  const [activeProfile, setActiveProfile] = useState(
    Storage.getActiveProfile()
  );

  // Search, Actor, and Genre filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [actorDetails, setActorDetails] = useState(null);
  const [actorCredits, setActorCredits] = useState([]);
  const [loadingActor, setLoadingActor] = useState(false);
  const [genreFilter, setGenreFilter] = useState(null); // { id, name, type }

  // Modal overlays states
  const [detailsMedia, setDetailsMedia] = useState(null); // { id, type }
  const [playerMedia, setPlayerMedia] = useState(null); // { id, type, season, episode, itemData, isTrailer, trailerKey }

  // App confirm actions modals states
  const [confirmModal, setConfirmModal] = useState(null); // { title, msg, action }
  
  // Scroll back to top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset intro watched flag and profile when user becomes unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem(INTRO_WATCHED_KEY);
      Storage.clearActiveProfileId();
      setActiveProfile(null);
      setIntroOpen(true);
    }
  }, [isAuthenticated]);

  // Run initial notifications syncing on access granted
  useEffect(() => {
    if (!isAuthenticated) return;

    const runSync = async () => {
      const lastCheck = Storage.getLastCheck();
      const now = new Date();

      if (!lastCheck) {
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        Storage.setLastCheck(fourHoursAgo.toISOString());
        return;
      }

      const lastCheckDate = new Date(lastCheck);
      const hoursDiff = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff >= 4) {
        // Sync notifications
        const myList = Storage.getMyList();
        const tvList = myList.filter(item => item.type === 'tv' || item.media_type === 'tv');

        if (tvList.length > 0) {
          for (const series of tvList) {
            try {
              const details = await fetchTMDB(`/tv/${series.id}`);
              if (details && details.last_episode_to_air && details.last_episode_to_air.air_date) {
                const epDate = new Date(details.last_episode_to_air.air_date);
                if (epDate > lastCheckDate) {
                  const ep = details.last_episode_to_air;
                  Storage.saveToInbox({
                    type: 'new_ep',
                    seriesId: details.id,
                    seriesName: details.name,
                    season: ep.season_number,
                    episode: ep.episode_number,
                    uniqueId: `${details.id}-S${ep.season_number}-E${ep.episode_number}`
                  });
                }
              }
            } catch (e) {
              console.warn(e);
            }
          }
        }

        const continueList = Storage.getContinueWatchingList();
        const watchedEpisodes = Storage.getWatchedEpisodes();
        const tvHistory = continueList.filter(h => h.type === 'tv' || h.media_type === 'tv');

        if (tvHistory.length > 0) {
          const lastWatched = tvHistory[0];
          const lastEp = watchedEpisodes.find(ep => ep.id === lastWatched.id);
          if (lastEp) {
            Storage.saveToInbox({
              type: 'continue_watching',
              seriesId: lastWatched.id,
              seriesName: lastWatched.title,
              season: lastEp.season,
              episode: lastEp.episode + 1,
              uniqueId: `continue-${lastWatched.id}`
            });
          }
        }

        if (myList.length > 0) {
          const randomItem = myList[Math.floor(Math.random() * myList.length)];
          Storage.saveToInbox({
            type: 'my_list_reminder',
            seriesId: randomItem.id,
            seriesName: randomItem.title || randomItem.name,
            itemType: randomItem.type || randomItem.media_type,
            uniqueId: `reminder-${randomItem.id}`
          });
        }

        Storage.setLastCheck();
      }
    };

    runSync();
  }, [isAuthenticated]);

  const handleSkipIntro = () => {
    setIntroOpen(false);
    sessionStorage.setItem(INTRO_WATCHED_KEY, 'true');
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setActiveTab('search');
    setLoadingSearch(true);
    try {
      const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
      if (data && data.results) {
        setSearchResults(data.results.filter(item => item.media_type !== 'person' && item.poster_path));
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectActor = async (actorId, actorName) => {
    setActorDetails({ id: actorId, name: actorName });
    setActiveTab('actor');
    setLoadingActor(true);
    try {
      const [movieData, tvData] = await Promise.all([
        fetchTMDB(`/person/${actorId}/movie_credits`),
        fetchTMDB(`/person/${actorId}/tv_credits`)
      ]);
      const movieCast = (movieData?.cast || []).map(m => ({ ...m, media_type: 'movie' }));
      const movieCrew = (movieData?.crew || []).map(m => ({ ...m, media_type: 'movie' }));
      const tvCast = (tvData?.cast || []).map(t => ({ ...t, media_type: 'tv' }));
      const tvCrew = (tvData?.crew || []).map(t => ({ ...t, media_type: 'tv' }));

      const allCredits = [...movieCast, ...movieCrew, ...tvCast, ...tvCrew];
      // De-duplicate credits
      const unique = [...new Map(allCredits.map(item => [item['id'], item])).values()];
      const sorted = unique.filter(item => item.poster_path).sort((a, b) => b.popularity - a.popularity);
      setActorCredits(sorted);
    } catch (e) {
      console.error(e);
      setActorCredits([]);
    } finally {
      setLoadingActor(false);
    }
  };

  const handleSelectGenre = (genreId, genreName, type) => {
    setGenreFilter({ id: genreId, name: genreName, type });
    setActiveTab('genre');
  };

  const handlePlayMedia = (id, type, season = null, episode = null, itemData = null, resolvedStreamUrl = null) => {
    setPlayerMedia({ id, type, season, episode, itemData, resolvedStreamUrl, isTrailer: false });
  };

  const handlePlayTrailer = async (id, type) => {
    const endpoint = type === 'movie' ? `/movie/${id}/videos` : `/tv/${id}/videos`;
    try {
      const data = await fetchTMDB(endpoint);
      if (data && data.results?.length > 0) {
        const trailers = data.results.filter(v => v.site === 'YouTube' && v.type === 'Trailer');
        let official = trailers.find(t => t.official && (t.iso_639_1 === 'pt' || t.iso_639_1 === 'en'));
        if (!official) official = trailers.find(t => t.official);
        if (!official) official = trailers[0];

        const targetKey = official ? official.key : data.results[0].key;
        setPlayerMedia({ id, type, isTrailer: true, trailerKey: targetKey });
      } else {
        alert("Nenhum trailer encontrado para este título.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeProfile = () => {
    Storage.clearActiveProfileId();
    setActiveProfile(null);
    sessionStorage.removeItem(INTRO_WATCHED_KEY);
    setIntroOpen(true);
  };

  // Confirm Modal Executions
  const triggerConfirmModal = (title, msg, action) => {
    setConfirmModal({ title, msg, action });
  };

  const executeConfirmAction = () => {
    if (!confirmModal) return;
    const { action } = confirmModal;
    setConfirmModal(null);

    if (action === 'clearList') {
      Storage.clearMyList();
      window.location.reload();
    } else if (action === 'clearHistory') {
      Storage.clearAllHistory();
      window.location.reload();
    } else if (action === 'logout') {
      sessionStorage.removeItem('fudidoFlixAccess');
      sessionStorage.removeItem(INTRO_WATCHED_KEY);
      Storage.clearActiveProfileId();
      setActiveProfile(null);
      setIntroOpen(true);
      setIsAuthenticated(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (!activeProfile) {
    return (
      <Profiles 
        onSelectProfile={(profile) => {
          Storage.setActiveProfileId(profile.id);
          setActiveProfile(profile);
        }} 
      />
    );
  }

  if (introOpen) {
    return (
      <div id="intro-modal" className="fixed inset-0 z-[200] bg-black select-none">
        <video 
          id="intro-video" 
          className="w-full h-full object-cover" 
          autoPlay 
          muted 
          playsInline
          onEnded={handleSkipIntro}
          onError={handleSkipIntro}
        >
          <source src="./mQfvVxg.mp4" type="video/mp4" />
        </video>
        <button 
          onClick={handleSkipIntro} 
          className="absolute bottom-10 right-10 z-[201] flex items-center px-6 py-3 bg-black/60 hover:bg-black/90 border border-zinc-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-2xl backdrop-blur-md"
        >
          Pular Abertura
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSearch={handleSearch}
        onClearList={() => triggerConfirmModal('Limpar Lista', 'Deseja remover TODOS os itens da sua lista?', 'clearList')}
        onClearHistory={() => triggerConfirmModal('Limpar Histórico', 'Deseja limpar TODO o seu histórico de exibição?', 'clearHistory')}
        onLogout={() => triggerConfirmModal('Deslogar', 'Deseja sair da sua sessão?', 'logout')}
        activeProfile={activeProfile}
        onChangeProfile={handleChangeProfile}
        openDetails={(id, type) => setDetailsMedia({ id, type })}
      />

      <main className="flex-1">
        {activeTab === 'inicio' && (
          <Home 
            onSelectMedia={(id, type, mode, data) => {
              setDetailsMedia({ id, type });
            }}
          />
        )}

        {(activeTab === 'tv' || activeTab === 'movie' || activeTab === 'anime') && (
          <CategoryPage 
            type={activeTab}
            title={activeTab === 'tv' ? 'Séries' : (activeTab === 'movie' ? 'Filmes' : 'Animes')}
            onSelectMedia={(id, type, mode, data) => {
              if (mode === 'play') {
                handlePlayMedia(id, type, null, null, data);
              } else {
                setDetailsMedia({ id, type: type === 'anime' ? 'tv' : type });
              }
            }}
          />
        )}

        {activeTab === 'minha-lista' && (
          <MinhaLista 
            onSelectMedia={(id, type) => setDetailsMedia({ id, type })}
          />
        )}

        {activeTab === 'historico' && (
          <Historico 
            onSelectMedia={(id, type) => setDetailsMedia({ id, type })}
          />
        )}

        {activeTab === 'ao-vivo' && <AoVivo />}

        {activeTab === 'sorte' && (
          <Sorte 
            openDetails={(id, type) => setDetailsMedia({ id, type })}
            openPlayer={(id, type) => handlePlayMedia(id, type, type === 'tv' ? 1 : null, type === 'tv' ? 1 : null)}
          />
        )}

        {/* Dynamic Search view results */}
        {activeTab === 'search' && (
          <div className="pt-18 px-4 md:px-16 pb-20 route-transition">
            <h2 className="text-3xl font-black mb-8 select-text">Resultados para "{searchQuery}"</h2>
            {loadingSearch ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mr-2" />
                <span className="text-zinc-500 font-semibold text-sm">Pesquisando catálogo...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-zinc-500 font-medium">Nenhum resultado encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setDetailsMedia({ id: item.id, type: item.media_type })}
                    className="poster-grid-wrapper relative cursor-pointer rounded-lg overflow-hidden border border-zinc-800/10 group shadow-md"
                  >
                    <img 
                      src={`${IMG_POSTER_URL}${item.poster_path}`} 
                      className="w-full h-auto aspect-[2/3] object-cover transition-transform group-hover:scale-105" 
                      alt=""
                    />
                    <div className="poster-title-overlay absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 flex flex-col justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="text-white text-xs font-bold leading-tight line-clamp-2">{item.title || item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Actor Credits Filmography View */}
        {activeTab === 'actor' && actorDetails && (
          <div className="pt-18 px-4 md:px-16 pb-20 route-transition">
            <button 
              onClick={() => setActiveTab('inicio')}
              className="flex items-center space-x-2 text-zinc-400 hover:text-white mb-6 font-bold text-sm cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" /> <span>Voltar</span>
            </button>
            <h2 className="text-3xl font-black mb-8 select-text">Filmografia de {actorDetails.name}</h2>
            {loadingActor ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mr-2" />
                <span className="text-zinc-500 font-semibold">Resgatando créditos...</span>
              </div>
            ) : actorCredits.length === 0 ? (
              <p className="text-zinc-500 font-medium">Nenhuma produção registrada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {actorCredits.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setDetailsMedia({ id: item.id, type: item.media_type })}
                    className="poster-grid-wrapper relative cursor-pointer rounded-lg overflow-hidden border border-zinc-800/10 group shadow-md"
                  >
                    <img 
                      src={`${IMG_POSTER_URL}${item.poster_path}`} 
                      className="w-full h-auto aspect-[2/3] object-cover transition-transform group-hover:scale-105" 
                      alt=""
                    />
                    <div className="poster-title-overlay absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 flex flex-col justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="text-white text-xs font-bold leading-tight line-clamp-2">{item.title || item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Genre Filter View */}
        {activeTab === 'genre' && genreFilter && (
          <div className="pt-18 px-4 md:px-16 pb-20 route-transition">
            <button 
              onClick={() => setActiveTab('inicio')}
              className="flex items-center space-x-2 text-zinc-400 hover:text-white mb-6 font-bold text-sm cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" /> <span>Voltar</span>
            </button>
            <Browse 
              type={genreFilter.type}
              title={`${genreFilter.type === 'movie' ? 'Filmes' : 'Séries'} de ${genreFilter.name}`}
              onSelectMedia={(id, type) => setDetailsMedia({ id, type })}
              initialGenre={genreFilter.id}
            />
          </div>
        )}
      </main>

      <footer className="text-center text-[#E50914] text-xs font-black py-8 border-t border-zinc-900 select-none">
        Você chegou ao fim! FUDIDOFLIX © {new Date().getFullYear()}
      </footer>

      {/* Floating Scroll back to top Button */}
      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 p-3.5 bg-[#E50914] rounded-full text-white cursor-pointer hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-500/10 border border-red-500/20"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Details Modal Overlay */}
      {detailsMedia && (
        <DetailsModal 
          id={detailsMedia.id}
          type={detailsMedia.type}
          onClose={() => setDetailsMedia(null)}
          onPlay={handlePlayMedia}
          onPlayTrailer={handlePlayTrailer}
          onSelectActor={handleSelectActor}
          onSelectGenre={handleSelectGenre}
          onSelectMedia={(id, type) => setDetailsMedia({ id, type })}
        />
      )}

      {/* Player Modal Overlay */}
      {playerMedia && (
        <PlayerModal 
          id={playerMedia.id}
          type={playerMedia.type}
          initialSeason={playerMedia.season}
          initialEpisode={playerMedia.episode}
          itemData={playerMedia.itemData}
          resolvedStreamUrl={playerMedia.resolvedStreamUrl}
          isTrailer={playerMedia.isTrailer}
          trailerKey={playerMedia.trailerKey}
          onClose={() => setPlayerMedia(null)}
          onPlayerClose={() => {
            // Trigger refresh logic on closing player
            if (activeTab === 'inicio') {
              // Row re-trigger refresh
              window.location.reload();
            }
          }}
        />
      )}

      {/* General App Confirmation Dialog Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[150] confirmation-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmModal(null)}></div>
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 animate-scale-up">
            <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              {confirmModal.action === 'logout' ? <LogOut className="w-5 h-5 text-red-500" /> : 
               (confirmModal.action === 'clearList' ? <Trash2 className="w-5 h-5 text-red-500" /> : <History className="w-5 h-5 text-red-500" />)}
              {confirmModal.title}
            </h4>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed select-text">
              {confirmModal.msg}
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 transition-colors text-sm cursor-pointer border border-zinc-700/40"
              >
                Cancelar
              </button>
              <button 
                onClick={executeConfirmAction}
                className="px-5 py-2.5 bg-[#E50914] text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm cursor-pointer shadow-lg shadow-red-500/10"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
