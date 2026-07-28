import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Loader2, Play, Tv, WifiOff } from 'lucide-react';
import Hls from 'hls.js';

const CATEGORY_TRANSLATIONS = {
  "kids": "Infantil & Animação",
  "movies": "Filmes",
  "series": "Séries",
  "sports": "Esportes",
  "news": "Notícias",
  "documentary": "Documentários",
  "music": "Música",
  "religious": "Religião",
  "general": "TV Aberta",
  "entertainment": "Entretenimento",
  "other": "Outros"
};

export default function AoVivo() {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorPlaying, setErrorPlaying] = useState(false);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Load Favorites from LocalStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('fudidoFlixAovivoFavs') || '[]');
    setFavorites(saved);

    const loadIPTV = async () => {
      setLoading(true);
      try {
        const parsedChannels = await fetchAndParseM3U();
        setChannels(parsedChannels);
        
        // Group categories
        const cats = new Set();
        parsedChannels.forEach(ch => {
          ch.categories.forEach(cat => cats.add(cat));
        });
        
        const sortedCats = Array.from(cats).sort((a, b) => {
          const transA = CATEGORY_TRANSLATIONS[a.toLowerCase()] || a;
          const transB = CATEGORY_TRANSLATIONS[b.toLowerCase()] || b;
          return transA.localeCompare(transB);
        });

        setCategories(sortedCats);

        if (sortedCats.length > 0) {
          setSelectedCategory(sortedCats[0]);
        }

        // Set first channel as active if available
        if (parsedChannels.length > 0) {
          setActiveChannel(parsedChannels[0]);
        }
      } catch (err) {
        console.error("Erro ao carregar IPTV:", err);
      } finally {
        setLoading(false);
      }
    };

    loadIPTV();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  // Update video player source on active channel changes
  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;

    setErrorPlaying(false);
    const video = videoRef.current;
    const streamUrl = activeChannel.streamUrl;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        maxMaxBufferLength: 5,
        enableWorker: true,
        lowLatencyMode: true
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log("HLS autoplay blocked:", e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setErrorPlaying(true);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log("Native HLS autoplay blocked:", e));
      });
      video.addEventListener('error', () => {
        setErrorPlaying(true);
      });
    }
  }, [activeChannel]);

  // Fetch and parse IPTV channels lists
  const fetchAndParseM3U = async () => {
    const urls = [
      'https://gist.githubusercontent.com/luizhenrique47247-wq/705c6a6157a5e44fd40bb52d83e1f9b9/raw',
      'https://iptv-org.github.io/iptv/countries/br.m3u'
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const text = await res.text();
        const lines = text.split('\n');
        const list = [];
        let tempChannel = null;

        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            const groupMatch = line.match(/group-title="([^"]+)"/i);
            const nameMatch = line.match(/,(.+)$/);

            let group = 'other';
            if (groupMatch && groupMatch[1]?.trim()) {
              group = groupMatch[1].trim();
            }

            tempChannel = {
              id: 'iptv_' + Math.random().toString(36).substr(2, 9),
              name: nameMatch ? nameMatch[1].trim() : 'Canal',
              logoUrl: logoMatch ? logoMatch[1] : null,
              categories: [group],
              streamQuality: 'HD',
              country: 'BR'
            };
          } else if (line.startsWith('http') && tempChannel) {
            tempChannel.streamUrl = line;
            list.push(tempChannel);
            tempChannel = null;
          }
        }

        if (list.length > 0) {
          return list;
        }
      } catch (e) {
        console.warn(`Erro ao baixar playlist de ${url}:`, e);
      }
    }
    return [];
  };

  const isFavorite = (ch) => {
    if (!ch) return false;
    return favorites.some(fav => fav.name === ch.name);
  };

  const handleToggleFavorite = () => {
    if (!activeChannel) return;

    let updated;
    if (isFavorite(activeChannel)) {
      updated = favorites.filter(fav => fav.name !== activeChannel.name);
    } else {
      updated = [...favorites, activeChannel];
    }
    setFavorites(updated);
    localStorage.setItem('fudidoFlixAovivoFavs', JSON.stringify(updated));
  };

  // Filter channels based on search and selected category
  const filteredChannels = channels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedCategory === 'Favoritos') {
      return matchesSearch && favorites.some(fav => fav.name === ch.name);
    }
    return matchesSearch && ch.categories.includes(selectedCategory);
  });

  return (
    <div className="pt-[68px] h-screen flex flex-col bg-black route-transition select-none">
      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-[#0a0a0f] text-white">
          <Loader2 className="w-12 h-12 text-[#E50914] animate-spin mb-4" />
          <h4 className="text-2xl font-black tracking-tight">Fudido<span className="text-[#E50914]">AoVivo</span></h4>
          <p className="text-zinc-500 text-sm mt-2">Sintonizando canais via IPTV...</p>
        </div>
      ) : (
        <>
          {/* Main Embedded Player Section */}
          <section className="relative w-full h-[40vh] md:h-[50vh] flex-shrink-0 bg-black border-b border-zinc-800/60 shadow-2xl group">
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain"
              controls 
              autoPlay 
              muted 
              playsInline 
            />

            {/* Playback info overlays */}
            {activeChannel && (
              <div className="absolute top-0 inset-x-0 p-4 md:p-6 bg-gradient-to-b from-black/85 via-black/35 to-transparent pointer-events-none transition-opacity duration-300 opacity-100 group-hover:opacity-100">
                <h2 className="text-xl md:text-3xl font-black text-white drop-shadow-lg leading-none">
                  {activeChannel.name}
                </h2>
                
                <div className="pointer-events-auto mt-4">
                  <button 
                    onClick={handleToggleFavorite}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs md:text-sm font-bold transition-all shadow-lg cursor-pointer ${
                      isFavorite(activeChannel)
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20'
                        : 'bg-zinc-950/65 border-zinc-800/40 text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFavorite(activeChannel) ? 'fill-amber-500' : ''}`} />
                    {isFavorite(activeChannel) ? 'Favoritado' : 'Favoritar Canal'}
                  </button>
                </div>
              </div>
            )}

            {/* Offline Signal Overlay */}
            {errorPlaying && (
              <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center z-20">
                <WifiOff className="w-12 h-12 text-[#E50914] mb-4" />
                <p className="text-white font-bold text-lg">Sinal Indisponível</p>
                <p className="text-zinc-500 text-sm mt-1 max-w-sm text-center px-4 leading-relaxed">
                  Este canal está offline ou a transmissão expirou. Tente sintonizar outro canal.
                </p>
              </div>
            )}
          </section>

          {/* Guide Selector panel */}
          <section className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0c0c0f]">
            
            {/* Category sidebar list */}
            <aside className="w-full md:w-64 flex-shrink-0 bg-zinc-900/70 border-b md:border-b-0 md:border-r border-zinc-800/60 flex flex-col z-10">
              <div className="p-3 border-b border-zinc-800/60">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar canal..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-full py-2 pl-9 pr-4 text-white text-xs md:text-sm focus:outline-none focus:border-[#E50914] placeholder-zinc-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col p-2 space-x-1 md:space-x-0 md:space-y-0.5 no-scrollbar">
                {favorites.length > 0 && (
                  <button
                    onClick={() => setSelectedCategory('Favoritos')}
                    className={`flex-shrink-0 md:w-full text-left font-bold text-xs md:text-sm p-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                      selectedCategory === 'Favoritos' 
                        ? 'bg-[#E50914] text-white shadow-md' 
                        : 'text-amber-500 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${selectedCategory === 'Favoritos' ? 'fill-white' : 'fill-amber-500'}`} />
                    Meus Favoritos ({favorites.length})
                  </button>
                )}
                
                {categories.map(cat => {
                  const translatedName = CATEGORY_TRANSLATIONS[cat.toLowerCase()] || cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex-shrink-0 md:w-full text-left font-semibold text-xs md:text-sm px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-white text-black font-extrabold shadow-md' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-850/50'
                      }`}
                    >
                      {translatedName}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Guide Grid list details */}
            <main className="flex-grow flex flex-col overflow-hidden">
              <div className="flex items-center bg-zinc-900/40 border-b border-zinc-800/60 flex-shrink-0 text-zinc-500 text-[10px] md:text-xs font-black uppercase tracking-wider select-none">
                <div className="w-24 md:w-40 flex-shrink-0 p-3 border-r border-zinc-800/60 text-center">Canal</div>
                <div className="flex-grow p-3 pl-6">Passando Agora</div>
              </div>

              {/* Channels loop list */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/40 pb-6">
                {filteredChannels.length === 0 ? (
                  <div className="text-center py-16 text-zinc-600 text-sm font-medium">Nenhum canal sintonizado nesta categoria.</div>
                ) : (
                  filteredChannels.map(ch => {
                    const isActive = activeChannel?.name === ch.name;
                    return (
                      <div 
                        key={ch.id}
                        onClick={() => setActiveChannel(ch)}
                        className={`flex items-center cursor-pointer transition-colors group ${
                          isActive ? 'bg-zinc-900/80' : 'hover:bg-zinc-900/25'
                        }`}
                      >
                        {/* Channel logo / quality info */}
                        <div className="w-24 md:w-40 flex-shrink-0 p-3 border-r border-zinc-900/40 flex flex-col items-center justify-center gap-1.5">
                          {ch.logoUrl ? (
                            <img 
                              src={ch.logoUrl} 
                              alt={ch.name} 
                              className="h-10 md:h-12 w-auto max-w-[80px] md:max-w-[120px] object-contain rounded filter brightness-95"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <Tv className="w-8 h-8 text-zinc-600" />
                          )}
                          <span className="text-[9px] font-black bg-zinc-800 text-zinc-400 border border-zinc-700/40 px-1.5 py-0.5 rounded leading-none">
                            {ch.streamQuality}
                          </span>
                        </div>

                        {/* Guide channel details */}
                        <div className="flex-grow p-4 pl-6 flex justify-between items-center pr-6">
                          <div className="min-w-0">
                            <h4 className={`text-sm md:text-base font-bold ${isActive ? 'text-[#E50914]' : 'text-white group-hover:text-zinc-200'} truncate`}>
                              {ch.name}
                            </h4>
                            <p className="text-zinc-500 text-xs md:text-sm mt-1 truncate">
                              Transmissão ao vivo 24/7 de alta fidelidade
                            </p>
                          </div>
                          
                          <button 
                            className={`p-2.5 rounded-full border transition-colors flex items-center justify-center ${
                              isActive
                                ? 'bg-[#E50914]/20 border-[#E50914]/40 text-[#E50914]'
                                : 'bg-zinc-800 border-zinc-700/50 text-zinc-400 group-hover:text-white group-hover:bg-zinc-750'
                            }`}
                          >
                            <Play className={`w-4.5 h-4.5 ${isActive ? 'fill-[#E50914]' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </main>
          </section>
        </>
      )}
    </div>
  );
}
