import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import MediaCarousel from '../components/MediaCarousel';
import { fetchTMDB } from '../services/api';
import { categories } from '../services/config';
import * as Storage from '../services/storageService';

export default function Home({ onSelectMedia }) {
  const [heroItem, setHeroItem] = useState(null);
  const [rowsData, setRowsData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      try {
        // Fetch Hero item (from trending)
        const trending = await fetchTMDB('/trending/all/day');
        if (trending && trending.results?.length > 0) {
          const playable = trending.results.filter(item => item.backdrop_path && item.overview);
          if (playable.length > 0) {
            // Select a random featured item
            const randomItem = playable[Math.floor(Math.random() * playable.length)];
            setHeroItem(randomItem);
          } else {
            setHeroItem(trending.results[0]);
          }
        }

        // Fetch categories rows
        const fetchedRows = {};
        
        // Load "Últimos Assistidos" locally
        fetchedRows["Últimos Assistidos"] = Storage.getWatchedHistory();

        // Query TMDB APIs in parallel for each row
        const apiCategories = categories.default.filter(cat => cat.endpoint !== 'localstorage');
        const promises = apiCategories.map(cat => fetchTMDB(cat.endpoint));
        const results = await Promise.all(promises);

        apiCategories.forEach((cat, index) => {
          fetchedRows[cat.title] = results[index]?.results || [];
        });

        setRowsData(fetchedRows);
      } catch (error) {
        console.error("Erro ao carregar dados da Home:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="route-transition select-none">
      {/* Cinematic Hero Highlight */}
      <Hero 
        item={heroItem} 
        onPlay={(id, type, data) => onSelectMedia(id, type, 'play', data)}
        onInfo={(id, type) => onSelectMedia(id, type, 'info')}
      />

      {/* Carousels Rows container */}
      <div className="-mt-20 md:-mt-24 relative z-20 pb-20 space-y-6 md:space-y-8">
        
        {/* Render "Top 10 no Brasil Hoje" first */}
        <MediaCarousel
          title="Top 10 no Brasil Hoje"
          isTop10={true}
          items={rowsData["Em Alta Hoje"] || []}
          onClickItem={(id, type) => onSelectMedia(id, type, 'info')}
        />

        {/* Render "Últimos Assistidos" second if has items */}
        {rowsData["Últimos Assistidos"] && rowsData["Últimos Assistidos"].length > 0 && (
          <MediaCarousel
            title="Últimos Assistidos"
            items={rowsData["Últimos Assistidos"]}
            onClickItem={(id, type) => onSelectMedia(id, type, 'info')}
          />
        )}

        {/* Map other rows */}
        {categories.default
          .filter(cat => cat.title !== "Últimos Assistidos" && cat.title !== "Em Alta Hoje")
          .map(cat => (
            <MediaCarousel
              key={cat.title}
              title={cat.title}
              items={rowsData[cat.title] || []}
              onClickItem={(id, type) => onSelectMedia(id, type, 'info')}
            />
          ))}
      </div>
    </div>
  );
}
