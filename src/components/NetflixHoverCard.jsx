import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Check, X, ChevronDown, Star } from 'lucide-react';
import { fetchTMDB, IMG_BASE_URL, IMG_POSTER_URL } from '../services/api';
import * as Storage from '../services/storageService';

const GENRE_MAP = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia', 36: 'História',
  27: 'Terror', 10402: 'Música', 9648: 'Mistério', 10749: 'Romance', 878: 'Ficção Científica',
  10770: 'Cinema TV', 53: 'Suspense', 10752: 'Guerra', 37: 'Faroeste',
  10759: 'Ação & Aventura', 10762: 'Kids', 10763: 'Notícias', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasia', 10766: 'Soap', 10767: 'Talk', 10768: 'Guerra & Política'
};

export default function NetflixHoverCard({ item, type, onClickItem, onPlayItem, showRemoveButton, onRemove, isFirst, isLast }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  
  const timerRef = useRef(null);
  const itemType = (type && type !== 'anime') ? type : (item.media_type || (item.title ? 'movie' : 'tv'));
  const posterPath = item.poster_path;
  const originClass = isFirst ? 'origin-left' : (isLast ? 'origin-right' : 'origin-center');
  const backdropPath = item.backdrop_path || item.poster_path;

  useEffect(() => {
    setIsInList(Storage.isItemInMyList(item.id, itemType));
  }, [item.id, itemType]);

  // Fetch title logo on expansion
  useEffect(() => {
    if (isExpanded && !logoUrl) {
      fetchTMDB(`/${itemType}/${item.id}/images?include_image_language=pt,en,null`)
        .then(data => {
          if (data && data.logos && data.logos.length > 0) {
            const ptLogo = data.logos.find(l => l.iso_639_1 === 'pt');
            const enLogo = data.logos.find(l => l.iso_639_1 === 'en');
            const chosen = ptLogo || enLogo || data.logos[0];
            if (chosen) {
              setLogoUrl(`${IMG_BASE_URL}${chosen.file_path}`);
            }
          }
        })
        .catch(() => {});
    }
  }, [isExpanded, item.id, itemType, logoUrl]);

  if (!posterPath) return null;

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 500); // 500ms delay as requested
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsExpanded(false);
  };

  const handleToggleMyList = (e) => {
    e.stopPropagation();
    if (isInList) {
      Storage.removeFromMyList(item.id, itemType);
      setIsInList(false);
    } else {
      Storage.saveToMyList({
        id: item.id,
        type: itemType,
        title: item.title || item.name,
        poster_path: item.poster_path,
        media_type: itemType
      });
      setIsInList(true);
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (onPlayItem) {
      onPlayItem(item.id, itemType, item);
    } else if (onClickItem) {
      onClickItem(item.id, itemType, 'play', item);
    }
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    if (onClickItem) {
      onClickItem(item.id, itemType, 'info');
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(item);
    }
  };

  const releaseYear = (item.release_date || item.first_air_date || '2025').substring(0, 4);
  const relevance = Math.round((item.vote_average || 8.5) * 10);
  
  // Extract genres names
  let genreNames = [];
  if (item.genre_ids && item.genre_ids.length > 0) {
    genreNames = item.genre_ids.slice(0, 3).map(id => GENRE_MAP[id]).filter(Boolean);
  } else if (item.genres && item.genres.length > 0) {
    genreNames = item.genres.slice(0, 3).map(g => g.name);
  }

  return (
    <div 
      className="relative select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Standard Poster State */}
      <div 
        onClick={handleInfoClick}
        className={`poster-grid-wrapper relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-300 bg-zinc-900 border border-zinc-800/20 group ${
          isExpanded ? 'opacity-0 scale-95' : 'opacity-100 hover:scale-105'
        }`}
      >
        <img
          src={`${IMG_POSTER_URL}${posterPath}`}
          alt={item.title || item.name}
          className="poster-grid w-full h-auto aspect-[2/3] object-cover transition-transform duration-300"
          loading="lazy"
        />

        {showRemoveButton && (
          <button
            onClick={handleRemoveClick}
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center border border-zinc-700/60 opacity-0 group-hover:opacity-100 transition-all duration-200"
            title="Remover"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="poster-title-overlay absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="text-white text-xs font-bold leading-tight line-clamp-2">
            {item.title || item.name}
          </span>
        </div>
      </div>

      {/* Netflix Expanded Pop-out Floating Card */}
      {isExpanded && (
        <div 
          onClick={handleInfoClick}
          className="absolute inset-0 w-full h-full z-[100] bg-zinc-950 border-2 border-[#E50914]/80 rounded-xl shadow-2xl overflow-hidden animate-scale-up cursor-pointer transform scale-108 md:scale-112 origin-center transition-all duration-300 flex flex-col justify-between"
          style={{ filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.95))' }}
        >
          {/* Vertical Poster Header */}
          <img 
            src={`${IMG_POSTER_URL}${posterPath}`} 
            alt={item.title || item.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-transparent"></div>

          {/* Top Logo Area */}
          <div className="relative z-10 p-3 flex justify-start">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt={item.title || item.name} 
                className="max-h-10 max-w-[85%] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)]"
              />
            )}
          </div>

          {/* Quick Actions & Meta Body Overlay on Bottom */}
          <div className="relative z-10 p-3 space-y-2">
            
            {/* Buttons Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePlayClick}
                  className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Assistir Agora"
                >
                  <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                </button>

                <button
                  onClick={handleToggleMyList}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                    isInList 
                      ? 'bg-green-500/20 border-green-500 text-green-500 hover:bg-green-500/30' 
                      : 'bg-zinc-800/80 border-zinc-700 text-white hover:bg-zinc-700/80'
                  }`}
                  title={isInList ? "Remover de Minha Lista" : "Adicionar a Minha Lista"}
                >
                  {isInList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={handleInfoClick}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer"
                title="Mais Informações"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metadata Badges Row */}
            <div className="flex items-center space-x-1.5 text-[10px] font-bold">
              {/* IMDb Score */}
              <div className="flex items-center space-x-0.5 text-yellow-400 font-black text-[9px] bg-yellow-500/10 px-1 py-0.5 rounded border border-yellow-500/20">
                <Star className="w-2.5 h-2.5 fill-yellow-400 stroke-yellow-400" />
                <span>{item.vote_average ? item.vote_average.toFixed(1) : '8.2'}</span>
              </div>
              <span className="text-emerald-400 font-black">{relevance}%</span>
              <span className="border border-zinc-700 text-zinc-300 px-1 py-0.5 rounded text-[8px] uppercase">
                {itemType === 'movie' ? 'Filme' : 'Série'}
              </span>
              <span className="text-zinc-400 font-semibold">{releaseYear}</span>
              <span className="border border-zinc-700 text-zinc-400 px-1 py-0.5 rounded text-[8px] font-extrabold">HD</span>
            </div>

            {/* Genres Tag Dots Row */}
            {genreNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[9px] text-zinc-300 font-medium line-clamp-1">
                {genreNames.map((g, idx) => (
                  <React.Fragment key={g}>
                    <span>{g}</span>
                    {idx < genreNames.length - 1 && <span className="text-zinc-600 font-bold">•</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
