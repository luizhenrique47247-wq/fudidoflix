import React, { useState, useEffect, useRef } from 'react';
import { Dices, Disc, Compass, Swords, Heart, Play, Loader2, Star, Sparkles, RefreshCw, Film, Tv, Shuffle, ArrowLeft, Trophy, Zap, BookmarkPlus, Search, X, Trash2, Send, MessageCircle, UserCheck, Construction } from 'lucide-react';
import { fetchTMDB, IMG_POSTER_URL } from '../services/api';
import * as Storage from '../services/storageService';
import MediaCard from '../components/MediaCard';

const STUDIO_LIST = [
  { id: 41077, name: 'A24', logo_path: 'https://image.tmdb.org/t/p/w500/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png' },
  { id: 10342, name: 'Studio Ghibli', logo_path: 'https://image.tmdb.org/t/p/w500/uFuxPEZRUcBTEiYIxjHJq62Vr77.png' },
  { id: 3, name: 'Pixar', logo_path: 'https://image.tmdb.org/t/p/w500/1TjvGVDMYsj6JBxOAkUHpPEwLf7.png' },
  { id: 420, name: 'Marvel Studios', logo_path: 'https://image.tmdb.org/t/p/w500/hUzeosd33nzE5MCNsZxCGEKTXaQ.png' },
  { id: 174, name: 'Warner Bros.', logo_path: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Warner_Bros_logo.svg' },
  { id: 33, name: 'Universal Pictures', logo_path: 'https://image.tmdb.org/t/p/w500/8lvHyhjr8oUKOOy2dKXoALWKdp0.png' },
  { id: 521, name: 'DreamWorks', logo_path: 'https://image.tmdb.org/t/p/w500/3BPX5VGBov8SDqTV7wC1L1xShAS.png' },
  { id: 2, name: 'Disney', logo_path: 'https://image.tmdb.org/t/p/w500/6SeZO9r3RpIGezMELFj8iiz3UEG.png' },
  { id: 128064, name: 'DC Films', logo_path: 'https://image.tmdb.org/t/p/w500/eOL4PkiC0zkDpxKFQhBnmCtwx5p.png' },
  { id: 34, name: 'Sony Pictures', logo_path: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Sony_Pictures_Television_logo.svg' }
];

const ROMANTIC_SUGGESTIONS = [
  'Meu amor',
  'marido',
  'esposa',
  'denguinho',
  'Vida',
  'Amor Henrique',
  'Moreco',
  'Vida Bahia'
];

// 10x Enhanced Confetti Explosion Component (160 Particles)
const ConfettiExplosion = () => {
  const particles = Array.from({ length: 160 });
  const colors = ['#E50914', '#FFD700', '#FF4081', '#FF1744', '#E040FB', '#FFFFFF', '#AA00FF', '#FF9100', '#00E5FF'];

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map((_, i) => {
        const left = Math.random() * 100;
        const color = colors[i % colors.length];
        const animationDelay = (Math.random() * 1.5).toFixed(2);
        const animationDuration = (2.5 + Math.random() * 2.5).toFixed(2);
        const size = Math.floor(Math.random() * 10) + 6;
        const initialRotation = Math.floor(Math.random() * 360);

        return (
          <div
            key={i}
            className="absolute rounded-sm animate-confetti-fall"
            style={{
              left: `${left}%`,
              top: `-30px`,
              width: `${size}px`,
              height: `${size * (Math.random() > 0.4 ? 1.8 : 1)}px`,
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
              animationDelay: `${animationDelay}s`,
              animationDuration: `${animationDuration}s`,
              transform: `rotate(${initialRotation}deg)`
            }}
          />
        );
      })}
    </div>
  );
};

export default function Sorte({ openDetails }) {
  const [activeFeature, setActiveFeature] = useState(''); // '', 'surprise', 'roulette', 'discover', 'duelo', 'love'
  const [showConfetti, setShowConfetti] = useState(false);

  // Strictly lock body/html overflow to prevent page scrolling completely
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // =========================================================================
  // RECURSO 1: SURPREENDA-ME (SLOT MACHINE CASINO SVG) STATES
  // =========================================================================
  const [surpriseFilter, setSurpriseFilter] = useState('movie');
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [slotWinner, setSlotWinner] = useState(null);
  const [reelPosters, setReelPosters] = useState([]);
  const [leverPulled, setLeverPulled] = useState(false);

  useEffect(() => {
    if (reelPosters.length === 0) {
      fetchTMDB('/trending/all/day')
        .then(data => {
          if (data && data.results) {
            setReelPosters(data.results.filter(item => item.poster_path).slice(0, 12));
          }
        })
        .catch(() => {});
    }
  }, [reelPosters.length]);

  const spinSlotMachine = async () => {
    if (isSlotSpinning) return;
    setIsSlotSpinning(true);
    setLeverPulled(true);
    setSlotWinner(null);
    setShowConfetti(false);

    setTimeout(() => setLeverPulled(false), 400);

    try {
      let chosenType = surpriseFilter;
      if (surpriseFilter === 'all') {
        chosenType = Math.random() > 0.5 ? 'movie' : 'tv';
      }

      const randomPage = Math.floor(Math.random() * 8) + 1;
      const data = await fetchTMDB(`/discover/${chosenType}?sort_by=popularity.desc&page=${randomPage}&vote_count.gte=100`);

      let selected = null;
      if (data && data.results && data.results.length > 0) {
        const valid = data.results.filter(item => item.poster_path && item.overview);
        if (valid.length > 0) {
          selected = valid[Math.floor(Math.random() * valid.length)];
          selected.mediaType = chosenType;
        }
      }

      setTimeout(() => {
        setIsSlotSpinning(false);
        if (selected) {
          setSlotWinner(selected);
          setShowConfetti(true);
        } else {
          alert("Não foi possível sortear agora. Tente novamente!");
        }
      }, 2500);

    } catch (e) {
      console.error("Erro no Slot Machine:", e);
      setIsSlotSpinning(false);
    }
  };

  // =========================================================================
  // RECURSO 2: ROLETA DA SORTE 3D NEON STATES
  // =========================================================================
  const [rouletteItems, setRouletteItems] = useState([]);
  const [rouletteSearchQuery, setRouletteSearchQuery] = useState('');
  const [rouletteSearchResults, setRouletteSearchResults] = useState([]);
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState(null);
  const [rouletteRotation, setRouletteRotation] = useState(0);

  const canvasRef = useRef(null);
  const spinDuration = 6000;
  const redColors = ['#E50914', '#831010'];

  useEffect(() => {
    if (activeFeature !== 'roulette' || rouletteWinner) return;
    
    const timer = setTimeout(() => {
      drawWheel();
    }, 30);

    return () => clearTimeout(timer);
  }, [rouletteItems, activeFeature, rouletteWinner]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const displayItems = rouletteItems.length > 0 
      ? rouletteItems 
      : [{ title: 'Adicionar Filmes' }, { title: 'Puxar da Lista' }];

    const n = displayItems.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const center = canvas.width / 2;
    const radius = center - 16;
    const arcSize = (2 * Math.PI) / n;

    for (let i = 0; i < n; i++) {
      const item = displayItems[i];
      const angle = i * arcSize - Math.PI / 2;

      ctx.beginPath();
      ctx.fillStyle = redColors[i % 2];
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + arcSize);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px Inter, sans-serif';

      let title = item.title || item.name || '';
      if (title.length > 22) {
        title = title.substring(0, 19) + '...';
      }

      ctx.fillText(title, radius - 24, 5);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#EAB308';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.stroke();
  };

  const importFromMyList = () => {
    const myList = Storage.getMyList();
    if (!myList || myList.length === 0) {
      alert("Sua 'Minha Lista' está vazia! Adicione filmes ou séries para importar.");
      return;
    }

    const map = new Map();
    [...rouletteItems, ...myList].forEach(item => map.set(item.id, item));
    const merged = Array.from(map.values());

    setRouletteItems(merged);
  };

  const handleRouletteSearch = async (e) => {
    const query = e.target.value;
    setRouletteSearchQuery(query);

    if (query.length < 2) {
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
    const itemData = {
      id: item.id,
      type: item.media_type || (item.title ? 'movie' : 'tv'),
      title: item.title || item.name,
      poster_path: item.poster_path,
      overview: item.overview,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date
    };
    setRouletteItems([...rouletteItems, itemData]);
    setRouletteSearchQuery('');
    setRouletteSearchResults([]);
  };

  const removeItemFromRoulette = (id) => {
    setRouletteItems(rouletteItems.filter(item => item.id !== id));
  };

  const clearRoulette = () => {
    setRouletteItems([]);
    setRouletteWinner(null);
  };

  const spinRoulette = () => {
    if (isRouletteSpinning) return;
    if (rouletteItems.length < 1) {
      alert("Adicione pelo menos 1 item ou puxe da sua lista no botão abaixo!");
      return;
    }

    setIsRouletteSpinning(true);
    setRouletteWinner(null);
    setShowConfetti(false);

    const n = rouletteItems.length;
    const segmentDegrees = 360 / n;
    
    const winningIndex = Math.floor(Math.random() * n);
    const stopAngle = (winningIndex * segmentDegrees) + (segmentDegrees / 2);
    
    const extraSpins = 6 * 360;
    const totalRotationNeeded = extraSpins + (360 - stopAngle);
    const targetRotation = rouletteRotation + totalRotationNeeded;
    
    setRouletteRotation(targetRotation);

    setTimeout(() => {
      setIsRouletteSpinning(false);
      const winner = rouletteItems[winningIndex];
      setRouletteWinner(winner);
      setShowConfetti(true);
    }, spinDuration);
  };

  // =========================================================================
  // RECURSO 3: DESCOBRIR POR ESTÚDIOS & ATORES STATES
  // =========================================================================
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [studioMovies, setStudioMovies] = useState([]);
  const [loadingStudioMovies, setLoadingStudioMovies] = useState(false);

  const [popularActors, setPopularActors] = useState([]);
  const [actorSearchQuery, setActorSearchQuery] = useState('');
  const [actorSearchResults, setActorSearchResults] = useState([]);
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorMovies, setActorMovies] = useState([]);
  const [loadingActorMovies, setLoadingActorMovies] = useState(false);

  useEffect(() => {
    if (activeFeature === 'discover' && popularActors.length === 0) {
      fetchTMDB('/person/popular')
        .then(data => {
          if (data && data.results) {
            const valid = data.results.filter(p => p.profile_path);
            setPopularActors(valid.slice(0, 12));
          }
        })
        .catch(() => {});
    }
  }, [activeFeature, popularActors.length]);

  const handleSelectStudio = async (studio) => {
    setSelectedStudio(studio);
    setLoadingStudioMovies(true);
    try {
      const data = await fetchTMDB(`/discover/movie?with_companies=${studio.id}&sort_by=popularity.desc`);
      if (data && data.results) {
        setStudioMovies(data.results.filter(m => m.poster_path));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudioMovies(false);
    }
  };

  const handleActorSearch = async (e) => {
    const query = e.target.value;
    setActorSearchQuery(query);
    if (query.length < 2) {
      setActorSearchResults([]);
      return;
    }
    try {
      const data = await fetchTMDB(`/search/person?query=${encodeURIComponent(query)}`);
      if (data && data.results) {
        setActorSearchResults(data.results.filter(p => p.profile_path));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectActor = async (actor) => {
    setSelectedActor(actor);
    setLoadingActorMovies(true);
    try {
      const data = await fetchTMDB(`/person/${actor.id}/movie_credits`);
      if (data && data.cast) {
        setActorMovies(data.cast.filter(m => m.poster_path).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActorMovies(false);
    }
  };

  // =========================================================================
  // RECURSO 4: DUELO 1V1 (TORNEIO MATA-MATA) STATES
  // =========================================================================
  const [dueloType, setDueloType] = useState('movie');
  const [dueloCount, setDueloCount] = useState(8);
  const [dueloStage, setDueloStage] = useState('setup');
  const [dueloItems, setDueloItems] = useState([]);
  const [nextRoundWinners, setNextRoundWinners] = useState([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [dueloChampion, setDueloChampion] = useState(null);
  const [loadingDuelo, setLoadingDuelo] = useState(false);

  const startDueloTournament = async () => {
    setLoadingDuelo(true);
    setDueloChampion(null);
    setShowConfetti(false);
    try {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const data = await fetchTMDB(`/discover/${dueloType}?sort_by=popularity.desc&page=${randomPage}&vote_count.gte=150`);
      
      if (data && data.results) {
        const valid = data.results.filter(item => item.poster_path && item.overview).slice(0, dueloCount);
        if (valid.length >= 4) {
          setDueloItems(valid);
          setNextRoundWinners([]);
          setMatchIndex(0);
          setDueloStage('playing');
        } else {
          alert("Não foi possível carregar participantes suficientes. Tente novamente!");
        }
      }
    } catch (e) {
      console.error("Erro no Duelo 1v1:", e);
    } finally {
      setLoadingDuelo(false);
    }
  };

  const handleVoteDuelo = (winnerItem) => {
    const updatedWinners = [...nextRoundWinners, winnerItem];
    const nextMatch = matchIndex + 2;

    if (nextMatch < dueloItems.length) {
      setNextRoundWinners(updatedWinners);
      setMatchIndex(nextMatch);
    } else {
      if (updatedWinners.length === 1) {
        setDueloChampion(updatedWinners[0]);
        setDueloStage('winner');
        setShowConfetti(true);
      } else {
        setDueloItems(updatedWinners);
        setNextRoundWinners([]);
        setMatchIndex(0);
      }
    }
  };

  // =========================================================================
  // RECURSO 5: INDICAÇÕES DO AMOR (FILTRADO STRICTAMENTE PELO PERFIL ATIVO)
  // =========================================================================
  const [loveTab, setLoveTab] = useState('received'); // 'received' ou 'send'
  const [loveRecommendations, setLoveRecommendations] = useState([]);
  const [loveSearchQuery, setLoveSearchQuery] = useState('');
  const [loveSearchResults, setLoveSearchResults] = useState([]);
  const [selectedLoveItem, setSelectedLoveItem] = useState(null);
  const [loveNote, setLoveNote] = useState('');
  const [senderName, setSenderName] = useState('');
  const [targetProfileName, setTargetProfileName] = useState('');
  const [otherProfiles, setOtherProfiles] = useState([]);

  // =========================================================================
  // RECURSO 6: EM CONSTRUÇÃO VISUAL (SEM NADA DE ESCREVER)
  // =========================================================================

  useEffect(() => {
    if (activeFeature === 'love') {
      const allRecs = Storage.getLoveRecommendations();
      const activeProf = Storage.getActiveProfile();

      // Show ONLY recommendations directed to the active profile (Perfil 1 only sees what Perfil 2 sent to Perfil 1)
      const filteredForMe = allRecs.filter(rec => {
        if (!activeProf) return true;
        return rec.targetProfileName === activeProf.name || rec.targetProfileName === 'Todos';
      });

      setLoveRecommendations(filteredForMe);
      
      const allProfiles = Storage.getProfiles();
      const filteredOtherProfiles = allProfiles.filter(p => !activeProf || p.id !== activeProf.id);
      
      setOtherProfiles(filteredOtherProfiles);
      if (filteredOtherProfiles.length > 0) {
        setTargetProfileName(filteredOtherProfiles[0].name);
      } else {
        setTargetProfileName('Meu amor');
      }
    }
  }, [activeFeature]);

  const handleLoveSearch = async (e) => {
    const query = e.target.value;
    setLoveSearchQuery(query);
    if (query.length < 2) {
      setLoveSearchResults([]);
      return;
    }
    try {
      const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
      if (data && data.results) {
        const valid = data.results.filter(i => (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path);
        setLoveSearchResults(valid.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendLoveRecommendation = () => {
    if (!selectedLoveItem) {
      alert("Por favor, selecione um filme ou série para recomendar!");
      return;
    }

    const finalSender = senderName.trim() || 'Meu amor';
    const destName = targetProfileName || 'Meu amor';
    Storage.saveLoveRecommendation(selectedLoveItem, loveNote, finalSender, destName);
    
    // Refresh filtered list for active profile
    const allRecs = Storage.getLoveRecommendations();
    const activeProf = Storage.getActiveProfile();
    const filteredForMe = allRecs.filter(rec => {
      if (!activeProf) return true;
      return rec.targetProfileName === activeProf.name || rec.targetProfileName === 'Todos';
    });
    setLoveRecommendations(filteredForMe);

    setSelectedLoveItem(null);
    setLoveNote('');
    setLoveSearchQuery('');
    setLoveSearchResults([]);
    setLoveTab('received');
    setShowConfetti(true);
  };

  const handleDeleteLoveRec = (id) => {
    Storage.deleteLoveRecommendation(id);
    const allRecs = Storage.getLoveRecommendations();
    const activeProf = Storage.getActiveProfile();
    const filteredForMe = allRecs.filter(rec => {
      if (!activeProf) return true;
      return rec.targetProfileName === activeProf.name || rec.targetProfileName === 'Todos';
    });
    setLoveRecommendations(filteredForMe);
  };



  const myListCount = Storage.getMyList()?.length || 0;

  return (
    <div className="pt-20 px-4 md:px-12 h-[calc(100vh-1rem)] route-transition select-none flex flex-col justify-between pb-4 overflow-hidden">
      
      {/* 10x Enhanced Confetti Animation when Winner or Love Rec is sent */}
      {showConfetti && <ConfettiExplosion />}

      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0 mb-2 relative z-50">
        <div className="flex items-center space-x-3">
          {activeFeature && (
            <button
              onClick={() => { 
                setActiveFeature(''); 
                setSlotWinner(null); 
                setRouletteWinner(null); 
                setShowConfetti(false); 
                setRouletteItems([]); 
                setSelectedStudio(null);
                setSelectedActor(null);
                setDueloStage('setup');
                setDueloChampion(null);
              }}
              className="mr-2 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full border border-zinc-700 transition-colors cursor-pointer"
              title="Voltar às Opções"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-1.5 h-6 md:h-7 bg-[#E50914] rounded-full shadow-[0_0_14px_#E50914]"></div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
            {activeFeature === 'surprise' 
              ? '🎰 Caça-Níqueis da Sorte' 
              : (activeFeature === 'roulette' ? '🎯 Roleta da Sorte 3D' : (activeFeature === 'discover' ? '🎬 Hub de Estúdios & Atores' : (activeFeature === 'duelo' ? '⚔️ Duelo 1v1' : (activeFeature === 'love' ? '❤️ Indicações do Amor' : 'Central da Sorte & Decisão'))))}
          </h2>
        </div>
      </div>

      {/* =========================================================================
          VISÃO 1: MENU PRINCIPAL (CARDS ULTRA ESTILIZADOS E UNIFICADOS)
          ========================================================================= */}
      {!activeFeature && (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-auto items-stretch">
          
          {/* Card 1: Surpreenda-me */}
          <div 
            onClick={() => { setActiveFeature('surprise'); setSlotWinner(null); setShowConfetti(false); }}
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/40 border-2 border-red-600/50 rounded-2xl p-6 flex flex-col justify-between hover:border-red-500 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#E50914]/20 rounded-full blur-3xl group-hover:bg-[#E50914]/40 transition-all"></div>
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl"></div>

            <div>
              <div className="w-14 h-14 bg-gradient-to-tr from-[#E50914] to-red-600 border border-red-400/50 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(229,9,20,0.6)] mb-4">
                <Dices className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors mb-1.5 flex items-center">
                🎰 Surpreenda-me!
              </h3>
              <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                Caça-Níqueis de cassino! Escolha Filme, Série ou Aleatório e puxe a alavanca.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-red-500 group-hover:text-white pt-4 border-t border-red-900/30">
              <span className="uppercase tracking-wider">Jogar no Caça-Níqueis</span>
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Roleta da Sorte */}
          <div 
            onClick={() => { setActiveFeature('roulette'); setRouletteWinner(null); setShowConfetti(false); }}
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/40 border-2 border-red-600/50 rounded-2xl p-6 flex flex-col justify-between hover:border-red-500 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#E50914]/20 rounded-full blur-3xl group-hover:bg-[#E50914]/40 transition-all"></div>
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-red-600/10 rounded-full blur-2xl"></div>

            <div>
              <div className="w-14 h-14 bg-gradient-to-tr from-[#E50914] to-red-600 border border-red-400/50 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(229,9,20,0.6)] mb-4">
                <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: '10s' }} />
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors mb-1.5 flex items-center">
                🎯 Roleta da Sorte
              </h3>
              <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                Roleta 3D com fatias em vermelho neon. Puxe da Minha Lista ou adicione títulos.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-red-500 group-hover:text-white pt-4 border-t border-red-900/30">
              <span className="uppercase tracking-wider">Girar a Roleta</span>
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Estúdios & Atores */}
          <div 
            onClick={() => { setActiveFeature('discover'); setSelectedStudio(null); setSelectedActor(null); }}
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/40 border-2 border-red-600/50 rounded-2xl p-6 flex flex-col justify-between hover:border-red-500 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#E50914]/20 rounded-full blur-3xl group-hover:bg-[#E50914]/40 transition-all"></div>
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl"></div>

            <div>
              <div className="w-14 h-14 bg-gradient-to-tr from-[#E50914] to-red-600 border border-red-400/50 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(229,9,20,0.6)] mb-4">
                <Compass className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors mb-1.5 flex items-center">
                🎬 Estúdios & Atores
              </h3>
              <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                Navegue pelas produções da A24, Marvel, Pixar, Studio Ghibli ou busque atores famosos.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-red-500 group-hover:text-white pt-4 border-t border-red-900/30">
              <span className="uppercase tracking-wider">Explorar Estúdios</span>
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Duelo 1v1 */}
          <div 
            onClick={() => { setActiveFeature('duelo'); setDueloStage('setup'); setDueloChampion(null); }}
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/40 border-2 border-red-600/50 rounded-2xl p-6 flex flex-col justify-between hover:border-red-500 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#E50914]/20 rounded-full blur-3xl group-hover:bg-[#E50914]/40 transition-all"></div>
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl"></div>

            <div>
              <div className="w-14 h-14 bg-gradient-to-tr from-[#E50914] to-red-600 border border-red-400/50 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(229,9,20,0.6)] mb-4">
                <Swords className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors mb-1.5 flex items-center">
                ⚔️ Duelo 1v1 (Mata-Mata)
              </h3>
              <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                Torneio eliminatório! Vote nos confrontos 1x1 entre filmes até sobrar o Campeão.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-red-500 group-hover:text-white pt-4 border-t border-red-900/30">
              <span className="uppercase tracking-wider">Iniciar Duelo</span>
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 5: Indicações do Amor */}
          <div 
            onClick={() => setActiveFeature('love')}
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/40 border-2 border-red-600/50 rounded-2xl p-6 flex flex-col justify-between hover:border-red-500 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#E50914]/20 rounded-full blur-3xl group-hover:bg-[#E50914]/40 transition-all"></div>
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl"></div>

            <div>
              <div className="w-14 h-14 bg-gradient-to-tr from-[#E50914] to-red-600 border border-red-400/50 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(229,9,20,0.6)] mb-4">
                <Heart className="w-8 h-8 animate-pulse text-red-400 fill-red-400" />
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors mb-1.5 flex items-center">
                ❤️ Indicações do Amor
              </h3>
              <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                Envie recomendações especiais com recadinhos carinhosos para o seu amor!
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-red-500 group-hover:text-white pt-4 border-t border-red-900/30">
              <span className="uppercase tracking-wider">Ver & Enviar Indicações</span>
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 6: Visual Hazard "EM CONSTRUÇÃO" Card (Sem nada de escrever) */}
          <div 
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-yellow-500/70 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl cursor-default group"
          >
            {/* Background Diagonal Caution Tape Stripes Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(-45deg,#EAB308,#EAB308_12px,#000000_12px,#000000_24px)] pointer-events-none"></div>

            <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-500/30 transition-all"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-yellow-500 via-amber-500 to-yellow-600 border border-yellow-300/50 rounded-2xl flex items-center justify-center text-zinc-950 shadow-[0_0_25px_rgba(234,179,8,0.7)] group-hover:scale-110 transition-transform">
                  <Construction className="w-8 h-8 animate-bounce text-zinc-950" />
                </div>

                <div className="flex items-center space-x-1 bg-yellow-500/20 border border-yellow-500/60 text-yellow-400 px-3 py-1 rounded-full font-black text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                  <Zap className="w-3.5 h-3.5 fill-yellow-400" />
                  <span>EM BREVE</span>
                </div>
              </div>

              {/* Bold "EM CONSTRUÇÃO" Banner */}
              <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-zinc-950 p-2.5 rounded-xl text-center font-black tracking-widest text-lg uppercase shadow-[0_0_20px_rgba(234,179,8,0.5)] my-2 border border-yellow-200/60">
                ⚠️ EM CONSTRUÇÃO ⚠️
              </div>

              <p className="text-zinc-300 text-xs leading-relaxed font-medium text-center mt-3">
                Novas ferramentas surpresa e modos de jogo estão sendo desenvolvidos para o FudidoFlix Sorte!
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between text-xs font-black text-yellow-400 pt-4 border-t border-yellow-900/40 mt-3">
              <span className="uppercase tracking-widest text-[11px]">Novidades Chegando...</span>
              <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          VISÃO DEDICADA: RECURSO 1 - CAÇA-NÍQUEIS SVG
          ========================================================================= */}
      {activeFeature === 'surprise' && (
        <div className="flex-1 flex flex-col justify-between items-center my-auto w-full max-w-4xl mx-auto">
          
          <div className="flex justify-center items-center space-x-2 bg-zinc-950 p-1.5 rounded-full border border-zinc-800 shadow-xl mb-4 w-full max-w-md">
            <button
              onClick={() => setSurpriseFilter('movie')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                surpriseFilter === 'movie'
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Filmes</span>
            </button>

            <button
              onClick={() => setSurpriseFilter('tv')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                surpriseFilter === 'tv'
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Séries</span>
            </button>

            <button
              onClick={() => setSurpriseFilter('all')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                surpriseFilter === 'all'
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Aleatório</span>
            </button>
          </div>

          {!slotWinner ? (
            <div className="relative w-full max-w-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-[#120304] border-4 border-red-600/50 rounded-3xl p-5 shadow-[0_0_50px_rgba(229,9,20,0.35)] flex flex-col items-center justify-center my-auto">
              
              <div className="w-full flex items-center justify-between px-6 py-2 bg-zinc-950 border border-yellow-500/40 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></div>
                <span className="text-yellow-400 font-black text-xs md:text-sm tracking-widest uppercase flex items-center">
                  <Zap className="w-4 h-4 mr-1 text-yellow-400 fill-yellow-400" />
                  FUDIDOFLIX SLOTS CASINO
                  <Zap className="w-4 h-4 ml-1 text-yellow-400 fill-yellow-400" />
                </span>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></div>
              </div>

              <div className="relative w-full flex items-center justify-center space-x-3 px-2 py-4 bg-zinc-950/90 border-2 border-zinc-800 rounded-2xl">
                
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 border-y-2 border-[#E50914] bg-[#E50914]/10 pointer-events-none z-10 shadow-[0_0_20px_#E50914]"></div>

                {[0, 1, 2].map(reelIndex => (
                  <div 
                    key={reelIndex}
                    className="w-1/3 h-44 rounded-xl bg-black border-4 border-zinc-700/80 shadow-inner flex flex-col items-center justify-center overflow-hidden relative"
                  >
                    {isSlotSpinning ? (
                      <div className="flex flex-col items-center justify-center space-y-2 animate-bounce py-2">
                        <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
                        <span className="text-[10px] text-yellow-400 font-black uppercase tracking-widest animate-pulse">
                          SPINNING...
                        </span>
                      </div>
                    ) : (
                      reelPosters.length > 0 ? (
                        <img 
                          src={`${IMG_POSTER_URL}${reelPosters[(reelIndex * 4) % reelPosters.length]?.poster_path}`} 
                          alt="Slot Reel"
                          className="w-24 h-36 object-cover rounded-md opacity-85 shadow-lg"
                        />
                      ) : (
                        <div className="text-3xl">🎰</div>
                      )
                    )}
                  </div>
                ))}

                <div 
                  onClick={spinSlotMachine}
                  className="hidden md:block absolute -right-12 top-1/2 -translate-y-1/2 cursor-pointer z-30 group"
                  title="Puxar Alavanca para Girar!"
                >
                  <svg width="60" height="150" viewBox="0 0 60 150" className="overflow-visible">
                    <defs>
                      <linearGradient id="metalShaftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#71717a" />
                        <stop offset="35%" stopColor="#ffffff" />
                        <stop offset="70%" stopColor="#e4e4e7" />
                        <stop offset="100%" stopColor="#3f3f46" />
                      </linearGradient>
                      <radialGradient id="redKnobGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ff6b6b" />
                        <stop offset="50%" stopColor="#E50914" />
                        <stop offset="100%" stopColor="#660000" />
                      </radialGradient>
                    </defs>

                    <circle cx="30" cy="120" r="16" fill="#18181b" stroke="#52525b" strokeWidth="3" />
                    <circle cx="30" cy="120" r="7" fill="#09090b" />

                    <g 
                      style={{
                        transformOrigin: '30px 120px',
                        transform: leverPulled ? 'rotate(55deg)' : 'rotate(0deg)',
                        transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <rect 
                        x="25" 
                        y="22" 
                        width="10" 
                        height="98" 
                        rx="5"
                        fill="url(#metalShaftGrad)" 
                        stroke="#a1a1aa" 
                        strokeWidth="1"
                      />
                      <circle 
                        cx="30" 
                        cy="18" 
                        r="16" 
                        fill="url(#redKnobGrad)" 
                        stroke="#FFFFFF" 
                        strokeWidth="2.5" 
                        className="filter drop-shadow-[0_0_14px_#E50914] group-hover:brightness-125 transition-all"
                      />
                    </g>
                  </svg>
                </div>

              </div>

              <div className="mt-5 flex items-center justify-center">
                <button
                  onClick={spinSlotMachine}
                  disabled={isSlotSpinning}
                  className="flex items-center space-x-2 px-8 py-3 bg-[#E50914] hover:bg-red-700 text-white font-black text-sm md:text-base rounded-full shadow-[0_0_25px_rgba(229,9,20,0.6)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSlotSpinning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>GIRANDO SLOTS...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span>PUXAR ALAVANCA / GIRAR</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="w-full max-w-2xl bg-zinc-950 border-2 border-[#E50914] rounded-3xl p-5 shadow-[0_0_60px_rgba(229,9,20,0.5)] animate-scale-up my-auto">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
                <img 
                  src={`${IMG_POSTER_URL}${slotWinner.poster_path}`} 
                  alt={slotWinner.title || slotWinner.name}
                  className="w-32 h-48 object-cover rounded-xl shadow-2xl border border-zinc-800 shrink-0"
                />

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-[#E50914] font-black text-xs uppercase tracking-widest">
                    <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>TÍTULO SORTEADO!</span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {slotWinner.title || slotWinner.name}
                  </h3>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold">
                    <div className="flex items-center space-x-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded font-black text-xs">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                      <span>IMDb {slotWinner.vote_average ? slotWinner.vote_average.toFixed(1) : '8.0'}</span>
                    </div>
                    <span className="text-zinc-400">
                      {(slotWinner.release_date || slotWinner.first_air_date || '2025').substring(0, 4)}
                    </span>
                    <span className="border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                      {slotWinner.mediaType === 'movie' ? 'Filme' : 'Série'}
                    </span>
                  </div>

                  <p className="text-zinc-400 text-xs line-clamp-3 leading-relaxed">
                    {slotWinner.overview || "Sem descrição disponível."}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                    <button
                      onClick={() => {
                        setActiveFeature('');
                        openDetails(slotWinner.id, slotWinner.mediaType);
                      }}
                      className="flex items-center space-x-1.5 px-5 py-2 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-lg text-xs md:text-sm transition-colors cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Ver Detalhes & Assistir</span>
                    </button>

                    <button
                      onClick={() => { setSlotWinner(null); setShowConfetti(false); }}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs md:text-sm transition-colors cursor-pointer border border-zinc-700"
                    >
                      <RefreshCw className="w-4 h-4 text-yellow-400" />
                      <span>Girar Novamente</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VISÃO DEDICADA: RECURSO 2 - ROLETA 3D GIGANTE
          ========================================================================= */}
      {activeFeature === 'roulette' && (
        <div className="flex-1 flex flex-col md:flex-row justify-between items-center my-auto w-full max-w-5xl mx-auto gap-6 overflow-visible pt-4">
          
          <div className="w-full md:w-5/12 bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between h-full max-h-[460px] z-10">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-black text-white flex items-center space-x-2">
                    <Disc className="w-5 h-5 text-[#E50914]" />
                    <span>Gomos na Roleta ({rouletteItems.length})</span>
                  </h3>
                  {rouletteItems.length > 0 && (
                    <button 
                      onClick={clearRoulette} 
                      className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                <div className="relative mb-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={rouletteSearchQuery}
                      onChange={handleRouletteSearch}
                      placeholder="Buscar filme/série para adicionar..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-all"
                    />
                  </div>

                  {rouletteSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-48 overflow-y-auto">
                      {rouletteSearchResults.map(result => (
                        <div
                          key={result.id}
                          onClick={() => addItemToRoulette(result)}
                          className="flex items-center space-x-3 p-2 hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                          <img 
                            src={`${IMG_POSTER_URL}${result.poster_path}`} 
                            alt={result.title || result.name} 
                            className="w-7 h-10 object-cover rounded shadow"
                          />
                          <div className="flex-1 truncate">
                            <p className="text-xs font-bold text-white truncate">{result.title || result.name}</p>
                            <p className="text-[10px] text-zinc-500">{result.media_type === 'movie' ? 'Filme' : 'Série'}</p>
                          </div>
                          <span className="text-xs font-bold text-red-500 px-2">+ Add</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-52 pr-1 scrollbar-none">
                  {rouletteItems.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 text-xs font-medium">
                      Sua roleta está pronta com fatias de demonstração. Puxe da sua lista abaixo ou busque acima!
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rouletteItems.map((item, idx) => (
                        <div
                          key={`${item.id}_${idx}`}
                          className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm"
                        >
                          <span className="truncate max-w-[120px]">{item.title || item.name}</span>
                          <button
                            onClick={() => removeItemFromRoulette(item.id)}
                            className="text-zinc-500 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80">
                <button
                  onClick={importFromMyList}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  <BookmarkPlus className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>Puxar da Minha Lista ({myListCount} itens)</span>
                </button>
              </div>

            </div>
          </div>

          <div className="w-full md:w-7/12 flex flex-col items-center justify-center my-auto space-y-3 relative z-30 pt-6">
            
            {!rouletteWinner ? (
              <>
                <div className="relative flex items-center justify-center overflow-visible pt-4">
                  <div className="absolute top-1 z-50 flex flex-col items-center pointer-events-none">
                    <div className="w-0 h-0 border-x-[16px] border-x-transparent border-t-[32px] border-t-red-600 filter drop-shadow-[0_0_16px_#E50914]"></div>
                  </div>

                  <div className="p-3 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 border-4 border-red-600/50 rounded-full shadow-[0_0_60px_rgba(229,9,20,0.5)] overflow-visible relative z-40">
                    <div 
                      style={{
                        transform: `rotate(${rouletteRotation}deg)`,
                        transition: isRouletteSpinning ? 'transform 6s cubic-bezier(0.15, 0.99, 0.24, 1.0)' : 'none'
                      }}
                      className="rounded-full overflow-hidden flex items-center justify-center"
                    >
                      <canvas
                        ref={canvasRef}
                        width={480}
                        height={480}
                        className="rounded-full shadow-2xl max-w-[340px] max-h-[340px] md:max-w-[430px] md:max-h-[430px]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={spinRoulette}
                  disabled={isRouletteSpinning}
                  className="flex items-center space-x-2 px-10 py-3.5 bg-[#E50914] hover:bg-red-700 text-white font-black text-base rounded-full shadow-[0_0_30px_rgba(229,9,20,0.6)] transition-all cursor-pointer active:scale-95 disabled:opacity-50 relative z-50 mt-2"
                >
                  {isRouletteSpinning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>GIRANDO ROLETA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span>GIRAR ROLETA!</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="w-full max-w-xl bg-zinc-950 border-2 border-[#E50914] rounded-3xl p-5 shadow-[0_0_60px_rgba(229,9,20,0.5)] animate-scale-up my-auto z-50">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
                  
                  {rouletteWinner.poster_path && (
                    <img 
                      src={`${IMG_POSTER_URL}${rouletteWinner.poster_path}`} 
                      alt={rouletteWinner.title || rouletteWinner.name}
                      className="w-32 h-48 object-cover rounded-xl shadow-2xl border border-zinc-800 shrink-0"
                    />
                  )}

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-[#E50914] font-black text-xs uppercase tracking-widest">
                      <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span>ROLETA SORTEOU!</span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                      {rouletteWinner.title || rouletteWinner.name}
                    </h3>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold">
                      {rouletteWinner.vote_average && (
                        <div className="flex items-center space-x-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded font-black text-xs">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                          <span>IMDb {Number(rouletteWinner.vote_average).toFixed(1)}</span>
                        </div>
                      )}
                      {(rouletteWinner.release_date || rouletteWinner.type) && (
                        <span className="border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                          {rouletteWinner.type === 'movie' ? 'Filme' : 'Série'}
                        </span>
                      )}
                    </div>

                    <p className="text-zinc-400 text-xs line-clamp-3 leading-relaxed">
                      {rouletteWinner.overview || "Pronto para assistir ao sorteado!"}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                      <button
                        onClick={() => {
                          setActiveFeature('');
                          openDetails(rouletteWinner.id, rouletteWinner.type || 'movie');
                        }}
                        className="flex items-center space-x-1.5 px-5 py-2 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-lg text-xs md:text-sm transition-colors cursor-pointer shadow-lg"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Ver Detalhes & Assistir</span>
                      </button>

                      <button
                        onClick={() => { setRouletteWinner(null); setShowConfetti(false); }}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs md:text-sm transition-colors cursor-pointer border border-zinc-700"
                      >
                        <RefreshCw className="w-4 h-4 text-yellow-400" />
                        <span>Girar Novamente</span>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* =========================================================================
          VISÃO DEDICADA: RECURSO 3 - HUB DE ESTÚDIOS & ATORES
          ========================================================================= */}
      {activeFeature === 'discover' && (
        <div className="flex-1 flex flex-col justify-between items-center my-auto w-full max-w-6xl mx-auto overflow-hidden">
          
          {selectedStudio ? (
            <div className="w-full flex-1 flex flex-col justify-between overflow-hidden my-auto">
              
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-9 bg-white rounded-xl p-1 flex items-center justify-center shadow-lg">
                    <img 
                      src={selectedStudio.logo_path} 
                      alt={selectedStudio.name} 
                      className="max-h-6 max-w-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center space-x-2">
                      <span>Catálogo: {selectedStudio.name}</span>
                      <span className="bg-[#E50914] text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-md">
                        {studioMovies.length} Filmes
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">Lançamentos e produções da {selectedStudio.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudio(null)}
                  className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-red-600 text-white font-extrabold text-xs rounded-full transition-all cursor-pointer border border-zinc-700 shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar aos Estúdios</span>
                </button>
              </div>

              {loadingStudioMovies ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2 text-zinc-500">
                  <Loader2 className="w-9 h-9 animate-spin text-[#E50914]" />
                  <span className="text-xs font-extrabold text-zinc-400">Buscando produções da {selectedStudio.name}...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 overflow-y-auto max-h-[calc(100vh-12rem)] p-2 scrollbar-none">
                  {studioMovies.map(movie => (
                    <MediaCard
                      key={movie.id}
                      item={movie}
                      type="movie"
                      onClick={() => openDetails(movie.id, 'movie')}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : selectedActor ? (
            <div className="w-full flex-1 flex flex-col justify-between overflow-hidden my-auto">
              
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 shrink-0">
                <div className="flex items-center space-x-4">
                  {selectedActor.profile_path && (
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${selectedActor.profile_path}`} 
                      alt={selectedActor.name} 
                      className="w-12 h-12 object-cover rounded-full border-2 border-red-600 shadow-xl"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center space-x-2">
                      <span>Filmografia de {selectedActor.name}</span>
                      <span className="bg-[#E50914] text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-md">
                        {actorMovies.length} Filmes
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">Principais filmes com {selectedActor.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedActor(null)}
                  className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-red-600 text-white font-extrabold text-xs rounded-full transition-all cursor-pointer border border-zinc-700 shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar aos Atores</span>
                </button>
              </div>

              {loadingActorMovies ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2 text-zinc-500">
                  <Loader2 className="w-9 h-9 animate-spin text-[#E50914]" />
                  <span className="text-xs font-extrabold text-zinc-400">Carregando filmografia de {selectedActor.name}...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 overflow-y-auto max-h-[calc(100vh-12rem)] p-2 scrollbar-none">
                  {actorMovies.map(movie => (
                    <MediaCard
                      key={movie.id}
                      item={movie}
                      type="movie"
                      onClick={() => openDetails(movie.id, 'movie')}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col justify-around overflow-hidden my-auto space-y-1">
              
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="w-1.5 h-5 bg-[#E50914] rounded-full shadow-[0_0_10px_#E50914]"></div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">
                    Estúdios Populares (Em Destaque)
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {STUDIO_LIST.map(studio => (
                    <div
                      key={studio.id}
                      onClick={() => handleSelectStudio(studio)}
                      className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center h-32 md:h-36 border-2 border-zinc-800 hover:border-red-600 hover:shadow-[0_0_35px_rgba(229,9,20,0.6)] hover:scale-[1.04] transition-all cursor-pointer group shadow-xl"
                    >
                      {studio.logo_path ? (
                        <img 
                          src={studio.logo_path} 
                          alt={studio.name} 
                          className="max-h-16 max-w-[150px] object-contain group-hover:scale-108 transition-transform"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className="text-xs font-black text-zinc-950 mt-2 text-center truncate max-w-full">
                        {studio.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-1.5 h-5 bg-[#E50914] rounded-full shadow-[0_0_10px_#E50914]"></div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      Atores Populares & Elenco
                    </h3>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={actorSearchQuery}
                      onChange={handleActorSearch}
                      placeholder="Buscar ator ou atriz por nome..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {(actorSearchResults.length > 0 ? actorSearchResults : popularActors).slice(0, 6).map(actor => (
                    <div
                      key={actor.id}
                      onClick={() => handleSelectActor(actor)}
                      className="bg-zinc-900 border border-zinc-800/90 rounded-2xl overflow-hidden hover:border-red-600 hover:scale-[1.04] hover:shadow-[0_0_25px_rgba(229,9,20,0.4)] transition-all cursor-pointer group text-center p-2.5 shadow-lg"
                    >
                      {actor.profile_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${actor.profile_path}`} 
                          alt={actor.name} 
                          className="w-full h-40 md:h-44 object-cover rounded-xl shadow-md mb-2 group-hover:brightness-110 transition-all"
                        />
                      ) : (
                        <div className="w-full h-40 md:h-44 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 font-bold mb-2">
                          👤
                        </div>
                      )}
                      <p className="text-xs font-black text-white truncate group-hover:text-red-400 transition-colors">
                        {actor.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VISÃO DEDICADA: RECURSO 4 - DUELO 1V1 (TORNEIO MATA-MATA)
          ========================================================================= */}
      {activeFeature === 'duelo' && (
        <div className="flex-1 flex flex-col justify-between items-center my-auto w-full max-w-5xl mx-auto overflow-hidden">
          
          {dueloStage === 'setup' && (
            <div className="w-full max-w-2xl bg-zinc-950 border-2 border-red-600/50 rounded-3xl p-6 shadow-[0_0_60px_rgba(229,9,20,0.35)] flex flex-col items-center justify-center my-auto">
              
              <div className="w-16 h-16 bg-gradient-to-tr from-[#E50914] to-red-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_25px_rgba(229,9,20,0.6)] mb-4">
                <Swords className="w-9 h-9 animate-pulse" />
              </div>

              <h3 className="text-2xl font-black text-white tracking-wide mb-1">
                ⚔️ Duelo 1v1 - Torneio Mata-Mata
              </h3>
              <p className="text-zinc-400 text-xs text-center max-w-md mb-6 leading-relaxed">
                Confrontos diretos 1 contra 1! Vote em cada rodada entre dois títulos. O vencedor avança até sobrar o Campeão Supremo da Noite!
              </p>

              <div className="w-full space-y-4 max-w-md">
                
                <div>
                  <label className="block text-xs font-black text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Categoria do Torneio
                  </label>
                  <div className="flex space-x-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => setDueloType('movie')}
                      className={`flex-1 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        dueloType === 'movie' ? 'bg-[#E50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-4 h-4" />
                      <span>Filmes</span>
                    </button>
                    <button
                      onClick={() => setDueloType('tv')}
                      className={`flex-1 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        dueloType === 'tv' ? 'bg-[#E50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-4 h-4" />
                      <span>Séries</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Tamanho do Torneio
                  </label>
                  <div className="flex space-x-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => setDueloCount(8)}
                      className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        dueloCount === 8 ? 'bg-[#E50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      8 Participantes (Quartas)
                    </button>
                    <button
                      onClick={() => setDueloCount(16)}
                      className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        dueloCount === 16 ? 'bg-[#E50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      16 Participantes (Oitavas)
                    </button>
                  </div>
                </div>

                <button
                  onClick={startDueloTournament}
                  disabled={loadingDuelo}
                  className="w-full py-3.5 bg-[#E50914] hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-[0_0_30px_rgba(229,9,20,0.6)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 mt-4"
                >
                  {loadingDuelo ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>PREPARANDO CHAVES...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span>INICIAR TORNEIO MATA-MATA!</span>
                    </>
                  )}
                </button>

              </div>
            </div>
          )}

          {dueloStage === 'playing' && dueloItems.length >= 2 && (
            <div className="w-full flex-1 flex flex-col justify-between items-center my-auto">
              
              <div className="flex items-center justify-between w-full bg-zinc-950 border border-zinc-800 rounded-full px-6 py-2 shadow-xl mb-4">
                <span className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center">
                  <Trophy className="w-4 h-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                  {dueloItems.length === 2 ? '🔥 GRANDE FINAL!' : (dueloItems.length === 4 ? '⚡ SEMIFINAL' : `⚔️ RODADA DE ${dueloItems.length} PARTICIPANTES`)}
                </span>
                <span className="text-xs font-extrabold text-zinc-300">
                  Luta {Math.floor(matchIndex / 2) + 1} de {dueloItems.length / 2}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl my-auto relative">
                
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#E50914] border-4 border-zinc-950 rounded-full items-center justify-center z-30 shadow-[0_0_25px_#E50914] animate-pulse">
                  <span className="text-white font-black text-sm italic">VS</span>
                </div>

                {dueloItems[matchIndex] && (
                  <div 
                    onClick={() => handleVoteDuelo(dueloItems[matchIndex])}
                    className="bg-zinc-950 border-2 border-zinc-800 hover:border-red-600 rounded-3xl p-5 shadow-2xl hover:shadow-[0_0_40px_rgba(229,9,20,0.5)] hover:scale-[1.03] transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="relative">
                        <img 
                          src={`${IMG_POSTER_URL}${dueloItems[matchIndex].poster_path}`} 
                          alt={dueloItems[matchIndex].title || dueloItems[matchIndex].name}
                          className="w-44 h-64 object-cover rounded-2xl shadow-2xl border border-zinc-700 group-hover:border-red-500 transition-colors"
                        />
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-yellow-500/40 text-yellow-400 text-xs font-black flex items-center space-x-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                          <span>{dueloItems[matchIndex].vote_average ? Number(dueloItems[matchIndex].vote_average).toFixed(1) : '7.8'}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {dueloItems[matchIndex].title || dueloItems[matchIndex].name}
                        </h4>
                        <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                          {(dueloItems[matchIndex].release_date || dueloItems[matchIndex].first_air_date || '2025').substring(0, 4)}
                        </p>
                      </div>
                    </div>

                    <button className="w-full mt-4 py-2.5 bg-zinc-900 group-hover:bg-[#E50914] text-zinc-200 group-hover:text-white font-black text-xs rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-1.5">
                      <span>VOTAR NESTE 🏆</span>
                    </button>
                  </div>
                )}

                {dueloItems[matchIndex + 1] && (
                  <div 
                    onClick={() => handleVoteDuelo(dueloItems[matchIndex + 1])}
                    className="bg-zinc-950 border-2 border-zinc-800 hover:border-red-600 rounded-3xl p-5 shadow-2xl hover:shadow-[0_0_40px_rgba(229,9,20,0.5)] hover:scale-[1.03] transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="relative">
                        <img 
                          src={`${IMG_POSTER_URL}${dueloItems[matchIndex + 1].poster_path}`} 
                          alt={dueloItems[matchIndex + 1].title || dueloItems[matchIndex + 1].name}
                          className="w-44 h-64 object-cover rounded-2xl shadow-2xl border border-zinc-700 group-hover:border-red-500 transition-colors"
                        />
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-yellow-500/40 text-yellow-400 text-xs font-black flex items-center space-x-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                          <span>{dueloItems[matchIndex + 1].vote_average ? Number(dueloItems[matchIndex + 1].vote_average).toFixed(1) : '7.8'}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {dueloItems[matchIndex + 1].title || dueloItems[matchIndex + 1].name}
                        </h4>
                        <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                          {(dueloItems[matchIndex + 1].release_date || dueloItems[matchIndex + 1].first_air_date || '2025').substring(0, 4)}
                        </p>
                      </div>
                    </div>

                    <button className="w-full mt-4 py-2.5 bg-zinc-900 group-hover:bg-[#E50914] text-zinc-200 group-hover:text-white font-black text-xs rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-1.5">
                      <span>VOTAR NESTE 🏆</span>
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

          {dueloStage === 'winner' && dueloChampion && (
            <div className="w-full max-w-2xl bg-zinc-950 border-2 border-yellow-500 rounded-3xl p-6 shadow-[0_0_80px_rgba(234,179,8,0.4)] animate-scale-up my-auto">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
                <img 
                  src={`${IMG_POSTER_URL}${dueloChampion.poster_path}`} 
                  alt={dueloChampion.title || dueloChampion.name}
                  className="w-36 h-52 object-cover rounded-xl shadow-2xl border-2 border-yellow-500 shrink-0"
                />

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-yellow-400 font-black text-xs uppercase tracking-widest">
                    <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-bounce" />
                    <span>GRANDE CAMPEÃO DO TORNEIO!</span>
                  </div>

                  <h3 className="text-2xl font-black text-white leading-tight">
                    {dueloChampion.title || dueloChampion.name}
                  </h3>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold">
                    <div className="flex items-center space-x-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded font-black text-xs">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                      <span>IMDb {dueloChampion.vote_average ? Number(dueloChampion.vote_average).toFixed(1) : '8.5'}</span>
                    </div>
                    <span className="text-zinc-400">
                      {(dueloChampion.release_date || dueloChampion.first_air_date || '2025').substring(0, 4)}
                    </span>
                  </div>

                  <p className="text-zinc-400 text-xs line-clamp-3 leading-relaxed">
                    {dueloChampion.overview || "Grande vencedor invicto de todas as rodadas do duelo!"}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
                    <button
                      onClick={() => {
                        setActiveFeature('');
                        openDetails(dueloChampion.id, dueloType);
                      }}
                      className="flex items-center space-x-1.5 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs md:text-sm transition-colors cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Ver Detalhes & Assistir</span>
                    </button>

                    <button
                      onClick={() => { setDueloStage('setup'); setDueloChampion(null); setShowConfetti(false); }}
                      className="flex items-center space-x-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs md:text-sm transition-colors cursor-pointer border border-zinc-700"
                    >
                      <RefreshCw className="w-4 h-4 text-yellow-400" />
                      <span>Novo Duelo</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VISÃO DEDICADA: RECURSO 5 - INDICAÇÕES DO AMOR (SEM ROLAGEM + FILTRADO POR PERFIL)
          ========================================================================= */}
      {activeFeature === 'love' && (
        <div className="flex-1 flex flex-col justify-between items-center my-auto w-full max-w-4xl mx-auto overflow-hidden">
          
          {/* Seletor de Abas: Recebidos vs Enviar */}
          <div className="flex items-center justify-center space-x-3 bg-zinc-950 p-1.5 rounded-full border border-zinc-800 shadow-xl mb-3 w-full max-w-md shrink-0">
            <button
              onClick={() => setLoveTab('received')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                loveTab === 'received' ? 'bg-[#E50914] text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Indicações Recebidas ({loveRecommendations.length})</span>
            </button>

            <button
              onClick={() => setLoveTab('send')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                loveTab === 'send' ? 'bg-[#E50914] text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Indicação ❤️</span>
            </button>
          </div>

          {/* ABA 1: INDICAÇÕES RECEBIDAS STRICTAMENTE DO SEU PERFIL */}
          {loveTab === 'received' && (
            <div className="w-full flex-1 flex flex-col overflow-hidden my-auto">
              {loveRecommendations.length === 0 ? (
                <div className="my-auto text-center py-12 px-6 bg-zinc-950 border-2 border-red-600/30 rounded-3xl max-w-lg mx-auto shadow-2xl">
                  <div className="w-14 h-14 bg-red-600/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                    <Heart className="w-7 h-7 fill-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-1.5">Nenhuma indicação recebida neste perfil!</h3>
                  <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
                    Quando o outro perfil enviar uma indicação para você, ela aparecerá aqui!
                  </p>
                  <button
                    onClick={() => setLoveTab('send')}
                    className="px-6 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-extrabold text-xs rounded-full shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all cursor-pointer"
                  >
                    Enviar Indicação ao Outro Perfil ❤️
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1 scrollbar-none">
                  {loveRecommendations.map(rec => (
                    <div
                      key={rec.id}
                      className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#190507] border-2 border-red-600/40 rounded-2xl p-3 shadow-xl flex space-x-3 relative group"
                    >
                      <img 
                        src={`${IMG_POSTER_URL}${rec.item.poster_path}`} 
                        alt={rec.item.title} 
                        className="w-20 h-28 object-cover rounded-xl shadow-2xl border border-zinc-800 shrink-0"
                      />

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-full">
                              <Heart className="w-3 h-3 mr-1 fill-red-500 text-red-500" />
                              De: {rec.senderName || 'Meu amor'}
                            </span>
                            <button
                              onClick={() => handleDeleteLoveRec(rec.id)}
                              className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                              title="Excluir"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="text-sm font-black text-white leading-snug mt-1 truncate">
                            {rec.item.title}
                          </h4>

                          <div className="mt-1 bg-red-950/40 border border-red-800/40 rounded-xl p-1.5 text-xs text-pink-200 italic flex items-start space-x-1.5">
                            <MessageCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <p className="line-clamp-2 text-[11px]">"{rec.message}"</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveFeature('');
                            openDetails(rec.item.id, rec.item.media_type);
                          }}
                          className="w-full mt-1.5 py-1.5 bg-[#E50914] hover:bg-red-700 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Ver Detalhes & Assistir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: ENVIAR NOVA INDICAÇÃO (CAIXA DE TEXTO NO APELIDO + ZERO SCROLL FIT) */}
          {loveTab === 'send' && (
            <div className="w-full max-w-xl bg-zinc-950 border-2 border-red-600/50 rounded-3xl p-5 shadow-[0_0_60px_rgba(229,9,20,0.35)] flex flex-col justify-between my-auto">
              <div>
                <div className="flex items-center space-x-2 mb-2 border-b border-zinc-800/80 pb-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">Enviar Indicação Romântica</h3>
                    <p className="text-[10px] text-zinc-400">Monte seu cartão especial e envie para o outro perfil</p>
                  </div>
                </div>

                {/* 1. Buscar Filme ou Série */}
                <div className="relative mb-2.5">
                  <label className="block text-[10px] font-black text-zinc-300 mb-1 uppercase tracking-wider">
                    1. Buscar Filme ou Série
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loveSearchQuery}
                      onChange={handleLoveSearch}
                      placeholder="Digite o nome do filme..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-all"
                    />
                  </div>

                  {loveSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 shadow-2xl divide-y divide-zinc-800 max-h-40 overflow-y-auto">
                      {loveSearchResults.map(res => (
                        <div
                          key={res.id}
                          onClick={() => {
                            setSelectedLoveItem(res);
                            setLoveSearchResults([]);
                            setLoveSearchQuery(res.title || res.name);
                          }}
                          className="flex items-center space-x-3 p-2 hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                          <img 
                            src={`${IMG_POSTER_URL}${res.poster_path}`} 
                            alt={res.title || res.name} 
                            className="w-7 h-10 object-cover rounded shadow"
                          />
                          <div className="flex-1 truncate">
                            <p className="text-xs font-black text-white truncate">{res.title || res.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold">{(res.release_date || res.first_air_date || '2025').substring(0, 4)}</p>
                          </div>
                          <span className="text-xs font-bold text-red-500 px-2">Selecionar</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filme Selecionado Preview */}
                {selectedLoveItem && (
                  <div className="mb-2.5 bg-zinc-900 border border-red-600/40 rounded-xl p-1.5 flex items-center space-x-3">
                    <img 
                      src={`${IMG_POSTER_URL}${selectedLoveItem.poster_path}`} 
                      alt={selectedLoveItem.title || selectedLoveItem.name} 
                      className="w-7 h-10 object-cover rounded shadow"
                    />
                    <div className="flex-1 truncate">
                      <span className="text-[9px] font-black text-red-500 uppercase">Selecionado</span>
                      <p className="text-xs font-black text-white truncate">{selectedLoveItem.title || selectedLoveItem.name}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedLoveItem(null)} 
                      className="text-zinc-500 hover:text-white text-xs font-bold px-2"
                    >
                      Trocar
                    </button>
                  </div>
                )}

                {/* 2. Para Qual Perfil Está Mandando? */}
                <div className="mb-2.5">
                  <label className="block text-[10px] font-black text-zinc-300 mb-1 uppercase tracking-wider flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-red-500" />
                    <span>2. Para qual perfil você quer mandar?</span>
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {otherProfiles.length > 0 ? (
                      otherProfiles.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setTargetProfileName(p.name)}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                            targetProfileName === p.name 
                              ? 'bg-[#E50914] text-white border-red-500 shadow-md' 
                              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                          }`}
                        >
                          👤 Perfil: {p.name}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => setTargetProfileName('Meu amor')}
                        className="px-3 py-1 bg-[#E50914] text-white border border-red-500 rounded-lg text-xs font-black"
                      >
                        ❤️ Meu amor (Outro Perfil)
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Seu Apelido Carinhoso (CAIXA DE TEXTO + RÓTULOS RÁPIDOS) */}
                <div className="mb-2.5">
                  <label className="block text-[10px] font-black text-zinc-300 mb-1 uppercase tracking-wider">
                    3. Seu Apelido Carinhoso (Digite ou selecione)
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Digite seu nome/apelido carinhoso..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-all mb-1.5"
                  />
                  
                  {/* Single Horizontal Line of Suggestions */}
                  <div className="flex flex-nowrap space-x-1 overflow-x-auto scrollbar-none py-0.5">
                    {ROMANTIC_SUGGESTIONS.map(opt => (
                      <button
                        key={`sug_${opt}`}
                        onClick={() => setSenderName(opt)}
                        className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border ${
                          senderName === opt 
                            ? 'bg-red-600 text-white border-red-500' 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Recadinho Romântico */}
                <div className="mb-2">
                  <label className="block text-[10px] font-black text-zinc-300 mb-1 uppercase tracking-wider">
                    4. Seu Recadinho Carinhoso
                  </label>
                  <textarea
                    value={loveNote}
                    onChange={(e) => setLoveNote(e.target.value)}
                    placeholder="Ex: Amor, achei a nossa cara! Vamos assistir esse hoje à noite com pipoca? ❤️🍿"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-all resize-none"
                  />
                </div>

              </div>

              <button
                onClick={handleSendLoveRecommendation}
                className="w-full py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-[0_0_25px_rgba(229,9,20,0.6)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-95 uppercase tracking-wider mt-1"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>Enviar Indicação para "{targetProfileName || 'Meu amor'}" ❤️</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
