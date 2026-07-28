import React from 'react';
import { Play, Info } from 'lucide-react';
import { IMG_BASE_URL } from '../services/api';

export default function Hero({ item, onPlay, onInfo }) {
  if (!item) {
    return (
      <section id="hero" className="relative h-[96vh] min-h-[500px] w-full bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-500 text-lg flex items-center">
          <span className="w-5 h-5 border-2 border-zinc-800 border-t-red-500 rounded-full animate-spin mr-3"></span>
          Carregando destaque...
        </div>
      </section>
    );
  }

  const itemType = item.media_type || (item.title ? 'movie' : 'tv');
  const backdropUrl = item.backdrop_path ? `${IMG_BASE_URL}${item.backdrop_path}` : '';

  return (
    <section 
      id="hero" 
      className="relative h-[96vh] min-h-[500px] w-full bg-cover bg-top bg-no-repeat transition-all duration-500 flex items-end pb-40 md:pb-44"
      style={{ backgroundImage: `url(${backdropUrl})` }}
    >
      {/* Dark left-to-right gradient vignette and bottom gradient vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
      
      <div className="relative z-10 w-full px-6 md:px-20 flex flex-col items-start space-y-4 md:w-2/3">
        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2 select-none tracking-tight">
          {item.title || item.name}
        </h2>
        <p className="text-sm md:text-lg text-zinc-300 font-medium leading-relaxed drop-shadow max-w-2xl line-clamp-3 md:line-clamp-4 select-none">
          {item.overview || 'Nenhuma descrição disponível no momento.'}
        </p>
        
        <div className="flex flex-wrap gap-3 pt-2">
          <button 
            onClick={() => onPlay(item.id, itemType, item)}
            className="flex items-center justify-center px-6 py-3 bg-white text-black font-extrabold rounded-lg hover:bg-zinc-200 active:scale-95 transition-all shadow-lg text-base cursor-pointer"
          >
            <Play className="w-5 h-5 mr-2 fill-black stroke-black" />
            Assistir
          </button>
          
          <button 
            onClick={() => onInfo(item.id, itemType)}
            className="flex items-center justify-center px-6 py-3 bg-zinc-700/65 text-white font-bold rounded-lg hover:bg-zinc-700/80 active:scale-95 backdrop-blur-md transition-all shadow-lg text-base cursor-pointer border border-zinc-600/30"
          >
            <Info className="w-5 h-5 mr-2 text-zinc-300" />
            Mais Informações
          </button>
        </div>
      </div>
    </section>
  );
}
