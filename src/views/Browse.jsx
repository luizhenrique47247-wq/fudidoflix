import React, { useState, useEffect, useRef } from 'react';
import MediaCard from '../components/MediaCard';
import { fetchTMDB } from '../services/api';
import { movieFilters, tvFilters, sortByOptions } from '../services/config';
import { Loader2 } from 'lucide-react';

export default function Browse({ type, title, onSelectMedia, initialGenre }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filter States
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [genre, setGenre] = useState(initialGenre || '');
  const [provider, setProvider] = useState('');
  const [company, setCompany] = useState('');
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('');
  const [era, setEra] = useState('');
  const [eraType, setEraType] = useState('');

  const scrollRef = useRef(null);

  // Reset page and list on filter changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setGenre(initialGenre || '');
  }, [type, sortBy, initialGenre, provider, company, keyword, country, era, eraType]);

  // Load items on page or filter changes
  useEffect(() => {
    const fetchGridData = async () => {
      if (loading || !hasMore) return;
      setLoading(true);

      const typeForEndpoint = type === 'anime' ? 'tv' : type;
      let actualGenre = genre;
      if (type === 'anime') {
        actualGenre = '16&with_keywords=210024'; // Animation + Anime keyword
      }

      let endpoint = `/discover/${typeForEndpoint}?`;
      endpoint += `&sort_by=${sortBy}`;
      endpoint += `&page=${page}`;
      if (actualGenre) endpoint += `&with_genres=${actualGenre}`;
      if (provider) endpoint += `&with_watch_providers=${provider}&watch_region=BR`;
      if (company) endpoint += `&with_companies=${company}`;
      if (keyword) endpoint += `&with_keywords=${keyword}`;
      if (country) endpoint += `&with_origin_country=${country}`;
      if (era) {
        const eraFilter = eraType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
        endpoint += `&${eraFilter}=${era}`;
      }
      endpoint += '&vote_count.gte=50';

      try {
        const data = await fetchTMDB(endpoint);
        if (data && data.results) {
          const validResults = data.results.filter(item => item.poster_path);
          if (validResults.length === 0) {
            setHasMore(false);
          } else {
            setItems(prev => {
              // De-duplicate items by id
              const map = new Map();
              [...prev, ...validResults].forEach(item => map.set(item.id, item));
              return Array.from(map.values());
            });
            if (data.page >= data.total_pages) {
              setHasMore(false);
            }
          }
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Erro ao buscar itens do grid:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGridData();
  }, [type, page, sortBy, genre, provider, company, keyword, country, era, eraType]);

  // Infinite Scroll event handler
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 500;
      if (isNearBottom) {
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  // Handle filter selector changes
  const handleFilterChange = (e) => {
    const option = e.target.options[e.target.selectedIndex];
    const filterType = option.dataset.type;
    const filterValue = option.dataset.value;

    // Reset filters
    setGenre('');
    setProvider('');
    setCompany('');
    setKeyword('');
    setCountry('');
    setEra('');
    setEraType('');

    if (filterType === 'genre') setGenre(filterValue);
    else if (filterType === 'provider') setProvider(filterValue);
    else if (filterType === 'company') setCompany(filterValue);
    else if (filterType === 'keyword') setKeyword(filterValue);
    else if (filterType === 'country') setCountry(filterValue);
    else if (filterType === 'era_movie') { setEra(filterValue); setEraType('movie'); }
    else if (filterType === 'era_tv') { setEra(filterValue); setEraType('tv'); }
  };

  const filters = type === 'movie' ? movieFilters : tvFilters;
  const sortOptions = type === 'movie' ? sortByOptions.movie : sortByOptions.tv;

  return (
    <div className="pt-18 px-4 md:px-16 pb-20 route-transition">
      {/* Header and Filter Bars */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 select-none">
        <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>

        <div className="flex flex-wrap gap-3">
          {type !== 'anime' && (
            <select
              onChange={handleFilterChange}
              className="bg-zinc-900 text-white text-sm font-bold py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-[#E50914] cursor-pointer shadow-md"
            >
              {filters.map((filter, index) => {
                if (filter.type === 'divider') {
                  return <option key={`div-${index}`} disabled>──────────</option>;
                }
                return (
                  <option
                    key={filter.name}
                    value={filter.name}
                    data-type={filter.type}
                    data-value={filter.value}
                    className={filter.style === 'award' ? 'text-amber-500 font-bold' : ''}
                  >
                    {filter.name}
                  </option>
                );
              })}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-zinc-900 text-white text-sm font-bold py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-[#E50914] cursor-pointer shadow-md"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid items */}
      {items.length === 0 && !loading ? (
        <div className="text-center py-20 text-zinc-500 font-medium">
          Nenhum resultado encontrado para estes filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map(item => (
            <MediaCard
              key={`${item.id}-${type}`}
              item={item}
              type={type}
              onClick={onSelectMedia}
            />
          ))}
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mr-2" />
          <span className="text-zinc-500 text-sm font-semibold">Carregando mais capas...</span>
        </div>
      )}
    </div>
  );
}
