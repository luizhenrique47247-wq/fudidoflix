import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import MediaCarousel from '../components/MediaCarousel';
import Browse from './Browse';
import { fetchTMDB } from '../services/api';
import { categories } from '../services/config';
import { LayoutGrid, Layers, Loader2 } from 'lucide-react';

export default function CategoryPage({ type, title, onSelectMedia }) {
  const [heroItem, setHeroItem] = useState(null);
  const [rowsData, setRowsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('carousels'); // 'carousels' or 'grid'

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setHeroItem(null);
      setRowsData({});

      const categoryList = categories[type] || categories.default;
      const typeForEndpoint = type === 'anime' ? 'tv' : type;

      try {
        // Fetch Hero item for this type
        let heroEndpoint = `/trending/${typeForEndpoint}/day`;
        if (type === 'anime') {
          heroEndpoint = `/discover/tv?with_genres=16&with_keywords=210024&sort_by=popularity.desc`;
        }

        const heroData = await fetchTMDB(heroEndpoint);
        if (heroData && heroData.results?.length > 0) {
          const playable = heroData.results.filter(item => item.backdrop_path && item.overview);
          const chosen = playable.length > 0 ? playable[Math.floor(Math.random() * playable.length)] : heroData.results[0];
          setHeroItem(chosen);
        }

        // Fetch all category rows in parallel
        const fetchedRows = {};
        const promises = categoryList.map(cat => fetchTMDB(cat.endpoint));
        const results = await Promise.all(promises);

        categoryList.forEach((cat, idx) => {
          if (results[idx] && results[idx].results) {
            fetchedRows[cat.title] = results[idx].results;
          } else {
            fetchedRows[cat.title] = [];
          }
        });

        setRowsData(fetchedRows);
      } catch (error) {
        console.error(`Erro ao carregar dados da página ${title}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type, title]);

  const categoryList = categories[type] || categories.default;

  return (
    <div className="route-transition select-none min-h-screen relative">
      {/* Clean Category Title Header (Top Left aligned with FUDIDO FLIX logo) */}
      <div className="absolute top-20 left-4 md:left-16 z-30 flex items-center space-x-3 select-none pointer-events-none">
        <div className="w-1.5 h-6 md:h-8 bg-[#E50914] rounded-full shadow-[0_0_14px_#E50914]"></div>
        <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-lg">
          {title}
        </h1>
      </div>

      {/* Discreet Mode Switcher (Top Right) */}
      <div className="fixed top-20 right-4 md:right-12 z-40 flex items-center bg-zinc-950/80 backdrop-blur-md p-1 rounded-full border border-zinc-800/80 shadow-2xl">
        <button
          onClick={() => setViewMode('carousels')}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
            viewMode === 'carousels'
              ? 'bg-[#E50914] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Ver Carrosséis Estilo Netflix"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Carrosséis</span>
        </button>

        <button
          onClick={() => setViewMode('grid')}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-[#E50914] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Ver Catálogo em Grid com Filtros"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Grid & Filtros</span>
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className="pt-20">
          <Browse 
            type={type}
            title={title}
            onSelectMedia={onSelectMedia}
          />
        </div>
      ) : (
        <>
          {/* Cinematic Hero Highlight */}
          <Hero 
            item={heroItem} 
            onPlay={(id, mediaType, data) => onSelectMedia(id, mediaType || type, 'play', data)}
            onInfo={(id, mediaType) => onSelectMedia(id, mediaType || type, 'info')}
          />

          {/* Carousels Container */}
          <div className="-mt-20 md:-mt-24 relative z-20 pb-20 space-y-6 md:space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-3">
                <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
                <p className="text-zinc-400 font-medium text-sm">Carregando catálogo de {title}...</p>
              </div>
            ) : (
              categoryList.map(cat => {
                const items = rowsData[cat.title] || [];
                if (items.length === 0) return null;

                return (
                  <MediaCarousel
                    key={cat.title}
                    title={cat.title}
                    isTop10={cat.isTop10 || false}
                    items={items}
                    type={type === 'anime' ? 'tv' : type}
                    onClickItem={(id, mediaType) => onSelectMedia(id, mediaType || type, 'info')}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
