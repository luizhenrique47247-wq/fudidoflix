import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ArrowLeft, Loader2, List, X, ChevronLeft, ChevronRight, BookOpenCheck } from 'lucide-react';

export default function Mangas() {
  const [view, setView] = useState('grid'); // 'grid', 'details', 'reader'
  const [catalogType, setCatalogType] = useState('popular'); // 'popular', 'latest', 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [mangas, setMangas] = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  
  // Details view states
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaAuthor, setMangaAuthor] = useState('');
  const [mangaCoverUrl, setMangaCoverUrl] = useState('');
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Reader view states
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [readerPages, setReaderPages] = useState([]);
  const [loadingReader, setLoadingReader] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);

  const API_BASE = 'https://api.mangadex.org';
  const UPLOADS_BASE = 'https://uploads.mangadex.org';

  // API query helper with CORS fallback
  const fetchAPI = async (endpoint) => {
    const targetUrl = API_BASE + endpoint;
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error("CORS or api error");
      return await res.json();
    } catch (e) {
      console.warn("Direct connection failed. Using CORS proxy...", e);
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      return await proxyRes.json();
    }
  };

  // Load grid catalog on type or view change
  useEffect(() => {
    if (view !== 'grid') return;
    loadCatalog();
  }, [view, catalogType]);

  const loadCatalog = async (query = '') => {
    setLoadingGrid(true);
    setMangas([]);
    try {
      let endpoint = '';
      if (catalogType === 'popular') {
        endpoint = '/manga?limit=18&includes[]=cover_art&order[followedCount]=desc';
      } else if (catalogType === 'latest') {
        endpoint = '/manga?limit=18&includes[]=cover_art&order[latestUploadedChapter]=desc';
      } else if (catalogType === 'search' && query) {
        endpoint = `/manga?limit=18&includes[]=cover_art&title=${encodeURIComponent(query)}`;
      } else {
        setLoadingGrid(false);
        return;
      }

      const res = await fetchAPI(endpoint);
      if (res && res.data) {
        const list = res.data.map(m => {
          const coverRel = m.relationships.find(r => r.type === 'cover_art');
          const coverFile = coverRel?.attributes?.fileName || '';
          const coverUrl = coverFile ? `${UPLOADS_BASE}/covers/${m.id}/${coverFile}.256.jpg` : '';
          
          return {
            id: m.id,
            title: m.attributes.title.en || m.attributes.title.ja || Object.values(m.attributes.title)[0] || 'Sem título',
            desc: m.attributes.description.en || m.attributes.description['pt-br'] || Object.values(m.attributes.description)[0] || 'Sem descrição.',
            status: m.attributes.status,
            ageRating: m.attributes.contentRating,
            tags: m.attributes.tags.map(t => t.attributes.name.en),
            coverUrl,
            relationships: m.relationships
          };
        });
        setMangas(list);
      }
    } catch (err) {
      console.error("Erro ao carregar catálogo de mangás:", err);
    } finally {
      setLoadingGrid(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCatalogType('search');
      loadCatalog(searchQuery.trim());
    }
  };

  // Open Manga Details view
  const handleOpenDetails = async (manga) => {
    setSelectedManga(manga);
    setMangaCoverUrl(manga.coverUrl);
    setView('details');
    setChapters([]);
    setMangaAuthor('Desconhecido');
    
    // Load author name
    const authorRel = manga.relationships.find(r => r.type === 'author');
    if (authorRel) {
      try {
        const authData = await fetchAPI(`/author/${authorRel.id}`);
        if (authData && authData.data) {
          setMangaAuthor(authData.data.attributes.name);
        }
      } catch (err) {
        console.warn("Erro ao carregar autor:", err);
      }
    }

    // Load chapters (feed in pt-br)
    setLoadingChapters(true);
    try {
      const feed = await fetchAPI(`/manga/${manga.id}/feed?translatedLanguage[]=pt-br&limit=100&order[chapter]=desc&includes[]=scanlation_group`);
      if (feed && feed.data) {
        const sortedChaps = feed.data
          .map(c => ({
            id: c.id,
            chapterNum: parseFloat(c.attributes.chapter) || 0,
            title: c.attributes.title || `Capítulo ${c.attributes.chapter}`,
            group: c.relationships.find(r => r.type === 'scanlation_group')?.attributes?.name || 'Scan Oficial'
          }))
          .sort((a, b) => b.chapterNum - a.chapterNum);
        
        setChapters(sortedChaps);
      }
    } catch (err) {
      console.error("Erro ao buscar capítulos do mangá:", err);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Open Reader view
  const handleOpenReader = async (chapter, idx) => {
    setSelectedChapter(chapter);
    setCurrentChapterIndex(idx);
    setView('reader');
    setReaderPages([]);
    setLoadingReader(true);

    try {
      const serverRes = await fetchAPI(`/at-home/server/${chapter.id}`);
      if (serverRes && serverRes.chapter) {
        const baseUrl = serverRes.baseUrl;
        const hash = serverRes.chapter.hash;
        const pageFiles = serverRes.chapter.data;
        
        // Build page urls
        const urls = pageFiles.map(file => `${baseUrl}/data/${hash}/${file}`);
        setReaderPages(urls);
      }
    } catch (err) {
      console.error("Erro ao carregar páginas do capítulo:", err);
      alert("Não foi possível carregar as páginas do leitor.");
      setView('details');
    } finally {
      setLoadingReader(false);
    }
  };

  const navigateChapter = (offset) => {
    const nextIdx = currentChapterIndex - offset; // Feed is sorted desc
    if (nextIdx >= 0 && nextIdx < chapters.length) {
      handleOpenReader(chapters[nextIdx], nextIdx);
    }
  };

  return (
    <div className="pt-24 px-4 md:px-16 pb-20 min-h-screen flex flex-col route-transition select-none">
      
      {/* 1. MANGAS INDEX GRID VIEW */}
      {view === 'grid' && (
        <div className="flex-grow flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center">
              <BookOpen className="w-10 h-10 text-[#E50914] mr-4" />
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-wide">MangáReader</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="bg-zinc-900 rounded-xl p-1 flex border border-zinc-800">
                <button 
                  onClick={() => setCatalogType('popular')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors cursor-pointer ${
                    catalogType === 'popular' ? 'bg-[#E50914] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Populares
                </button>
                <button 
                  onClick={() => setCatalogType('latest')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors cursor-pointer ${
                    catalogType === 'latest' ? 'bg-[#E50914] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Atualizados
                </button>
              </div>
              
              <form onSubmit={handleSearchSubmit} className="relative flex-grow md:w-64">
                <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs md:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:border-[#E50914] focus:outline-none placeholder-zinc-500"
                  placeholder="Pesquisar..."
                />
              </form>
            </div>
          </div>

          {loadingGrid ? (
            <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-500">
              <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mb-3" />
              <span className="text-sm font-semibold">Buscando no MangaDex...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {mangas.map(m => (
                <div 
                  key={m.id}
                  onClick={() => handleOpenDetails(m)}
                  className="relative rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.03] hover:z-10 cursor-pointer bg-zinc-900 border border-zinc-800/80 group"
                >
                  {m.coverUrl ? (
                    <img 
                      src={m.coverUrl} 
                      className="w-full h-auto aspect-[2/3] object-cover" 
                      alt={m.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] flex items-center justify-center bg-zinc-950 text-zinc-500">
                      Sem Capa
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-3 pt-8 text-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <h4 className="text-white font-bold text-xs truncate leading-tight">{m.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MANGA DETAILS VIEW */}
      {view === 'details' && selectedManga && (
        <div className="flex-grow flex flex-col animate-fade-in">
          <button 
            onClick={() => setView('grid')}
            className="mb-6 flex items-center gap-2 text-zinc-300 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 rounded-xl border border-zinc-800 w-fit hover:border-zinc-700 font-bold text-sm cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-5 h-5" /> Voltar ao Catálogo
          </button>
          
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-8 mb-8 backdrop-blur-sm">
            <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col items-center">
              {mangaCoverUrl ? (
                <img 
                  src={mangaCoverUrl} 
                  alt={selectedManga.title}
                  className="w-full max-w-[240px] rounded-xl shadow-2xl border border-zinc-800 object-cover aspect-[2/3]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full max-w-[240px] aspect-[2/3] flex items-center justify-center bg-zinc-950 text-zinc-500 rounded-xl border border-zinc-800">
                  Sem Capa
                </div>
              )}
              <div className="mt-4 flex gap-2 justify-center select-none">
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/30 uppercase tracking-wider">
                  {selectedManga.status || 'Status'}
                </span>
                <span className="px-3 py-1 bg-zinc-850 text-zinc-300 text-xs font-bold rounded-full border border-zinc-800 uppercase tracking-wider">
                  {selectedManga.ageRating || 'L'}
                </span>
              </div>
            </div>
            
            <div className="flex-grow flex flex-col select-text">
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 leading-tight tracking-tight">{selectedManga.title}</h1>
              <p className="text-[#E50914] font-bold text-lg mb-6 flex items-center gap-2">
                Escrito por: <span className="text-zinc-200">{mangaAuthor}</span>
              </p>
              
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 select-none">Sinopse</h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850 mb-6 font-normal whitespace-pre-line">
                {selectedManga.desc}
              </p>
              
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 select-none">Tags / Gêneros</h3>
              <div className="flex flex-wrap gap-2 select-none">
                {selectedManga.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-400 text-xs font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between select-none">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <List className="w-6 h-6 text-[#E50914]" /> Capítulos em PT-BR
            </h2>
            <span className="text-xs font-extrabold bg-[#E50914] px-3.5 py-1.5 rounded-full shadow-lg shadow-red-500/10 leading-none">
              {chapters.length} Caps
            </span>
          </div>

          {loadingChapters ? (
            <div className="text-center py-16 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#E50914]" />
              <span className="text-sm font-semibold">Carregando feed de capítulos...</span>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
              <ul className="divide-y divide-zinc-950 max-h-[450px] overflow-y-auto scrollbar-none">
                {chapters.length === 0 ? (
                  <li className="p-8 text-center text-zinc-500 font-medium text-sm">Nenhum capítulo disponível em português.</li>
                ) : (
                  chapters.map((ch, idx) => (
                    <li 
                      key={ch.id}
                      onClick={() => handleOpenReader(ch, idx)}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-zinc-850/30 cursor-pointer transition-colors gap-2"
                    >
                      <div>
                        <span className="text-white font-extrabold text-sm sm:text-base mr-3">C. {ch.chapterNum}</span>
                        <span className="text-zinc-300 text-sm font-bold">{ch.title}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase bg-zinc-950 border border-zinc-800 text-zinc-500 px-2.5 py-1 rounded-md">
                        {ch.group}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 3. MANGA VERTICAL READER VIEW */}
      {view === 'reader' && selectedChapter && (
        <div className="flex-grow flex flex-col bg-black rounded-2xl border border-zinc-900 overflow-hidden relative animate-fade-in select-none">
          {/* Reader sticky top header */}
          <div className="sticky top-0 z-40 bg-zinc-950/95 border-b border-zinc-900/60 p-4 flex items-center justify-between backdrop-blur-md">
            <button 
              onClick={() => setView('details')}
              className="flex items-center gap-2 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 px-4 py-2 rounded-xl transition-colors border border-zinc-800 cursor-pointer font-bold text-sm"
            >
              <X className="w-5 h-5" /> <span>Sair</span>
            </button>
            
            <div className="text-center flex-1 px-4 min-w-0">
              <h2 className="text-[10px] text-zinc-500 font-black truncate uppercase tracking-widest leading-none mb-1">
                {selectedManga?.title}
              </h2>
              <h1 className="text-base font-bold text-white truncate leading-none">
                Capítulo {selectedChapter.chapterNum}
              </h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => navigateChapter(-1)}
                disabled={currentChapterIndex === chapters.length - 1}
                className="flex items-center justify-center text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 w-10 h-10 rounded-xl transition-colors border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Capítulo Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigateChapter(1)}
                disabled={currentChapterIndex === 0}
                className="flex items-center justify-center text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 w-10 h-10 rounded-xl transition-colors border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Próximo Capítulo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reader page viewport container */}
          <div className="flex-1 flex flex-col gap-2 p-2 sm:p-4 pb-24 items-center bg-[#07070a] min-h-[60vh]">
            {loadingReader ? (
              <div className="flex flex-col items-center justify-center py-40 text-zinc-500">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mb-3" />
                <span className="text-sm font-semibold">Baixando páginas do servidor MangaDex...</span>
              </div>
            ) : (
              readerPages.map((url, index) => (
                <img 
                  key={index}
                  src={url}
                  alt={`Página ${index + 1}`}
                  className="w-full max-w-[800px] h-auto rounded border border-zinc-900 shadow-xl"
                  referrerPolicy="no-referrer"
                  loading={index > 2 ? "lazy" : "eager"}
                />
              ))
            )}
          </div>
          
          {/* Reader bottom page navigation */}
          {currentChapterIndex > 0 && !loadingReader && (
            <div className="p-8 border-t border-zinc-900 bg-zinc-950 flex justify-center z-10 select-none">
              <button 
                onClick={() => navigateChapter(1)}
                className="bg-[#E50914] hover:bg-red-700 active:scale-95 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-500/10 flex items-center gap-2 cursor-pointer text-sm"
              >
                Próximo Capítulo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
