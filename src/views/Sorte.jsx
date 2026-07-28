import React, { useState, useEffect, useRef } from 'react';
import { Dices, Disc, Compass, X, Search, Play, Plus, Loader2, Star, Eye } from 'lucide-react';
import { fetchTMDB, IMG_POSTER_URL } from '../services/api';

const STUDIO_LIST = [
  { id: 41077, name: 'A24', logo_path: '/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png' },
  { id: 10342, name: 'Studio Ghibli', logo_path: '/uFuxPEZRUcBTEiYIxjHJq62Vr77.png' },
  { id: 3, name: 'Pixar', logo_path: '/1TjvGVDMYsj6JBxOAkUHpPEwLf7.png' },
  { id: 420, name: 'Marvel Studios', logo_path: '/hUzeosd33nzE5MCNsZxCGEKTXaQ.png' },
  { id: 174, name: 'Warner Bros. Pictures', logo_path: '/IuAlhI9eVC9Z8UQWOIDdWRKSEJ.png' },
  { id: 33, name: 'Universal Pictures', logo_path: '/8lvHyhjr8oUKOOy2dKXoALWKdp0.png' },
  { id: 521, name: 'DreamWorks Animation', logo_path: '/3BPX5VGBov8SDqTV7wC1L1xShAS.png' },
  { id: 2, name: 'Walt Disney Pictures', logo_path: '/6SeZO9r3RpIGezMELFj8iiz3UEG.png' },
  { id: 128064, name: 'DC Films', logo_path: '/eOL4PkiC0zkDpxKFQhBnmCtwx5p.png' },
  { id: 34, name: 'Sony Pictures', logo_path: '/GagSvqWlyPdkGPwaKkBN2iN9lBL.png' }
];

export default function Sorte({ openDetails, openPlayer }) {
  const [activeModal, setActiveModal] = useState(''); // 'surprise', 'roulette', 'discover', ''
  
  // Surprise Me States
  const [surpriseType, setSurpriseType] = useState('movie');
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  // Roulette Wheel States
  const [rouletteItems, setRouletteItems] = useState([]);
  const [rouletteSearchQuery, setRouletteSearchQuery] = useState('');
  const [rouletteSearchResults, setRouletteSearchResults] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteRotation, setRouletteRotation] = useState(0);
  const [rouletteWinner, setRouletteWinner] = useState(null);
  
  const canvasRef = useRef(null);
  const spinDuration = 8000; // 8 seconds spin
  const colors = ['#E50914', '#B20710', '#831010', '#540808'];

  // Discover States
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState('');
  const [popularActors, setPopularActors] = useState([]);
  const [loadingActors, setLoadingActors] = useState(false);
  const [activeStudioId, setActiveStudioId] = useState(null);
  const [activeStudioName, setActiveStudioName] = useState('');
  const [studioResults, setStudioResults] = useState([]);
  const [loadingStudioResults, setLoadingStudioResults] = useState(false);

  // Load popular actors on mount for discover modal
  useEffect(() => {
    if (activeModal !== 'discover') return;
    const loadActors = async () => {
      setLoadingActors(true);
      try {
        const data = await fetchTMDB('/person/popular');
        if (data && data.results) {
          setPopularActors(data.results.slice(0, 10));
        }
      } catch (e) {
        console.error("Erro ao carregar atores populares:", e);
      } finally {
        setLoadingActors(false);
      }
    };
    loadActors();
  }, [activeModal]);

  // Load saved roulette items
  useEffect(() => {
    if (activeModal !== 'roulette') return;
    const saved = JSON.parse(localStorage.getItem('fudidoFlixRoleta') || '[]');
    setRouletteItems(saved);
  }, [activeModal]);

  // Redraw Roulette Wheel whenever items change or rotate
  useEffect(() => {
    if (activeModal !== 'roulette' || !canvasRef.current) return;
    drawWheel();
  }, [rouletteItems, activeModal]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const n = rouletteItems.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 3;

    if (n < 1) {
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(200, 200, 190, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      return;
    }

    const arcSize = (2 * Math.PI) / n;
    const radius = 190;
    const center = 200;

    for (let i = 0; i < n; i++) {
      const item = rouletteItems[i];
      const angle = (i * arcSize) - (Math.PI / 2);

      ctx.beginPath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + arcSize);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px Inter, sans-serif';
      
      let title = item.title;
      if (title.length > 18) {
        title = title.substring(0, 15) + '...';
      }
      
      ctx.fillText(title, radius - 15, 5);
      ctx.restore();
    }
  };

  // ==========================================================
  // SURPREENDA-ME LÓGICA
  // ==========================================================
  const triggerSurprise = async () => {
    setSurpriseLoading(true);
    try {
      const genresList = await fetchTMDB(`/genre/${surpriseType}/list`);
      if (genresList && genresList.genres) {
        const randomGenre = genresList.genres[Math.floor(Math.random() * genresList.genres.length)];
        const data = await fetchTMDB(`/discover/${surpriseType}?with_genres=${randomGenre.id}&page=${Math.floor(Math.random() * 4) + 1}`);
        
        if (data && data.results?.length > 0) {
          const playable = data.results.filter(item => item.poster_path);
          if (playable.length > 0) {
            const chosen = playable[Math.floor(Math.random() * playable.length)];
            setActiveModal('');
            openDetails(chosen.id, surpriseType);
            return;
          }
        }
      }
      alert("Não foi possível sortear um título. Tente novamente.");
    } catch (e) {
      console.error("Erro no sorteio Surpreenda-me:", e);
    } finally {
      setSurpriseLoading(false);
    }
  };

  // ==========================================================
  // ROLETA LÓGICA
  // ==========================================================
  const handleRouletteSearch = async (e) => {
    const query = e.target.value;
    setRouletteSearchQuery(query);

    if (query.length < 3) {
      setRouletteSearchResults([]);
      return;
    }

    try {
      const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
      if (data && data.results) {
        const valid = data.results
          .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
          .slice(0, 5);
        setRouletteSearchResults(valid);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addItemToRoulette = (item) => {
    if (rouletteItems.some(i => i.id === item.id)) return;
    const updated = [...rouletteItems, item];
    setRouletteItems(updated);
    localStorage.setItem('fudidoFlixRoleta', JSON.stringify(updated));
    setRouletteSearchQuery('');
    setRouletteSearchResults([]);
  };

  const removeItemFromRoulette = (id) => {
    const updated = rouletteItems.filter(item => item.id !== id);
    setRouletteItems(updated);
    localStorage.setItem('fudidoFlixRoleta', JSON.stringify(updated));
  };

  const spinWheel = () => {
    if (isSpinning || rouletteItems.length < 2) return;
    setIsSpinning(true);
    setRouletteWinner(null);

    const n = rouletteItems.length;
    const segmentDegrees = 360 / n;
    const baseSpins = 5 * 360; 
    const randomSegmentOffset = Math.random() * segmentDegrees;
    const stopAngle = (Math.floor(Math.random() * n) * segmentDegrees) + (segmentDegrees / 2) + randomSegmentOffset;
    
    const totalRotation = baseSpins - stopAngle;
    const targetRotation = rouletteRotation + totalRotation;
    setRouletteRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      
      const finalAngle = (targetRotation % 360 + 360) % 360;
      const winningAngle = (360 - finalAngle) % 360;
      const winningIndex = Math.floor(winningAngle / segmentDegrees);
      
      if (winningIndex >= 0 && winningIndex < rouletteItems.length) {
        setRouletteWinner(rouletteItems[winningIndex]);
      }
    }, spinDuration);
  };

  // ==========================================================
  // DESCOBRIR LÓGICA (ESTÚDIOS)
  // ==========================================================
  const handleSelectStudio = async (studio) => {
    setActiveStudioId(studio.id);
    setActiveStudioName(studio.name);
    setLoadingStudioResults(true);
    try {
      const data = await fetchTMDB(`/discover/movie?with_companies=${studio.id}&sort_by=popularity.desc`);
      if (data && data.results) {
        setStudioResults(data.results.filter(item => item.poster_path));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudioResults(false);
    }
  };

  return (
    <div className="pt-24 px-4 md:px-16 pb-20 route-transition select-none">
      <h2 className="text-3xl font-black mb-8 text-white tracking-wide">Sorte</h2>

      {/* 3 Main Roulette / Surprise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Surpreenda-me */}
        <div 
          onClick={() => setActiveModal('surprise')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-zinc-850 hover:border-zinc-700 hover:shadow-2xl transition-all cursor-pointer min-h-[250px] group"
        >
          <div className="p-4 bg-red-500/10 rounded-full mb-4 text-[#E50914] group-hover:scale-110 transition-transform">
            <Dices className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-zinc-100">Surpreenda-me</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Não sabe o que assistir? Deixe o acaso escolher um título aleatório para você.
          </p>
        </div>

        {/* Card 2: Roleta */}
        <div 
          onClick={() => setActiveModal('roulette')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-zinc-850 hover:border-zinc-700 hover:shadow-2xl transition-all cursor-pointer min-h-[250px] group"
        >
          <div className="p-4 bg-red-500/10 rounded-full mb-4 text-[#E50914] group-hover:scale-110 transition-transform">
            <Disc className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-zinc-100">Roleta</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Monte uma roleta personalizada e gire o tambor para decidir o filme da noite.
          </p>
        </div>

        {/* Card 3: Descobrir */}
        <div 
          onClick={() => setActiveModal('discover')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-zinc-850 hover:border-zinc-700 hover:shadow-2xl transition-all cursor-pointer min-h-[250px] group"
        >
          <div className="p-4 bg-red-500/10 rounded-full mb-4 text-[#E50914] group-hover:scale-110 transition-transform">
            <Compass className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-zinc-100">Descobrir</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Explore catálogos filtrados pelos maiores estúdios cinematográficos.
          </p>
        </div>
      </div>

      {/* ==========================================================
          A. SURPRISE MODAL
          ========================================================== */}
      {activeModal === 'surprise' && (
        <div className="fixed inset-0 z-[120] details-modal-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setActiveModal('')}></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md z-10 animate-scale-up select-none">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Dices className="w-6 h-6 text-[#E50914]" /> Surpreenda-me
              </h3>
              <button onClick={() => setActiveModal('')} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-zinc-400 text-sm leading-relaxed">
                Escolha se você prefere sortear um Filme ou uma Série de TV:
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setSurpriseType('movie')}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    surpriseType === 'movie'
                      ? 'bg-white border-white text-black font-extrabold shadow-lg scale-105'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  Filme
                </button>
                <button
                  onClick={() => setSurpriseType('tv')}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    surpriseType === 'tv'
                      ? 'bg-white border-white text-black font-extrabold shadow-lg scale-105'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  Série
                </button>
              </div>

              <button
                onClick={triggerSurprise}
                disabled={surpriseLoading}
                className="w-full bg-[#E50914] hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/10 cursor-pointer flex items-center justify-center gap-2"
              >
                {surpriseLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando na cartola...
                  </>
                ) : (
                  'Girar a Sorte'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          B. ROULETTE MODAL
          ========================================================== */}
      {activeModal === 'roulette' && (
        <div className="fixed inset-0 z-[120] details-modal-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => !isSpinning && setActiveModal('')}></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl z-10 flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-scale-up select-none">
            
            {/* Left side: Setup and search */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Disc className="w-6 h-6 text-[#E50914]" /> Configurar Roleta
                </h3>
                <button 
                  onClick={() => !isSpinning && setActiveModal('')} 
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer md:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search bar adding items */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Pesquisar filme/série para adicionar..."
                  value={rouletteSearchQuery}
                  onChange={handleRouletteSearch}
                  disabled={isSpinning}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-[#E50914] placeholder-zinc-500"
                />

                {/* Instant search dropdown */}
                {rouletteSearchResults.length > 0 && (
                  <div className="absolute top-11 inset-x-0 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-20 divide-y divide-zinc-900">
                    {rouletteSearchResults.map(item => (
                      <div
                        key={item.id}
                        onMouseDown={() => addItemToRoulette({
                          id: item.id,
                          title: item.title || item.name,
                          poster_path: item.poster_path,
                          media_type: item.media_type
                        })}
                        className="flex items-center p-3 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                      >
                        <img 
                          src={`${IMG_POSTER_URL}${item.poster_path}`} 
                          alt="" 
                          className="w-8 h-12 object-cover rounded mr-3 border border-zinc-800"
                        />
                        <span className="text-sm font-bold text-zinc-200">{item.title || item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current added items list */}
              <div className="flex-1 overflow-y-auto max-h-[300px] md:max-h-[350px] scrollbar-none pr-1">
                <ul className="space-y-1.5">
                  {rouletteItems.length === 0 ? (
                    <li className="text-zinc-500 text-center p-6 border-2 border-dashed border-zinc-800 rounded-xl text-sm font-medium">
                      Adicione 2 ou mais títulos para iniciar.
                    </li>
                  ) : (
                    rouletteItems.map(item => (
                      <li key={item.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                        <span className="text-sm text-zinc-300 font-bold truncate pr-3">{item.title}</span>
                        <button
                          onClick={() => removeItemFromRoulette(item.id)}
                          disabled={isSpinning}
                          className="text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* Right side: Wheel rendering */}
            <div className="flex-1 p-6 md:p-8 bg-zinc-950/20 flex flex-col items-center justify-center relative">
              <button 
                onClick={() => !isSpinning && setActiveModal('')} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer hidden md:block"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative w-80 h-80 max-w-full max-h-full">
                {/* Pointer indicator */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-x-[16px] border-x-transparent border-t-[24px] border-t-white filter drop-shadow-md"></div>
                
                {/* Rotation Wheel Canvas */}
                <canvas
                  ref={canvasRef}
                  width="400"
                  height="400"
                  style={{
                    transform: `rotate(${rouletteRotation}deg)`,
                    transition: isSpinning ? `transform ${spinDuration / 1000}s cubic-bezier(0.22, 1, 0.36, 1)` : 'none'
                  }}
                  className="w-full h-full"
                />

                {/* Central trigger button */}
                <button
                  onClick={spinWheel}
                  disabled={isSpinning || rouletteItems.length < 2}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white text-[#E50914] border-4 border-[#E50914] font-black text-xs uppercase cursor-pointer flex items-center justify-center hover:scale-105 transition-transform disabled:bg-zinc-800 disabled:border-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed select-none shadow-2xl"
                >
                  Girar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roulette Winner Result Modal */}
      {rouletteWinner && (
        <div className="fixed inset-0 z-[160] details-modal-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setRouletteWinner(null)}></div>
          <div className="bg-[#181818] border border-zinc-850 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md z-10 animate-scale-up select-none flex flex-col items-center">
            <h4 className="text-xl font-black text-white mb-6 tracking-wide">🏆 Título Escolhido!</h4>
            
            <img 
              src={`${IMG_POSTER_URL}${rouletteWinner.poster_path}`} 
              alt={rouletteWinner.title}
              className="w-48 h-72 object-cover rounded-xl shadow-2xl border border-zinc-800 mb-6"
            />
            
            <h5 className="text-xl font-bold text-center text-white mb-6 px-4 truncate w-full">
              {rouletteWinner.title}
            </h5>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setRouletteWinner(null);
                  setActiveModal('');
                  openDetails(rouletteWinner.id, rouletteWinner.media_type);
                }}
                className="flex-1 py-3 bg-white text-black font-extrabold rounded-xl hover:bg-zinc-200 transition-colors text-sm cursor-pointer"
              >
                Ficha Completa
              </button>
              <button
                onClick={() => {
                  setRouletteWinner(null);
                  setActiveModal('');
                  openPlayer(rouletteWinner.id, rouletteWinner.media_type);
                }}
                className="flex-1 py-3 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-xl transition-colors text-sm cursor-pointer shadow-lg shadow-red-500/10"
              >
                Assistir Já
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          C. DISCOVER MODAL
          ========================================================== */}
      {activeModal === 'discover' && (
        <div className="fixed inset-0 z-[120] details-modal-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setActiveModal('')}></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl z-10 flex flex-col overflow-hidden max-h-[90vh] animate-scale-up select-none">
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#E50914]" /> Descobrir
              </h3>
              <button onClick={() => setActiveModal('')} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 overflow-y-auto space-y-8 pr-2">
              
              {/* Studio Discovery cards */}
              <div>
                <h4 className="text-lg font-bold text-zinc-100 mb-4 pl-1 border-l-4 border-[#E50914]">
                  Estúdios Populares (Em Destaque)
                </h4>
                
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                  {STUDIO_LIST.map(studio => (
                    <div
                      key={studio.id}
                      onClick={() => handleSelectStudio(studio)}
                      className={`flex-shrink-0 w-44 rounded-xl border p-1 bg-zinc-950 transition-all cursor-pointer ${
                        activeStudioId === studio.id 
                          ? 'border-amber-500 shadow-xl shadow-amber-500/5' 
                          : 'border-zinc-800 hover:scale-[1.03] hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-full h-24 bg-white p-3 rounded-lg flex items-center justify-center">
                        <img 
                          src={`https://image.tmdb.org/t/p/w300${studio.logo_path}`} 
                          alt={studio.name} 
                          className="w-full h-full object-contain filter"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="block text-center py-2.5 text-xs font-bold text-zinc-300 truncate">
                        {studio.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Actors */}
              <div>
                <h4 className="text-lg font-bold text-zinc-100 mb-4 pl-1 border-l-4 border-[#E50914]">
                  Atores Populares
                </h4>

                {loadingActors ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-[#E50914] animate-spin mr-2" />
                    <span className="text-zinc-500 text-sm font-semibold">Carregando atores...</span>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                    {popularActors.map(actor => (
                      <div
                        key={actor.id}
                        onClick={() => {
                          setActiveModal('');
                          // Actor details logic
                          // We pass the actor id/name to the search results page or filmography list
                          alert(`Filmografia de ${actor.name} será carregada.`);
                        }}
                        className="flex-shrink-0 w-32 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-700 hover:scale-[1.03] overflow-hidden transition-all cursor-pointer"
                      >
                        <img 
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                          alt={actor.name} 
                          className="w-full h-36 object-cover bg-zinc-800"
                        />
                        <span className="block text-center p-2 text-xs font-bold text-zinc-300 truncate">
                          {actor.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Studio search results display */}
              {activeStudioId && (
                <div className="border-t border-zinc-800/80 pt-6 animate-fade-in">
                  <h4 className="text-lg font-bold text-zinc-100 mb-6 pl-1 border-l-4 border-amber-500 flex justify-between items-center">
                    <span>Produções de <strong className="text-amber-500">{activeStudioName}</strong></span>
                    <button 
                      onClick={() => { setActiveStudioId(null); setStudioResults([]); }} 
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Limpar
                    </button>
                  </h4>

                  {loadingStudioResults ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mr-2" />
                      <span className="text-zinc-500 text-sm">Buscando catálogos...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {studioResults.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveModal('');
                            openDetails(item.id, 'movie');
                          }}
                          className="relative rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.03] hover:z-10 cursor-pointer bg-zinc-950 border border-zinc-850 group"
                        >
                          <img 
                            src={`${IMG_POSTER_URL}${item.poster_path}`} 
                            className="w-full h-auto aspect-[2/3] object-cover" 
                            alt={item.title} 
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-3 pt-8 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <h4 className="text-white font-bold text-xs truncate leading-tight">{item.title}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
