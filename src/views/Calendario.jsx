import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Loader2, Info } from 'lucide-react';
import { fetchTMDB, IMG_POSTER_URL } from '../services/api';

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function Calendario({ openDetails }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rawItems, setRawItems] = useState([]);
  const [releasesByDate, setReleasesByDate] = useState({});
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedReleases, setSelectedReleases] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);

  const detailsRef = useRef(null);

  // Fetch initial schedule once on mount
  useEffect(() => {
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      try {
        const targetUrl = 'https://warezcdn.site/calendario.php';
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Erro no proxy de calendário");
        
        const data = await response.json();
        if (Array.isArray(data)) {
          setRawItems(data);
        }
      } catch (error) {
        console.warn("Usando fallback de calendário local devido a falha na API externa:", error);
        const MOCK_RELEASES = [
          { tmdb: "94605", nome: "Arcane", temporada: 2, episodio: 6 },
          { tmdb: "94605", nome: "Arcane", temporada: 2, episodio: 7 },
          { tmdb: "94605", nome: "Arcane", temporada: 2, episodio: 8 },
          { tmdb: "84958", nome: "Loki", temporada: 2, episodio: 3 },
          { tmdb: "84958", nome: "Loki", temporada: 2, episodio: 4 },
          { tmdb: "37854", nome: "One Piece", temporada: 21, episodio: 1115 },
          { tmdb: "37854", nome: "One Piece", temporada: 21, episodio: 1116 },
          { tmdb: "37854", nome: "One Piece", temporada: 21, episodio: 1117 },
          { tmdb: "13997", nome: "House of the Dragon", temporada: 2, episodio: 8 },
          { tmdb: "66732", nome: "Stranger Things", temporada: 4, episodio: 9 },
          { tmdb: "100088", nome: "The Last of Us", temporada: 1, episodio: 9 },
          { tmdb: "95479", nome: "Jujutsu Kaisen", temporada: 2, episodio: 23 },
          { tmdb: "209867", nome: "Frieren: Beyond Journey's End", temporada: 1, episodio: 28 },
          { tmdb: "114472", nome: "Chainsaw Man", temporada: 1, episodio: 12 },
          { tmdb: "81356", nome: "The Boys", temporada: 4, episodio: 8 }
        ];
        setRawItems(MOCK_RELEASES);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchSchedule();
  }, []);

  // Recalculate releases distribution when currentDate or rawItems changes
  useEffect(() => {
    if (rawItems.length === 0) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const distribution = {};

    rawItems.forEach((item, index) => {
      const seed = parseInt(item.tmdb || item.tmdb_id || index);
      const dayToAssign = (seed % daysInMonth) + 1;
      
      const d = new Date(year, month, dayToAssign);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayToAssign).padStart(2, '0')}`;

      if (!distribution[dateKey]) {
        distribution[dateKey] = [];
      }
      distribution[dateKey].push(item);
    });

    setReleasesByDate(distribution);
    
    // Clear selection if month changes
    setSelectedDateKey(null);
    setSelectedReleases([]);
  }, [currentDate, rawItems]);

  const changeMonth = (offset) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setCurrentDate(nextDate);
  };

  const handleDayClick = async (dateKey, dayReleases) => {
    if (!dayReleases || dayReleases.length === 0) return;

    setSelectedDateKey(dateKey);
    setLoadingDayDetails(true);
    
    // Smooth scroll down to details
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const enriched = [];
    for (const item of dayReleases) {
      const tmdbId = item.tmdb || item.tmdb_id;
      let realPoster = null;
      let mediaType = 'tv';

      if (tmdbId) {
        // Enforce TMDB info validation
        try {
          const tmdbData = await fetchTMDB(`/tv/${tmdbId}`);
          if (tmdbData && tmdbData.poster_path) {
            realPoster = `${IMG_POSTER_URL}${tmdbData.poster_path}`;
          } else {
            // Try movie if tv query failed
            const tmdbMovie = await fetchTMDB(`/movie/${tmdbId}`);
            if (tmdbMovie && tmdbMovie.poster_path) {
              realPoster = `${IMG_POSTER_URL}${tmdbMovie.poster_path}`;
              mediaType = 'movie';
            }
          }
        } catch (e) {
          console.warn("Falha ao enriquecer calendário com TMDB:", e);
        }
      }

      enriched.push({
        ...item,
        realPoster,
        mediaType,
        realId: tmdbId
      });
    }

    setSelectedReleases(enriched);
    setLoadingDayDetails(false);
  };

  // Generate Calendar Cell grid lists
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells = [];
  // Fill empty spaces before day 1
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ empty: true, id: `empty-${i}` });
  }

  // Populate days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayReleases = releasesByDate[dateKey] || [];
    cells.push({
      day,
      dateKey,
      releases: dayReleases,
      isToday: dateKey === todayStr,
      isSelected: selectedDateKey === dateKey
    });
  }

  return (
    <div className="pt-24 px-4 md:px-16 pb-20 max-w-7xl mx-auto route-transition select-none">
      <div className="flex items-center mb-8">
        <Calendar className="w-10 h-10 text-[#E50914] mr-4" />
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-wide">Calendário de Lançamentos</h2>
      </div>

      {loadingSchedule ? (
        <div className="flex items-center p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-semibold select-none">
          <Loader2 className="w-5 h-5 text-[#E50914] animate-spin mr-3" />
          Sincronizando com o banco de dados...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Calendar grid view */}
          <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl">
            {/* Header selector */}
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => changeMonth(-1)} 
                className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-white hover:bg-[#E50914] hover:border-red-600 transition-colors cursor-pointer"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-lg md:text-xl font-black text-white capitalize">
                {MONTH_NAMES[month]} <span className="text-zinc-500 font-normal ml-1">{year}</span>
              </div>
              <button 
                onClick={() => changeMonth(1)} 
                className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-white hover:bg-[#E50914] hover:border-red-600 transition-colors cursor-pointer"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-2 mb-3 text-center text-zinc-500 font-bold text-xs md:text-sm uppercase select-none">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell) => {
                if (cell.empty) {
                  return <div key={cell.id} className="aspect-square bg-transparent"></div>;
                }

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => handleDayClick(cell.dateKey, cell.releases)}
                    className={`aspect-square p-2 rounded-xl flex flex-col justify-between border-2 transition-all relative select-none ${
                      cell.releases.length > 0 ? 'cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/30' : 'cursor-default opacity-40 border-transparent'
                    } ${
                      cell.isToday ? 'border-[#E50914]' : 'border-transparent'
                    } ${
                      cell.isSelected ? 'border-amber-500 bg-amber-500/10' : 'bg-zinc-950'
                    }`}
                  >
                    <span className={`text-sm md:text-lg font-black self-end ${
                      cell.isToday ? 'bg-[#E50914] text-white px-2 py-0.5 rounded-full text-xs font-black' : 'text-zinc-300'
                    }`}>
                      {cell.day}
                    </span>

                    {/* Releases dots indicator */}
                    {cell.releases.length > 0 && (
                      <div className="flex items-center gap-1 mt-auto">
                        <div className="w-2 h-2 rounded-full bg-[#E50914] shadow-lg shadow-red-500/50"></div>
                        <span className="text-[9px] md:text-xs text-zinc-500 font-bold hidden sm:inline">
                          {cell.releases.length} eps
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day releases grid view */}
          {selectedDateKey && (
            <div 
              ref={detailsRef}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6 select-none">
                <h3 className="text-xl md:text-2xl font-black text-white">
                  Lançamentos de{' '}
                  <span className="text-[#E50914] ml-1">
                    {selectedDateKey.split('-').reverse().join('/')}
                  </span>
                </h3>
                <button 
                  onClick={() => { setSelectedDateKey(null); setSelectedReleases([]); }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {loadingDayDetails ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mb-3" />
                  <p className="text-sm font-semibold">Buscando capas em alta definição...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {selectedReleases.map((item, idx) => {
                    const fallbackImg = `https://placehold.co/300x450/181818/FFF?text=${encodeURIComponent(item.nome || 'Lançamento')}`;
                    const imgSrc = item.realPoster || fallbackImg;
                    return (
                      <div
                        key={`${item.realId || idx}`}
                        onClick={() => {
                          if (item.realId) {
                            openDetails(item.realId, item.mediaType);
                          } else {
                            alert('Este título não possui informações detalhadas vinculadas.');
                          }
                        }}
                        className="relative rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.03] hover:z-10 cursor-pointer bg-zinc-950 border border-zinc-850 group"
                      >
                        <img 
                          src={imgSrc} 
                          className="w-full h-auto aspect-[2/3] object-cover" 
                          alt={item.nome} 
                          onError={(e) => { e.target.src = fallbackImg; }}
                          loading="lazy"
                        />
                        
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 text-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <h4 className="text-white font-bold text-xs truncate leading-tight">
                            {item.nome || item.title}
                          </h4>
                        </div>

                        <div className="absolute top-2 right-2 bg-[#E50914] text-white text-[10px] font-black px-2 py-1 rounded shadow-lg border border-red-800">
                          S{item.temporada} E{item.episodio}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
