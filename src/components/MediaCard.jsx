import React from 'react';
import { X } from 'lucide-react';
import { IMG_POSTER_URL } from '../services/api';

export default function MediaCard({ item, type, onClick, showRemoveButton, onRemove }) {
  const itemType = type || item.media_type || (item.title ? 'movie' : 'tv');
  const posterPath = item.poster_path;

  if (!posterPath) return null;

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(item);
    }
  };

  return (
    <div
      onClick={() => onClick(item.id, itemType)}
      className="poster-grid-wrapper relative cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-zinc-900 border border-zinc-800/10 group select-none"
    >
      <img
        src={`${IMG_POSTER_URL}${posterPath}`}
        alt={item.title || item.name}
        className="poster-grid w-full h-auto aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {/* Remove Button Overlay */}
      {showRemoveButton && (
        <button
          onClick={handleRemoveClick}
          className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center border border-zinc-700/60 opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Remover"
          aria-label="Remover item"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Title Hover Overlay */}
      <div className="poster-title-overlay absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <span className="text-white text-xs font-bold leading-tight line-clamp-2">
          {item.title || item.name}
        </span>
      </div>
    </div>
  );
}
