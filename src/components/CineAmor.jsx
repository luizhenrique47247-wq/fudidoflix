import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Youtube, 
  Play, 
  Trash2, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  PhoneOff, 
  Users, 
  Sparkles, 
  Film, 
  ListMusic, 
  Clock, 
  Volume2, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { 
  createRoom, 
  joinRoom, 
  subscribeToRoom, 
  sendWebRTCOffer, 
  sendWebRTCAnswer, 
  sendIceCandidate, 
  setScreenMode, 
  syncYouTubePlayer, 
  addVideoToQueue, 
  updateQueueList, 
  leaveRoom, 
  extractYouTubeId 
} from '../services/cineAmorService';
import { CineAmorWebRTC } from '../services/webrtcClient';

export default function CineAmor({ activeProfile, initialMedia = null, onClose = null }) {
  // Estados da Sala
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [inSession, setInSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Estados de Mídia e WebRTC
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fila do YouTube
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');

  // Refs
  const rtcRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const theaterContainerRef = useRef(null);
  const unsubscribeRoomRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const lastProcessedCandidateIndex = useRef(0);

  // Perfil do usuário atual
  const currentUser = {
    id: activeProfile?.id || 'user_' + Date.now(),
    name: activeProfile?.name || 'Eu',
    avatar: activeProfile?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(activeProfile?.name || 'Eu')}`
  };

  // Timer de Duração da Sessão
  useEffect(() => {
    if (inSession) {
      timerIntervalRef.current = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setSessionSeconds(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [inSession]);

  // Formata os segundos em HH:MM:SS
  const formatTimer = (totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // ========================================================================
  // INICIALIZAÇÃO DA SESSÃO E WEBRTC
  // ========================================================================

  const initWebRTC = (code, hostRole) => {
    if (rtcRef.current) return;

    const rtc = new CineAmorWebRTC({
      onRemoteStream: (stream) => {
        console.log('[CineAmor] Stream remoto recebido!');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onVoiceActivity: (isSpeaking) => {
        setLocalSpeaking(isSpeaking);
      },
      onIceCandidate: (candidate) => {
        sendIceCandidate(code, candidate, hostRole);
      },
      onConnectionState: (state) => {
        console.log('[CineAmor] WebRTC State:', state);
      }
    });

    rtcRef.current = rtc;

    // Ativa microfone com cancelamento de eco
    rtc.startMicrophone().catch(err => {
      console.warn('Microfone não ativado automaticamente:', err);
    });
  };

  // Criar nova Sessão
  const handleCreateSession = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const code = await createRoom({
        hostProfile: currentUser,
        initialMedia
      });

      setRoomCode(code);
      setIsHost(true);
      setInSession(true);

      // Inicia WebRTC como Host
      initWebRTC(code, true);

      // Escuta mudanças da sala
      subscribeToRoomData(code, true);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao criar sessão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Entrar em Sessão Existente
  const handleJoinSession = async (codeToJoin) => {
    const code = (codeToJoin || roomCode).trim().toUpperCase();
    if (!code || code.length !== 6) {
      setErrorMsg('Digite um código válido de 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await joinRoom(code, currentUser);
      setRoomCode(code);
      setIsHost(false);
      setInSession(true);

      // Inicia WebRTC como Convidado
      initWebRTC(code, false);

      // Escuta mudanças da sala
      subscribeToRoomData(code, false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao entrar na sessão.');
    } finally {
      setLoading(false);
    }
  };

  // Ouvir atualizações da sala no Firestore e coordenar o WebRTC
  const subscribeToRoomData = (code, hostRole) => {
    if (unsubscribeRoomRef.current) unsubscribeRoomRef.current();

    unsubscribeRoomRef.current = subscribeToRoom(code, async (data) => {
      if (!data || data.state === 'closed') {
        alert('A sessão de cinema foi encerrada.');
        handleLeaveSession(false);
        return;
      }

      setRoomData(data);

      const rtc = rtcRef.current;
      if (!rtc) return;

      // 1. HOST: Se o convidado entrou e ainda não enviou oferta
      if (hostRole && data.guest && !data.offer) {
        console.log('[CineAmor] Convidado entrou! Criando oferta WebRTC...');
        const offer = await rtc.createOffer();
        await sendWebRTCOffer(code, offer);
      }

      // 2. GUEST: Recebeu oferta do Host e ainda não respondeu
      if (!hostRole && data.offer && !data.answer) {
        console.log('[CineAmor] Oferta do Host recebida! Criando resposta WebRTC...');
        const answer = await rtc.createAnswer(data.offer);
        await sendWebRTCAnswer(code, answer);
      }

      // 3. HOST: Recebeu a resposta do Guest
      if (hostRole && data.answer && rtc.pc && rtc.pc.remoteDescription === null) {
        console.log('[CineAmor] Resposta do Guest recebida! Estabelecendo conexão...');
        await rtc.setRemoteAnswer(data.answer);
      }

      // 4. ICE Candidates
      const candidatesToProcess = hostRole ? data.guestCandidates : data.hostCandidates;
      if (candidatesToProcess && candidatesToProcess.length > lastProcessedCandidateIndex.current) {
        for (let i = lastProcessedCandidateIndex.current; i < candidatesToProcess.length; i++) {
          await rtc.addIceCandidate(candidatesToProcess[i]);
        }
        lastProcessedCandidateIndex.current = candidatesToProcess.length;
      }
    });
  };

  // Sair ou Encerrar Sessão
  const handleLeaveSession = async (notifyFirebase = true) => {
    if (unsubscribeRoomRef.current) {
      unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = null;
    }

    if (rtcRef.current) {
      rtcRef.current.destroy();
      rtcRef.current = null;
    }

    if (notifyFirebase && roomCode) {
      await leaveRoom(roomCode, isHost);
    }

    setInSession(false);
    setRoomData(null);
    setRoomCode('');
    setIsSharingScreen(false);
    setIsMuted(false);
    lastProcessedCandidateIndex.current = 0;
  };

  // ========================================================================
  // CONTROLES DE MÍDIA (MICROFONE E TELA)
  // ========================================================================

  const handleToggleMute = () => {
    if (rtcRef.current) {
      const muted = rtcRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!rtcRef.current) return;

    if (isSharingScreen) {
      rtcRef.current.stopScreenShare();
      setIsSharingScreen(false);
      setScreenMode(roomCode, 'screen', null);
    } else {
      try {
        const stream = await rtcRef.current.startScreenShare();
        setIsSharingScreen(true);
        setScreenMode(roomCode, 'screen', currentUser.id);

        // Se o usuário fechar pelo botão flutuante nativo do navegador
        stream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          setScreenMode(roomCode, 'screen', null);
        };
      } catch (err) {
        alert('Para transmitir com som, selecione a tela/aba e confirme o áudio do sistema.');
      }
    }
  };

  // Copiar código da sala
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Alternar tela cheia do auditório
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      theaterContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ========================================================================
  // FILA DO YOUTUBE
  // ========================================================================

  const handleAddYouTubeVideo = async (e) => {
    e.preventDefault();
    const id = extractYouTubeId(youtubeInputUrl);
    if (!id) {
      alert('Link inválido do YouTube. Use formatos como https://www.youtube.com/watch?v=... ou https://youtu.be/...');
      return;
    }

    const newItem = {
      id,
      url: youtubeInputUrl,
      title: `Vídeo do YouTube (${id})`,
      addedBy: currentUser.name
    };

    // Se não tiver nenhum tocando, já toca esse imediatamente
    const isCurrentlyEmpty = !roomData?.youtube?.videoId;

    if (isCurrentlyEmpty) {
      await updateQueueList(roomCode, [], newItem);
      await setScreenMode(roomCode, 'youtube');
    } else {
      await addVideoToQueue(roomCode, newItem);
    }

    setYoutubeInputUrl('');
  };

  const handlePlayNextYouTube = async () => {
    const queue = roomData?.youtube?.playlist || [];
    if (queue.length > 0) {
      const nextVideo = queue[0];
      const remainingQueue = queue.slice(1);
      await updateQueueList(roomCode, remainingQueue, nextVideo);
    } else {
      await updateQueueList(roomCode, [], { id: '', title: '' });
      await setScreenMode(roomCode, 'screen');
    }
  };

  const handleRemoveQueueItem = async (indexToRemove) => {
    const queue = roomData?.youtube?.playlist || [];
    const updated = queue.filter((_, idx) => idx !== indexToRemove);
    await updateQueueList(roomCode, updated);
  };

  // Identificação dos parceiros
  const hostUser = roomData?.host || (isHost ? currentUser : null);
  const guestUser = roomData?.guest || (!isHost ? currentUser : null);
  const partnerUser = isHost ? guestUser : hostUser;
  const currentMode = roomData?.currentMode || 'screen';
  const youtubeVideoId = roomData?.youtube?.videoId || '';

  // ========================================================================
  // RENDERIZAÇÃO
  // ========================================================================

  return (
    <div 
      ref={theaterContainerRef} 
      className="min-h-screen bg-[#0a0608] text-white relative flex flex-col select-none overflow-x-hidden font-sans"
    >
      {/* Luzes Sunburst Retrô e Partículas Douradas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-rose-950/20 to-black pointer-events-none z-0"></div>

      {/* ================================================================== */}
      {/* 1. LOBBY (QUANDO NÃO ESTÁ EM SESSÃO) */}
      {/* ================================================================== */}
      {!inSession ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 max-w-4xl mx-auto w-full">
          {onClose && (
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* Letreiro Marquee de Cinema */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-3.5 h-3.5" />
              Sessão a Dois
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)]">
              🍿 CINE AMOR
            </h1>
            <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-lg mx-auto">
              Assista a filmes e séries com tela compartilhada e som em alta definição ou curta uma playlist sincronizada do YouTube.
            </p>
          </div>

          {errorMsg && (
            <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cards de Criação e Entrada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Card 1: Criar Sessão */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-amber-500/20 hover:border-amber-500/40 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between backdrop-blur-md transition-all group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                  <Film className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Criar Sessão</h2>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6">
                  Inicie uma sala exclusiva. Você receberá um código de 6 dígitos para compartilhar com seu par.
                </p>
              </div>

              <button
                onClick={handleCreateSession}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E50914] to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Preparando...' : '🎬 Iniciar Sala'}
              </button>
            </div>

            {/* Card 2: Entrar em Sessão */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 hover:border-zinc-700 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between backdrop-blur-md transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Entrar em Sessão</h2>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-4">
                  Recebeu um código de convite? Digite abaixo para se conectar à sessão existente.
                </p>

                <input
                  type="text"
                  maxLength={6}
                  placeholder="EX: K9B3XZ"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  className="w-full bg-black/60 border border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-3 text-center text-xl font-black tracking-[0.3em] text-white placeholder-zinc-700 focus:outline-none transition-colors mb-4"
                />
              </div>

              <button
                onClick={() => handleJoinSession(roomCode)}
                disabled={loading || roomCode.length !== 6}
                className="w-full py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Conectando...' : 'Entrar na Sala'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================================================================== */
        /* 2. AUDITÓRIO DO CINEMA (DENTRO DA SESSÃO) */
        /* ================================================================== */
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
          
          {/* TOPO: Informações da Sessão e Código */}
          <header className="h-16 px-6 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between backdrop-blur-md">
            {/* Lado Esquerdo: Identificação */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍿</span>
              <div>
                <span className="text-sm font-black tracking-wider text-amber-300 uppercase block">Cine Amor</span>
                <span className="text-[11px] text-zinc-500 font-mono">Sessão a Dois</span>
              </div>
            </div>

            {/* Centro: Código da Sala e Botão de Copiar */}
            <div className="flex items-center gap-2 bg-black/50 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-zinc-400">Código:</span>
              <span className="text-sm font-black font-mono tracking-widest text-amber-400">{roomCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-1 text-zinc-400 hover:text-amber-400 transition-colors ml-1"
                title="Copiar código para enviar"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Lado Direito: Temporizador e Sair */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{formatTimer(sessionSeconds)}</span>
              </div>

              <button
                onClick={() => handleLeaveSession(true)}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Encerrar</span>
              </button>
            </div>
          </header>

          {/* PALCO CENTRAL (TELÃO DE CINEMA) */}
          <main className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 relative overflow-hidden bg-black/40">
            
            {/* Seletor de Telão (Tela Compartilhada vs YouTube) */}
            <div className="absolute top-4 z-20 flex bg-zinc-950/80 border border-zinc-800 rounded-full p-1 backdrop-blur-md shadow-lg">
              <button
                onClick={() => setScreenMode(roomCode, 'screen')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  currentMode === 'screen' 
                    ? 'bg-amber-500 text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Tela Compartilhada
              </button>

              <button
                onClick={() => setScreenMode(roomCode, 'youtube')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  currentMode === 'youtube' 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                YouTube Sincronizado
              </button>
            </div>

            {/* TELÃO MODO 1: COMPARTILHAMENTO DE TELA */}
            {currentMode === 'screen' && (
              <div className="w-full h-full max-w-6xl max-h-[82vh] bg-black rounded-2xl border border-zinc-800/80 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative flex items-center justify-center">
                
                {/* Elemento de Vídeo Remoto (Tela do parceiro com som!) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-contain ${roomData?.screenBroadcaster && roomData.screenBroadcaster !== currentUser.id ? 'block' : 'hidden'}`}
                />

                {/* Se você mesmo estiver transmitindo */}
                {isSharingScreen && (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Monitor className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Você está transmitindo sua tela!</h3>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                      Seu par está assistindo ao filme e ouvindo o áudio da sua máquina com qualidade original.
                    </p>
                    <button
                      onClick={handleToggleScreenShare}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Parar Transmissão
                    </button>
                  </div>
                )}

                {/* Se ninguém estiver transmitindo ainda */}
                {!isSharingScreen && (!roomData?.screenBroadcaster || roomData.screenBroadcaster === currentUser.id) && (
                  <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                      <Film className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Telão do Cinema Pronto</h3>
                    <p className="text-zinc-400 text-xs md:text-sm mb-6 leading-relaxed">
                      Clique abaixo para compartilhar o filme do seu PC. <br />
                      <strong className="text-amber-300">Dica:</strong> Marque a opção <em>"Compartilhar áudio do sistema/aba"</em> para o som sair com perfeição!
                    </p>

                    <button
                      onClick={handleToggleScreenShare}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                    >
                      <Monitor className="w-4 h-4" />
                      Compartilhar Minha Tela
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TELÃO MODO 2: YOUTUBE SINCRONIZADO */}
            {currentMode === 'youtube' && (
              <div className="w-full h-full max-w-6xl max-h-[82vh] bg-black rounded-2xl border border-zinc-800/80 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative flex flex-col items-center justify-center">
                {youtubeVideoId ? (
                  <iframe
                    ref={youtubePlayerRef}
                    src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                    title="YouTube Video Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-600/40 text-red-500 flex items-center justify-center mx-auto mb-4">
                      <Youtube className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum vídeo tocando no momento</h3>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                      Abra a fila abaixo e adicione o link de qualquer vídeo do YouTube para assistirem juntos.
                    </p>
                    <button
                      onClick={() => setShowQueueDrawer(true)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Adicionar Vídeo à Fila
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BALCÃO DOS USUÁRIOS (CARDS FLUTUANTES DOS PARTICIPANTES) */}
            <div className="absolute bottom-24 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
              
              {/* Usuário 1 (Você) */}
              <div className={`pointer-events-auto bg-zinc-950/90 border p-2.5 rounded-2xl flex items-center gap-3 backdrop-blur-md shadow-xl transition-all ${
                localSpeaking ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-zinc-800'
              }`}>
                <div className="relative">
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-xl object-cover bg-zinc-800" />
                  {isMuted && (
                    <div className="absolute -bottom-1 -right-1 p-0.5 bg-red-600 rounded-full text-white">
                      <MicOff className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{currentUser.name} (Você)</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">● Conectado</span>
                </div>
              </div>

              {/* Usuário 2 (Parceiro) */}
              <div className={`pointer-events-auto bg-zinc-950/90 border p-2.5 rounded-2xl flex items-center gap-3 backdrop-blur-md shadow-xl transition-all ${
                remoteSpeaking ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-zinc-800'
              }`}>
                {partnerUser ? (
                  <>
                    <img src={partnerUser.avatar} alt={partnerUser.name} className="w-10 h-10 rounded-xl object-cover bg-zinc-800" />
                    <div>
                      <span className="text-xs font-bold text-white block">{partnerUser.name}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">● Na Sessão</span>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-1 text-center">
                    <span className="text-xs font-bold text-amber-400 block animate-pulse">Aguardando par...</span>
                    <span className="text-[10px] text-zinc-500">Passe o código: {roomCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* BARRA DE CONTROLES PRINCIPAL */}
            <div className="absolute bottom-6 z-30 flex items-center gap-3 bg-zinc-950/90 border border-zinc-800 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md">
              {/* Microfone */}
              <button
                onClick={handleToggleMute}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isMuted 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
                title={isMuted ? 'Ativar Microfone' : 'Mutar Microfone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Compartilhar Tela */}
              <button
                onClick={handleToggleScreenShare}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isSharingScreen 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
                title={isSharingScreen ? 'Parar Tela' : 'Transmitir Tela (com áudio)'}
              >
                {isSharingScreen ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>

              {/* Fila do YouTube */}
              <button
                onClick={() => setShowQueueDrawer(true)}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer relative"
                title="Fila de Vídeos do YouTube"
              >
                <ListMusic className="w-5 h-5" />
                {(roomData?.youtube?.playlist?.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {roomData.youtube.playlist.length}
                  </span>
                )}
              </button>

              {/* Fullscreen */}
              <button
                onClick={handleToggleFullscreen}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
                title="Tela Cheia"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </main>

          {/* ================================================================ */}
          {/* GAVETA / MODAL DA FILA DO YOUTUBE */}
          {/* ================================================================ */}
          {showQueueDrawer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
                
                {/* Fechar */}
                <button
                  onClick={() => setShowQueueDrawer(false)}
                  className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <Youtube className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-bold text-white">Fila do YouTube Sincronizada</h3>
                </div>

                {/* Campo de Adicionar Link */}
                <form onSubmit={handleAddYouTubeVideo} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Cole o link do YouTube (ex: https://youtu.be/...)"
                    value={youtubeInputUrl}
                    onChange={(e) => setYoutubeInputUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </form>

                {/* Lista de Reprodução */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {/* Vídeo Atual */}
                  {youtubeVideoId && (
                    <div className="p-3 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`} 
                          alt="Thumbnail" 
                          className="w-14 h-9 object-cover rounded-lg"
                        />
                        <div>
                          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Tocando Agora</span>
                          <span className="text-xs text-white font-semibold">ID: {youtubeVideoId}</span>
                        </div>
                      </div>

                      <button
                        onClick={handlePlayNextYouTube}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Próximo
                      </button>
                    </div>
                  )}

                  {/* Fila */}
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Próximos da Lista:</span>
                  
                  {(!roomData?.youtube?.playlist || roomData.youtube.playlist.length === 0) ? (
                    <p className="text-zinc-600 text-xs text-center py-6">Nenhum vídeo na fila. Cole um link acima!</p>
                  ) : (
                    roomData.youtube.playlist.map((item, index) => (
                      <div key={index} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`} 
                            alt="Thumbnail" 
                            className="w-12 h-8 object-cover rounded-lg"
                          />
                          <div>
                            <span className="text-xs font-medium text-white block">{item.title}</span>
                            <span className="text-[10px] text-zinc-500">Por {item.addedBy}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveQueueItem(index)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
