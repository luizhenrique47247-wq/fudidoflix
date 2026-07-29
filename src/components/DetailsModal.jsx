import React, { useState, useEffect } from 'react';
import { X, Play, Clapperboard, Plus, Check, Eye, Loader2 } from 'lucide-react';
import { fetchTMDB, IMG_BASE_URL, IMG_POSTER_URL } from '../services/api';
import * as Storage from '../services/storageService';

export default function DetailsModal({ id, type: rawType, onClose, onPlay, onPlayTrailer, onSelectActor, onSelectGenre, onSelectMedia }) {
  const type = rawType === 'anime' ? 'tv' : rawType;
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [titleLogo, setTitleLogo] = useState(null);
  const [ageRating, setAgeRating] = useState('L');
  const [isInList, setIsInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seasonsData, setSeasonsData] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [similarItems, setSimilarItems] = useState([]);

  useEffect(() => {
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, []);

  useEffect(() => {
    if (!id || !type) return;

    const loadData = async () => {
      setLoading(true);
      setTitleLogo(null);
      setSimilarItems([]);
      try {
        const [detailsData, creditsData, imagesData, similarData] = await Promise.all([
          fetchTMDB(`/${type}/${id}`),
          fetchTMDB(`/${type}/${id}/credits`),
          fetchTMDB(`/${type}/${id}/images?include_image_language=pt,en,null`),
          fetchTMDB(`/${type}/${id}/similar`)
        ]);
        
        let certData = null;
        if (type === 'movie') {
          certData = await fetchTMDB(`/movie/${id}/release_dates`);
        } else {
          certData = await fetchTMDB(`/tv/${id}/content_ratings`);
        }

        setDetails(detailsData);
        setCredits(creditsData);
        setIsInList(Storage.isItemInMyList(id, type));

        if (similarData && similarData.results?.length > 0) {
          setSimilarItems(similarData.results.filter(item => item.backdrop_path || item.poster_path).slice(0, 9));
        } else {
          const recData = await fetchTMDB(`/${type}/${id}/recommendations`);
          setSimilarItems((recData?.results || []).filter(item => item.backdrop_path || item.poster_path).slice(0, 9));
        }

        if (imagesData && imagesData.logos && imagesData.logos.length > 0) {
          const ptLogo = imagesData.logos.find(l => l.iso_639_1 === 'pt');
          const enLogo = imagesData.logos.find(l => l.iso_639_1 === 'en');
          const chosenLogo = ptLogo || enLogo || imagesData.logos[0];
          if (chosenLogo) {
            setTitleLogo(`${IMG_BASE_URL}${chosenLogo.file_path}`);
          }
        }

        let rating = 'L';
        if (certData && certData.results) {
          const brRating = certData.results.find(res => res.iso_3166_1 === 'BR');
          if (brRating) {
            if (type === 'movie' && brRating.release_dates?.length > 0) {
              rating = brRating.release_dates.find(rd => rd.certification)?.certification || 'L';
            } else if (type === 'tv') {
              rating = brRating.rating || 'L';
            }
          }
        }
        setAgeRating(rating === '' ? 'L' : rating);

        if (type === 'tv' && detailsData.seasons) {
          const validSeasons = detailsData.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
          setSeasonsData(validSeasons);
          if (validSeasons.length > 0) {
            const firstSeasonNum = validSeasons[0].season_number;
            setSelectedSeason(firstSeasonNum.toString());
            await fetchEpisodes(id, firstSeasonNum);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes do modal:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, type]);

  const fetchEpisodes = async (seriesId, seasonNum) => {
    setLoadingEpisodes(true);
    try {
      const data = await fetchTMDB(`/tv/${seriesId}/season/${seasonNum}`);
      if (data && data.episodes) {
        setEpisodes(data.episodes);
      } else {
        setEpisodes([]);
      }
    } catch (e) {
      console.error("Erro ao buscar episódios:", e);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleSeasonChange = async (e) => {
    const seasonNum = parseInt(e.target.value);
    setSelectedSeason(e.target.value);
    await fetchEpisodes(id, seasonNum);
  };

  const handleToggleMyList = () => {
    if (!details) return;
    const itemData = {
      id: details.id,
      type: type,
      title: details.title || details.name,
      poster_path: details.poster_path,
      media_type: type
    };

    if (isInList) {
      Storage.removeFromMyList(details.id, type);
      setIsInList(false);
    } else {
      Storage.saveToMyList(itemData);
      setIsInList(true);
    }
  };

  // DIRECT PLAY: Opens PlayerModal directly with NO Addons / Stremio screen!
  const handlePlayClick = () => {
    if (!details) return;
    const seasonNum = type === 'tv' ? (parseInt(selectedSeason) || 1) : null;
    const episodeNum = type === 'tv' ? (episodes.length > 0 ? episodes[0].episode_number : 1) : null;
    
    onPlay(details.id, type, seasonNum, episodeNum, {
      title: details.title || details.name,
      poster_path: details.poster_path,
      imdb_id: details.imdb_id || (details.external_ids?.imdb_id) || null,
      fullSeasonsData: seasonsData
    });
    onClose();
  };

  const handleEpisodePlayClick = (episode) => {
    onPlay(details.id, type, parseInt(selectedSeason), episode.episode_number, {
      title: details.title || details.name,
      poster_path: details.poster_path,
      imdb_id: details.imdb_id || (details.external_ids?.imdb_id) || null,
      fullSeasonsData: seasonsData
    });
    onClose();
  };

  if (!id || !type) return null;

  return (
    <div className="fixed inset-0 z-[100] details-modal-backdrop flex justify-center pt-8 md:pt-12 px-2 sm:px-4 pb-0 bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative w-full max-w-4xl h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] overflow-y-auto bg-zinc-900 border-t border-x border-zinc-800 text-white rounded-t-2xl rounded-b-none shadow-2xl z-10 flex flex-col scrollbar-none animate-scale-up">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 text-white bg-black/60 hover:bg-black/90 rounded-full p-2 border border-zinc-800 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-[#E50914] animate-spin mb-4" />
            <p className="text-zinc-400 font-medium">Buscando sinopse...</p>
          </div>
        ) : (
          details && (
            <>
              {/* Top Fanart Banner Section */}
              <div className="relative w-full h-64 md:h-96 shrink-0 flex items-end pb-8 overflow-hidden rounded-t-xl bg-zinc-950">
                {(details.backdrop_path || details.poster_path) && (
                  <img 
                    src={`${IMG_BASE_URL}${details.backdrop_path || details.poster_path}`}
                    alt={details.title || details.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent"></div>

                <div className="relative z-10 px-6 md:px-12 w-full">
                  {titleLogo ? (
                    <img 
                      src={titleLogo} 
                      alt={details.title || details.name} 
                      className="max-h-20 md:max-h-32 max-w-[240px] md:max-w-[400px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)] select-none mb-4 animate-fade-in"
                    />
                  ) : (
                    <h3 className="text-2xl md:text-5xl font-black text-white leading-tight drop-shadow-lg tracking-tight select-none mb-4">
                      {details.title || details.name}
                    </h3>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={handlePlayClick}
                      className="flex items-center px-6 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-lg transition-colors text-base cursor-pointer shadow-lg"
                    >
                      <Play className="w-5 h-5 mr-2 fill-white stroke-white" />
                      Assistir
                    </button>
                    
                    <button 
                      onClick={() => { onPlayTrailer(details.id, type); onClose(); }}
                      className="flex items-center px-5 py-2.5 bg-zinc-700/60 text-white font-bold rounded-lg hover:bg-zinc-700/80 backdrop-blur-md transition-colors text-base cursor-pointer border border-zinc-600/30"
                    >
                      <Clapperboard className="w-5 h-5 mr-2" />
                      Trailer
                    </button>
                    
                    <button 
                      onClick={handleToggleMyList}
                      className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all cursor-pointer ${
                        isInList 
                          ? 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20' 
                          : 'bg-zinc-700/60 border-zinc-600/40 text-white hover:bg-zinc-700/80'
                      }`}
                      title={isInList ? "Remover de Minha Lista" : "Adicionar a Minha Lista"}
                    >
                      {isInList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Details Content Columns */}
              <div className="p-6 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4 text-sm font-semibold">
                    <span className="text-emerald-400 font-extrabold">{Math.round((details.vote_average || 8.5) * 10)}% Relevante</span>
                    <span className="text-zinc-400 font-bold">
                      {(details.release_date || details.first_air_date || '2026').substring(0, 4)}
                    </span>
                    <span className="border border-zinc-700 text-zinc-300 text-xs px-1.5 py-0.5 rounded font-bold uppercase">
                      {ageRating}
                    </span>
                  </div>

                  <p className="text-[#D2D2D2] text-sm md:text-base leading-relaxed mb-6 font-normal">
                    {details.overview || "Sem descrição disponível."}
                  </p>
                </div>

                <div className="space-y-4 text-xs md:text-sm">
                  {credits && credits.cast && credits.cast.length > 0 && (
                    <div>
                      <span className="text-zinc-500 font-bold block mb-1">Elenco:</span>
                      <div className="flex flex-wrap gap-1 text-zinc-300">
                        {credits.cast.slice(0, 5).map((actor, idx) => (
                          <span 
                            key={actor.id} 
                            onClick={() => { onSelectActor(actor.id, actor.name); onClose(); }}
                            className="hover:underline cursor-pointer hover:text-white transition-colors"
                          >
                            {actor.name}{idx < Math.min(credits.cast.length, 5) - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.genres && details.genres.length > 0 && (
                    <div>
                      <span className="text-zinc-500 font-bold block mb-1">Gêneros:</span>
                      <div className="flex flex-wrap gap-1 text-zinc-300">
                        {details.genres.map((genre, idx) => (
                          <span 
                            key={genre.id} 
                            onClick={() => { onSelectGenre(genre.id, genre.name, type); onClose(); }}
                            className="hover:underline cursor-pointer hover:text-white transition-colors"
                          >
                            {genre.name}{idx < details.genres.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TV Seasons and Episodes Section */}
              {type === 'tv' && seasonsData.length > 0 && (
                <div className="p-6 md:p-12 border-t border-zinc-800/60 bg-zinc-950/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">Episódios</h4>
                    <select
                      value={selectedSeason}
                      onChange={handleSeasonChange}
                      className="bg-zinc-900 border border-zinc-800 text-white font-bold text-sm rounded-lg p-2.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
                    >
                      {seasonsData.map(season => (
                        <option key={season.season_number} value={season.season_number}>
                          Temporada {season.season_number} ({season.episode_count} episódios)
                        </option>
                      ))}
                    </select>
                  </div>

                  {loadingEpisodes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {episodes.map(ep => {
                        const isWatched = Storage.isEpisodeWatched(id, 'tv', parseInt(selectedSeason), ep.episode_number);
                        const fallbackImg = 'https://placehold.co/160x90/181818/333?text=EP';
                        const epImg = ep.still_path ? `${IMG_POSTER_URL}${ep.still_path}` : fallbackImg;

                        return (
                          <div 
                            key={ep.id}
                            onClick={() => handleEpisodePlayClick(ep)}
                            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40 hover:bg-zinc-800/50 hover:border-zinc-700/60 transition-all cursor-pointer group"
                          >
                            <span className="text-zinc-500 font-extrabold text-lg w-6 text-center">{ep.episode_number}</span>
                            <div className="relative flex-shrink-0 w-28 md:w-40 h-16 md:h-24 rounded-lg overflow-hidden border border-zinc-800">
                              <img 
                                src={epImg} 
                                alt={ep.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.target.src = fallbackImg; }}
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-8 h-8 text-white fill-white" />
                              </div>
                              {isWatched && (
                                <div className="absolute bottom-1 right-1 bg-black/80 rounded-full p-1 border border-red-500/20">
                                  <Eye className="w-3.5 h-3.5 text-red-500" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h5 className="text-white font-bold text-sm md:text-base truncate group-hover:text-red-500 transition-colors">
                                {ep.name}
                              </h5>
                              <p className="text-zinc-400 text-xs md:text-sm line-clamp-2 mt-1 leading-relaxed">
                                {ep.overview || "Sem sinopse para este episódio."}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Títulos Semelhantes (Netflix Recommendations Grid) */}
              {similarItems.length > 0 && (
                <div className="p-6 md:p-12 border-t border-zinc-800/60 bg-zinc-950/80">
                  <h4 className="text-xl md:text-2xl font-black text-white mb-6 tracking-tight">
                    Títulos Semelhantes
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                    {similarItems.map(item => {
                      const itemYear = (item.release_date || item.first_air_date || '2026').substring(0, 4);
                      const itemRelevance = Math.round((item.vote_average || 8.2) * 10);
                      const bgPath = item.backdrop_path || item.poster_path;

                      return (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (onSelectMedia) {
                              onSelectMedia(item.id, type);
                            }
                          }}
                          className="bg-[#181818] border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg hover:border-zinc-700/80 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          {/* Top Backdrop Image */}
                          <div className="relative w-full aspect-[16/9] bg-zinc-950 overflow-hidden">
                            {bgPath && (
                              <img 
                                src={`${IMG_BASE_URL}${bgPath}`} 
                                alt={item.title || item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
                            
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                                <Play className="w-5 h-5 fill-black ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Info Body */}
                          <div className="p-3 md:p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center space-x-2 text-[11px] md:text-xs font-bold mb-1">
                                <span className="text-emerald-400 font-extrabold">{itemRelevance}% Relevante</span>
                                <span className="border border-zinc-700 text-zinc-400 px-1 py-0.5 rounded text-[9px]">HD</span>
                                <span className="text-zinc-400 font-semibold">{itemYear}</span>
                              </div>

                              <h5 className="font-extrabold text-white text-sm md:text-base leading-snug line-clamp-1 group-hover:text-[#E50914] transition-colors">
                                {item.title || item.name}
                              </h5>

                              <p className="text-zinc-400 text-xs line-clamp-3 mt-1.5 leading-relaxed font-normal">
                                {item.overview || "Sem sinopse disponível."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
