/**
 * ============================================================================
 * 🍿 CineAmor WebRTC Client
 * Suporte a Áudio Bidirecional (Microfone com Cancelamento de Eco)
 * Compartilhamento de Tela em Alta Qualidade COM ÁUDIO DO FILME
 * Servidores STUN + TURN Gratuitos Inclusos (Zero tela preta em 4G/Firewalls)
 * ============================================================================
 */

export const RTC_CONFIG = {
  iceServers: [
    // Servidores STUN do Google
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Servidores TURN Gratuitos (OpenRelay / Metered) para atravessar 4G e Firewall
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

export class CineAmorWebRTC {
  constructor({ onRemoteStream, onRemoteAudio, onVoiceActivity, onIceCandidate, onConnectionState }) {
    this.pc = null;
    this.localMicStream = null;
    this.localScreenStream = null;
    this.remoteStream = new MediaStream();
    
    // Callbacks
    this.onRemoteStream = onRemoteStream || (() => {});
    this.onRemoteAudio = onRemoteAudio || (() => {});
    this.onVoiceActivity = onVoiceActivity || (() => {});
    this.onIceCandidate = onIceCandidate || (() => {});
    this.onConnectionState = onConnectionState || (() => {});

    // Audio Analysis (Detecção de voz falando)
    this.audioContext = null;
    this.analyser = null;
    this.voiceInterval = null;
    this.isMuted = false;

    // Track senders para troca dinâmica de tela
    this.screenVideoSender = null;
    this.screenAudioSender = null;
    this.micSender = null;
  }

  /**
   * Inicializa o RTCPeerConnection
   */
  initPeerConnection() {
    if (this.pc) return;

    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate(event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Estado da conexão:', this.pc.connectionState);
      this.onConnectionState(this.pc.connectionState);
    };

    // Recebe faixas de mídia remotas (áudio da pessoa, vídeo da tela, áudio do filme)
    this.pc.ontrack = (event) => {
      console.log('[WebRTC] Faixa remota recebida:', event.track.kind);
      
      if (event.streams && event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      } else {
        this.remoteStream.addTrack(event.track);
        this.onRemoteStream(this.remoteStream);
      }
    };
  }

  /**
   * Inicia o microfone local com cancelamento de eco
   */
  async startMicrophone() {
    try {
      this.initPeerConnection();

      this.localMicStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const audioTrack = this.localMicStream.getAudioTracks()[0];
      if (audioTrack && this.pc) {
        this.micSender = this.pc.addTrack(audioTrack, this.localMicStream);
      }

      this.setupVoiceDetection(this.localMicStream);
      return this.localMicStream;
    } catch (err) {
      console.warn('[WebRTC] Permissão de microfone negada ou indisponível:', err);
      return null;
    }
  }

  /**
   * Alterna microfone (Mudo / Ativo)
   */
  toggleMute() {
    if (!this.localMicStream) return false;
    const track = this.localMicStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.isMuted = !track.enabled;
      return this.isMuted;
    }
    return false;
  }

  /**
   * Inicia compartilhamento de tela com captura de áudio do filme
   */
  async startScreenShare() {
    try {
      this.initPeerConnection();

      // Solicita tela + áudio do sistema/aba
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          // Desativa supressões para o som do filme sair em alta fidelidade!
          suppressLocalAudioPlayback: false,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      const audioTrack = this.localScreenStream.getAudioTracks()[0];

      if (videoTrack) {
        // Envia o vídeo da tela para o peer
        this.screenVideoSender = this.pc.addTrack(videoTrack, this.localScreenStream);

        // Se o usuário parar de compartilhar pelo aviso do navegador
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      if (audioTrack) {
        // Envia o áudio do filme para o parceiro ouvir com você!
        this.screenAudioSender = this.pc.addTrack(audioTrack, this.localScreenStream);
      }

      return this.localScreenStream;
    } catch (err) {
      console.warn('[WebRTC] Cancelou ou falhou compartilhamento de tela:', err);
      throw err;
    }
  }

  /**
   * Encerra compartilhamento de tela
   */
  stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(t => t.stop());
      this.localScreenStream = null;
    }
    if (this.pc) {
      if (this.screenVideoSender) {
        try { this.pc.removeTrack(this.screenVideoSender); } catch (_) {}
        this.screenVideoSender = null;
      }
      if (this.screenAudioSender) {
        try { this.pc.removeTrack(this.screenAudioSender); } catch (_) {}
        this.screenAudioSender = null;
      }
    }
  }

  /**
   * HOST: Cria a Oferta SDP
   */
  async createOffer() {
    this.initPeerConnection();
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * GUEST: Recebe a Oferta e Cria a Resposta SDP
   */
  async createAnswer(remoteOffer) {
    this.initPeerConnection();
    await this.pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    const answer = await this.pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * HOST: Finaliza a conexão aplicando a resposta do Guest
   */
  async setRemoteAnswer(remoteAnswer) {
    if (!this.pc || this.pc.signalingState === 'stable') return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(remoteAnswer));
  }

  /**
   * Adiciona ICE Candidate recebido
   */
  async addIceCandidate(candidate) {
    if (!this.pc || !candidate) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] Erro ao adicionar ICE candidate:', err);
    }
  }

  /**
   * Analisador de áudio para acender o contorno verde/dourado quando alguém falar
   */
  setupVoiceDetection(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.voiceInterval = setInterval(() => {
        if (this.isMuted) {
          this.onVoiceActivity(false);
          return;
        }
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        // Limiar de fala perceptível
        this.onVoiceActivity(average > 15);
      }, 150);
    } catch (_) {}
  }

  /**
   * Encerra e limpa tudo
   */
  destroy() {
    this.stopScreenShare();
    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach(t => t.stop());
      this.localMicStream = null;
    }
    if (this.voiceInterval) {
      clearInterval(this.voiceInterval);
      this.voiceInterval = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
