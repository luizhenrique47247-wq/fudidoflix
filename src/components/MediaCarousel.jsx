import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NetflixHoverCard from './NetflixHoverCard';

export default function MediaCarousel({ title, items, onClickItem, isTop10 }) {
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
      const firstItem = containerRef.current.querySelector('.carousel-card-item');
      const cardWidth = firstItem ? firstItem.offsetWidth + 24 : 212; // 24px de gap
      containerRef.current.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    }
  };

  let validItems = items.filter(item => item.poster_path);
  if (isTop10) {
    validItems = validItems.slice(0, 10);
  }

  if (validItems.length === 0) {
    return null;
  }

  return (
    <div className="row-wrapper relative group/row select-none hover:z-40">
      <h2 className="text-xl md:text-2xl font-black mb-1 text-zinc-100 pl-4 md:pl-16 tracking-wide flex items-center gap-2">
        {title}
      </h2>

      <div className="carousel-wrapper-relative">
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
          className="carousel-container py-10 -my-7 px-4 md:px-16 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {validItems.map((item, index) => {
            const itemType = item.media_type || (item.title ? 'movie' : 'tv');
            
            if (isTop10) {
              const rank = index + 1;
              const isTen = rank === 10;
              const isOne = rank === 1;

              const viewBox = isOne ? "0 0 110 160" : "0 0 125 160";
              const svgWidthClass = isOne ? "w-24 sm:w-32 lg:w-38" : "w-28 sm:w-36 lg:w-44";
              const posterOverlapClass = isOne ? "-ml-14 sm:-ml-18 lg:-ml-22" : "-ml-16 sm:-ml-22 lg:-ml-26";

              return (
                <div key={`${item.id}-${itemType}`} className="flex items-end flex-shrink-0">
                  {/* Netflix 3D Number SVG */}
                  <svg 
                    className={`${svgWidthClass} h-[240px] sm:h-[270px] lg:h-[300px] flex-shrink-0 select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.98)] z-0`} 
                    viewBox={viewBox}
                  >
                    <defs>
                      <linearGradient id={`top10Grad-${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#a1a1aa" />
                        <stop offset="60%" stopColor="#71717a" />
                        <stop offset="100%" stopColor="#3f3f46" />
                      </linearGradient>
                    </defs>
                    <g transform={isTen ? "translate(-32, 0)" : undefined}>
                      <text
                        y="96%"
                        fontSize="175"
                        fontWeight="900"
                        fontFamily="'Arial Black', 'Impact', sans-serif"
                        fill="#09090b"
                        stroke={`url(#top10Grad-${rank})`}
                        strokeWidth="4.5"
                        strokeLinejoin="round"
                        transform="skewX(-6)"
                      >
                        {isTen ? (
                          <>
                            <tspan x="0">1</tspan>
                            <tspan x="64">0</tspan>
                          </>
                        ) : (
                          <tspan x={isOne ? "32%" : "42%"} textAnchor="middle">
                            {rank}
                          </tspan>
                        )}
                      </text>
                    </g>
                  </svg>

                  <div className={`carousel-card-item flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px] ${posterOverlapClass} z-10`}>
                    <NetflixHoverCard 
                      item={item}
                      type={itemType}
                      onClickItem={onClickItem}
                      isFirst={index === 0}
                      isLast={index === validItems.length - 1}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${item.id}-${itemType}`}
                className="carousel-card-item flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px]"
              >
                <NetflixHoverCard 
                  item={item}
                  type={itemType}
                  onClickItem={onClickItem}
                  isFirst={index === 0}
                  isLast={index === validItems.length - 1}
                />
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
