import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IMG_POSTER_URL } from '../services/api';

export default function MediaCarousel({ title, items, onClickItem }) {
  const containerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const handleScroll = () => {
    checkScroll();
  };

  const scroll = (direction) => {
    if (containerRef.current) {
      const firstItem = containerRef.current.querySelector('.poster-carousel-wrapper');
      const cardWidth = firstItem ? firstItem.offsetWidth + 12 : 212; // 12px de gap (gap-3)
      containerRef.current.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    }
  };

  const validItems = items.filter(item => item.poster_path);

  if (validItems.length === 0) {
    return null;
  }

  return (
    <div className="row-wrapper relative group/row select-none">
      <h2 className="text-xl md:text-2xl font-bold mb-1 text-zinc-100 pl-4 md:pl-16 tracking-wide">
        {title}
      </h2>

      <div className="carousel-wrapper-relative px-4 md:px-16">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll(-1)}
            className="carousel-arrow carousel-arrow-left absolute left-0 z-30 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white border-0 cursor-pointer h-full transition-opacity duration-300 opacity-0 group-hover/row:opacity-100"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="carousel-container py-3 flex gap-3 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth"
        >
          {validItems.map(item => {
            const itemType = item.media_type || (item.title ? 'movie' : 'tv');
            return (
              <div
                key={`${item.id}-${itemType}`}
                onClick={() => onClickItem(item.id, itemType)}
                className="poster-carousel-wrapper flex-shrink-0 cursor-pointer transition-transform duration-300 ease-out hover:scale-105 rounded-lg overflow-hidden shadow-md hover:shadow-xl hover:z-10 bg-zinc-900 border border-zinc-800/10"
              >
                <img
                  src={`${IMG_POSTER_URL}${item.poster_path}`}
                  alt={item.title || item.name}
                  className="poster-carousel w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Visual Title Overlay on Hover */}
                <div className="poster-title-overlay absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end text-center opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-white text-xs font-bold leading-tight line-clamp-2">
                    {item.title || item.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            onClick={() => scroll(1)}
            className="carousel-arrow carousel-arrow-right absolute right-0 z-30 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white border-0 cursor-pointer h-full transition-opacity duration-300 opacity-0 group-hover/row:opacity-100"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
