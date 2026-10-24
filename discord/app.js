// Import do Trystero via Nostr (Sinalização P2P ultrarrápida sem servidor)
import { joinRoom } from 'https://esm.sh/trystero@0.20.1/nostr';

// Chave padrão oficial do Hyperbeam configurada para o Cine Amor
const HYPERBEAM_DEFAULT_API_KEY = 'sk_live_32jD_MopTyCDqizIviENzu3NxtocjYSu8cN3xhXRoTE';

// --- Estado Global ---
const state = {
  inCall: false,
  joinedAt: null,
  assignedRole: 'Usuário 1',
  callStartTime: null,
  callTimerInterval: null,
  isMuted: false,
  isDeafened: false,
  isCameraOn: false,
  isScreenSharing: false,
  isVirtualBrowserActive: false,
  virtualBrowserEmbedUrl: null,
  virtualBrowserSessionId: null,
  isSpeaking: false,
  isAlarmPlaying: false,

  user: {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: 'Usuário 1',
    customName: localStorage.getItem('cinema_user_name') || '',
    avatarUrl: localStorage.getItem('cinema_avatar_url') || '',
    color: localStorage.getItem('cinema_user_color') || '#7c3aed',
    room: (window.location.hash.slice(1) || localStorage.getItem('cinema_room_code') || 'meu-coracao').trim()
  },

  localStream: null,
  screenStream: null,
  room: null,
  sendPresence: null,
  sendSpeaking: null,
  sendAlarm: null,
  peers: {},
  alarmOscillators: [],
  alarmGainNode: null,
  pinnedUser: null
};

const TRYSTERO_CONFIG = {
  appId: 'cine-amor-p2p-vip',
  relayUrls: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://nostr.mom',
    'wss://nostr.bitcoiner.social',
    'wss://nostr.oxtr.dev'
  ],
  rtcConfig: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
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
    ]
  }
};

// --- Efeitos Sonoros (Web Audio API) ---
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSfx(type) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'join') {
      const notes = [587.33, 739.99, 932.33, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.48);
      });

    } else if (type === 'leave') {
      const notes = [932.33, 739.99, 587.33];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.12, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.42);
      });

    } else if (type === 'mute') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

    } else if (type === 'unmute') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

    } else if (type === 'deafen_on') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

    } else if (type === 'deafen_off') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

    } else if (type === 'camera_on') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);

    } else if (type === 'camera_off') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);

    } else if (type === 'screen_on') {
      [523.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.38);
      });

    } else if (type === 'screen_off') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(250, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (err) {
    console.warn('Som ignorado:', err);
  }
}

// --- ALARME ACORDAR (Sirene Alta e Intensa) ---
function playAlarmSound() {
  if (state.isAlarmPlaying) return;
  state.isAlarmPlaying = true;

  try {
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
    masterGain.connect(ctx.destination);
    state.alarmGainNode = masterGain;

    // Sirene 1 (sawtooth varrida)
    const siren1 = ctx.createOscillator();
    siren1.type = 'sawtooth';
    siren1.frequency.setValueAtTime(440, ctx.currentTime);
    const sirenGain1 = ctx.createGain();
    sirenGain1.gain.setValueAtTime(0.5, ctx.currentTime);
    siren1.connect(sirenGain1);
    sirenGain1.connect(masterGain);
    siren1.start();

    function sirenSweep() {
      if (!state.isAlarmPlaying) return;
      const t = ctx.currentTime;
      siren1.frequency.linearRampToValueAtTime(1200, t + 0.5);
      siren1.frequency.linearRampToValueAtTime(440, t + 1.0);
      setTimeout(sirenSweep, 1000);
    }
    sirenSweep();

    // Sirene 2 (square pulsante)
    const siren2 = ctx.createOscillator();
    siren2.type = 'square';
    siren2.frequency.setValueAtTime(880, ctx.currentTime);
    const sirenGain2 = ctx.createGain();
    sirenGain2.gain.setValueAtTime(0.3, ctx.currentTime);
    siren2.connect(sirenGain2);
    sirenGain2.connect(masterGain);
    siren2.start();

    function pulseGain() {
      if (!state.isAlarmPlaying) return;
      const t = ctx.currentTime;
      sirenGain2.gain.linearRampToValueAtTime(0.4, t + 0.15);
      sirenGain2.gain.linearRampToValueAtTime(0.05, t + 0.3);
      setTimeout(pulseGain, 300);
    }
    pulseGain();

    // Bipe 3 (agudo rápido)
    const beep = ctx.createOscillator();
    beep.type = 'sine';
    beep.frequency.setValueAtTime(1800, ctx.currentTime);
    const beepGain = ctx.createGain();
    beepGain.gain.setValueAtTime(0, ctx.currentTime);
    beep.connect(beepGain);
    beepGain.connect(masterGain);
    beep.start();

    function beepPulse() {
      if (!state.isAlarmPlaying) return;
      const t = ctx.currentTime;
      beepGain.gain.linearRampToValueAtTime(0.35, t + 0.05);
      beepGain.gain.linearRampToValueAtTime(0, t + 0.1);
      setTimeout(beepPulse, 200);
    }
    beepPulse();

    state.alarmOscillators = [siren1, siren2, beep];

    // Para automaticamente após 10 segundos
    setTimeout(() => {
      stopAlarmSound();
    }, 10000);

  } catch (err) {
    console.warn('Erro no alarme:', err);
    state.isAlarmPlaying = false;
  }
}

function stopAlarmSound() {
  state.isAlarmPlaying = false;
  state.alarmOscillators.forEach(osc => {
    try { osc.stop(); } catch(e) {}
  });
  state.alarmOscillators = [];
  if (state.alarmGainNode) {
    try { state.alarmGainNode.disconnect(); } catch(e) {}
    state.alarmGainNode = null;
  }
  const wakeBtn = document.getElementById('wakeUpBtn');
  if (wakeBtn) wakeBtn.classList.remove('ringing');
}

// --- Elementos do DOM ---
const elements = {
  callTimerBadge: document.getElementById('callTimerBadge'),
  callTimerDigits: document.getElementById('callTimerDigits'),
  audienceSidebar: document.getElementById('audienceSidebar'),

  lobbySection: document.getElementById('lobbySection'),
  lobbyMyAvatar: document.getElementById('lobbyMyAvatar'),
  lobbyMyName: document.getElementById('lobbyMyName'),
  lobbyHerAvatar: document.getElementById('lobbyHerAvatar'),
  lobbyHerName: document.getElementById('lobbyHerName'),
  herStatusDot: document.getElementById('herStatusDot'),
  enterCallBtn: document.getElementById('enterCallBtn'),
  lobbyCopyBtn: document.getElementById('lobbyCopyBtn'),

  callGrid: document.getElementById('callGrid'),
  mainStageSlot: document.getElementById('mainStageSlot'),
  mainCinemaScreen: document.getElementById('mainCinemaScreen'),
  screenShareVideo: document.getElementById('screenShareVideo'),
  projectorStandby: document.getElementById('projectorStandby'),
  standbyScreenShareBtn: document.getElementById('standbyScreenShareBtn'),
  screenOverlayControls: document.getElementById('screenOverlayControls'),
  screenFullscreenBtn: document.getElementById('screenFullscreenBtn'),
  screenExitFullscreenBtn: document.getElementById('screenExitFullscreenBtn'),

  localSlot: document.getElementById('localSlot'),
  localTile: document.getElementById('localTile'),
  localVideo: document.getElementById('localVideo'),
  localAvatarPlaceholder: document.getElementById('localAvatarPlaceholder'),
  localBigAvatar: document.getElementById('localBigAvatar'),
  localMetaName: document.getElementById('localMetaName'),
  localMutedBadge: document.getElementById('localMutedBadge'),

  remoteSlot: document.getElementById('remoteSlot'),
  remoteCamSlot: document.getElementById('remoteCamSlot'),
  remoteVideo: document.getElementById('remoteVideo'),
  remoteAudio: document.getElementById('remoteAudio'),
  remoteAvatarPlaceholder: document.getElementById('remoteAvatarPlaceholder'),
  remoteBigAvatar: document.getElementById('remoteBigAvatar'),
  remoteMetaName: document.getElementById('remoteMetaName'),
  remoteMutedBadge: document.getElementById('remoteMutedBadge'),
  remoteSpeakingNeon: document.getElementById('remoteSpeakingNeon'),

  dockContainer: document.getElementById('dockContainer'),
  toggleCameraBtn: document.getElementById('toggleCameraBtn'),
  toggleScreenBtn: document.getElementById('toggleScreenBtn'),
  toggleMicBtn: document.getElementById('toggleMicBtn'),
  toggleDeafenBtn: document.getElementById('toggleDeafenBtn'),
  wakeUpBtn: document.getElementById('wakeUpBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),

  profileModal: document.getElementById('profileModal'),
  closeProfileModal: document.getElementById('closeProfileModal'),
  cancelProfileBtn: document.getElementById('cancelProfileBtn'),
  saveProfileBtn: document.getElementById('saveProfileBtn'),
  usernameInput: document.getElementById('usernameInput'),
  avatarUrlInput: document.getElementById('avatarUrlInput'),
  roomNameInput: document.getElementById('roomNameInput'),
  colorPickerGrid: document.getElementById('colorPickerGrid'),

  // Navegador Virtual na Telona
  virtualBrowserWrapper: document.getElementById('virtualBrowserWrapper'),
  virtualBrowserIframe: document.getElementById('virtualBrowserIframe'),
  closeVirtualBrowserBtn: document.getElementById('closeVirtualBrowserBtn'),

  // Modais de Escolha de Projeção & Hyperbeam
  projectionChoiceModal: document.getElementById('projectionChoiceModal'),
  closeProjectionChoiceModal: document.getElementById('closeProjectionChoiceModal'),
  cancelProjectionChoiceBtn: document.getElementById('cancelProjectionChoiceBtn'),
  chooseScreenShareCard: document.getElementById('chooseScreenShareCard'),
  chooseVirtualBrowserCard: document.getElementById('chooseVirtualBrowserCard'),

  hyperbeamConfigModal: document.getElementById('hyperbeamConfigModal'),
  closeHyperbeamModal: document.getElementById('closeHyperbeamModal'),
  cancelHyperbeamBtn: document.getElementById('cancelHyperbeamBtn'),
  startHyperbeamBtn: document.getElementById('startHyperbeamBtn'),
  hbApiKeyInput: document.getElementById('hbApiKeyInput'),
  hbEmbedUrlInput: document.getElementById('hbEmbedUrlInput'),

  toast: document.getElementById('toast')
};

// --- Temporizador de Ociosidade para Tela Cheia (Auto-hide) ---
let fullscreenIdleTimer = null;

function resetFullscreenIdleTimer() {
  if (!document.fullscreenElement) return;

  elements.callGrid.classList.remove('fullscreen-idle');
  if (elements.mainCinemaScreen) {
    elements.mainCinemaScreen.classList.remove('fullscreen-idle');
  }

  if (fullscreenIdleTimer) {
    clearTimeout(fullscreenIdleTimer);
  }

  fullscreenIdleTimer = setTimeout(() => {
    if (document.fullscreenElement) {
      elements.callGrid.classList.add('fullscreen-idle');
      if (elements.mainCinemaScreen) {
        elements.mainCinemaScreen.classList.add('fullscreen-idle');
      }
    }
  }, 3000); // 3 segundos sem mexer o mouse oculta os controles e o cursor
}

// --- Inicialização ---
function init() {
  updateUserRolesAndVisuals();

  elements.enterCallBtn.addEventListener('click', joinCall);
  elements.disconnectBtn.addEventListener('click', leaveCall);

  elements.toggleMicBtn.addEventListener('click', toggleMute);
  elements.toggleDeafenBtn.addEventListener('click', toggleDeafen);
  elements.toggleCameraBtn.addEventListener('click', toggleCamera);
  elements.toggleScreenBtn.addEventListener('click', handleProjectionBtnClick);
  elements.standbyScreenShareBtn.addEventListener('click', handleProjectionBtnClick);

  // Modais de Escolha da Projeção & Hyperbeam
  if (elements.closeProjectionChoiceModal) {
    elements.closeProjectionChoiceModal.addEventListener('click', () => { playSfx('click'); closeProjectionChoiceModal(); });
  }
  if (elements.cancelProjectionChoiceBtn) {
    elements.cancelProjectionChoiceBtn.addEventListener('click', () => { playSfx('click'); closeProjectionChoiceModal(); });
  }
  if (elements.chooseScreenShareCard) {
    elements.chooseScreenShareCard.addEventListener('click', () => {
      playSfx('click');
      closeProjectionChoiceModal();
      toggleScreenShare();
    });
  }
  if (elements.chooseVirtualBrowserCard) {
    elements.chooseVirtualBrowserCard.addEventListener('click', () => {
      playSfx('click');
      closeProjectionChoiceModal();
      openVirtualBrowserFlow();
    });
  }

  if (elements.closeHyperbeamModal) {
    elements.closeHyperbeamModal.addEventListener('click', () => { playSfx('click'); closeHyperbeamConfigModal(); });
  }
  if (elements.cancelHyperbeamBtn) {
    elements.cancelHyperbeamBtn.addEventListener('click', () => { playSfx('click'); closeHyperbeamConfigModal(); });
  }
  if (elements.startHyperbeamBtn) {
    elements.startHyperbeamBtn.addEventListener('click', handleStartHyperbeamSubmit);
  }

  // Fechar Navegador Virtual na Telona
  if (elements.closeVirtualBrowserBtn) {
    elements.closeVirtualBrowserBtn.addEventListener('click', () => {
      playSfx('click');
      unmountVirtualBrowser(true);
    });
  }

  const movieVolumeSlider = document.getElementById('movieVolumeSlider');
  if (movieVolumeSlider) {
    movieVolumeSlider.addEventListener('input', (e) => {
      if (elements.screenShareVideo) {
        elements.screenShareVideo.volume = parseFloat(e.target.value);
      }
    });
  }

  // ACORDAR!
  elements.wakeUpBtn.addEventListener('click', () => {
    playSfx('click');
    triggerWakeAlarm();
  });

  // Copiar link no lobby
  if (elements.lobbyCopyBtn) {
    elements.lobbyCopyBtn.addEventListener('click', () => { playSfx('click'); copyRoomLink(); });
  }

  // Tela cheia da transmissão com acesso ao menu e auto-hide (mesmo botão dentro e fora de tela cheia)
  elements.screenFullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playSfx('click');
    if (document.fullscreenElement) {
      exitMovieFullscreen();
    } else {
      enterMovieFullscreen();
    }
  });

  if (elements.screenExitFullscreenBtn) {
    elements.screenExitFullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfx('click');
      exitMovieFullscreen();
    });
  }

  // Dois cliques na telona de vídeo ou no palco alternam tela cheia
  elements.screenShareVideo.addEventListener('dblclick', () => {
    if (document.fullscreenElement) {
      exitMovieFullscreen();
    } else {
      enterMovieFullscreen();
    }
  });

  elements.mainCinemaScreen.addEventListener('dblclick', (e) => {
    if (e.target.closest('.screen-overlay-controls') || e.target.closest('button') || e.target.closest('input')) return;
    if (document.fullscreenElement) {
      exitMovieFullscreen();
    } else {
      enterMovieFullscreen();
    }
  });

  // Movimento de mouse na telona ativa/desativa auto-hide
  elements.callGrid.addEventListener('mousemove', resetFullscreenIdleTimer);
  elements.callGrid.addEventListener('mousedown', resetFullscreenIdleTimer);
  elements.callGrid.addEventListener('touchstart', resetFullscreenIdleTimer);
  elements.mainCinemaScreen.addEventListener('mousemove', resetFullscreenIdleTimer);
  elements.mainCinemaScreen.addEventListener('mousedown', resetFullscreenIdleTimer);
  elements.mainCinemaScreen.addEventListener('touchstart', resetFullscreenIdleTimer);

  // Monitorar mudanças no status de tela cheia
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  // Modal de Perfil (se estiver presente)
  if (elements.profileSettingsBtn) {
    elements.profileSettingsBtn.addEventListener('click', () => { playSfx('click'); openProfileModal(); });
    if (elements.closeProfileModal) elements.closeProfileModal.addEventListener('click', () => { playSfx('click'); closeProfileModal(); });
    if (elements.cancelProfileBtn) elements.cancelProfileBtn.addEventListener('click', () => { playSfx('click'); closeProfileModal(); });
    if (elements.saveProfileBtn) elements.saveProfileBtn.addEventListener('click', () => { playSfx('click'); saveProfileModal(); });
  }

  // Cores do Modal (.color-circle)
  if (elements.colorPickerGrid) {
    elements.colorPickerGrid.querySelectorAll('.color-circle').forEach(dot => {
      dot.addEventListener('click', () => {
        playSfx('click');
        elements.colorPickerGrid.querySelectorAll('.color-circle').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });
  }

  // Alternar com a Telona ao clicar diretamente no card do participante (fora ou em tela cheia)
  if (elements.localTile) {
    elements.localTile.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfx('click');
      togglePinSwap('local');
    });
  }

  if (elements.remoteCamSlot) {
    elements.remoteCamSlot.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfx('click');
      togglePinSwap('remote');
    });
  }

  // Clicar na telona quando ela estiver miniaturizada como card lateral também desfaz a troca
  elements.mainCinemaScreen.addEventListener('click', (e) => {
    if (elements.mainCinemaScreen.classList.contains('as-side-card')) {
      e.stopPropagation();
      playSfx('click');
      if (state.pinnedUser) {
        togglePinSwap(state.pinnedUser);
      }
    }
  });
}

function handleFullscreenChange() {
  const isFS = !!document.fullscreenElement;
  if (elements.screenFullscreenBtn) {
    elements.screenFullscreenBtn.style.display = isFS ? 'none' : 'flex';
  }
  if (elements.screenExitFullscreenBtn) {
    elements.screenExitFullscreenBtn.style.display = isFS ? 'flex' : 'none';
  }
  if (!isFS) {
    elements.callGrid.classList.remove('fullscreen-idle');
    if (elements.mainCinemaScreen) {
      elements.mainCinemaScreen.classList.remove('fullscreen-idle');
    }
    if (fullscreenIdleTimer) {
      clearTimeout(fullscreenIdleTimer);
      fullscreenIdleTimer = null;
    }
  } else {
    resetFullscreenIdleTimer();
  }
}

// --- Fixar / Alternar Câmera com a Telona ---
function togglePinSwap(target) {
  if (!elements.mainStageSlot || !elements.localSlot || !elements.remoteSlot) return;

  const isLocal = target === 'local';
  const targetCard = isLocal ? elements.localTile : elements.remoteCamSlot;
  const targetSlot = isLocal ? elements.localSlot : elements.remoteSlot;

  if (!targetCard) return;

  // Se já está fixado esse participante, desafixa e volta ao normal
  if (state.pinnedUser === target) {
    targetSlot.appendChild(targetCard);
    elements.mainStageSlot.appendChild(elements.mainCinemaScreen);

    targetCard.classList.remove('as-main-screen');
    elements.mainCinemaScreen.classList.remove('as-side-card');

    state.pinnedUser = null;
    showToast('🎬 Telona restaurada para o filme!');
  } else {
    // Se o outro estava fixado antes, restaura ele para o slot dele primeiro
    if (state.pinnedUser) {
      const prevIsLocal = state.pinnedUser === 'local';
      const prevCard = prevIsLocal ? elements.localTile : elements.remoteCamSlot;
      const prevSlot = prevIsLocal ? elements.localSlot : elements.remoteSlot;

      if (prevCard && prevSlot) {
        prevSlot.appendChild(prevCard);
        prevCard.classList.remove('as-main-screen');
      }
    }

    // Coloca a câmera selecionada no palco principal e a telona no slot lateral
    elements.mainStageSlot.appendChild(targetCard);
    targetSlot.appendChild(elements.mainCinemaScreen);

    targetCard.classList.add('as-main-screen');
    elements.mainCinemaScreen.classList.add('as-side-card');

    state.pinnedUser = target;
    showToast(isLocal ? '📌 Sua câmera foi para a telona principal!' : '📌 Câmera do parceiro foi para a telona principal!');
  }

  // Garantir que as streams de vídeo continuem reproduzindo após mover nós no DOM
  if (elements.screenShareVideo && elements.screenShareVideo.srcObject) {
    elements.screenShareVideo.play().catch(() => {});
  }
  if (elements.localVideo && elements.localVideo.srcObject) {
    elements.localVideo.play().catch(() => {});
  }
  if (elements.remoteVideo && elements.remoteVideo.srcObject) {
    elements.remoteVideo.play().catch(() => {});
  }
}



// --- ACORDAR: Alarme local + enviar para o parceiro ---
function triggerWakeAlarm() {
  playAlarmSound();
  elements.wakeUpBtn.classList.add('ringing');

  if (state.sendAlarm) {
    state.sendAlarm({ action: 'wake' });
  }

  showToast('⏰ ACORDAAAA! Alarme ativado com volume máximo!');
}

// --- Algoritmo de Usuário 1 & Usuário 2 ---
function resolveUserRoles() {
  const peerIds = Object.keys(state.peers);
  if (peerIds.length === 0) {
    state.assignedRole = 'Usuário 1';
  } else {
    const otherId = peerIds[0];
    const otherPeer = state.peers[otherId];
    const myTime = state.joinedAt || Infinity;
    const otherTime = otherPeer.joinedAt || Infinity;

    if (myTime < otherTime || (myTime === otherTime && state.user.id < otherId)) {
      state.assignedRole = 'Usuário 1';
      otherPeer.assignedRole = 'Usuário 2';
    } else {
      state.assignedRole = 'Usuário 2';
      otherPeer.assignedRole = 'Usuário 1';
    }
  }

  updateUserRolesAndVisuals();
  updateRemoteCard();
}

function updateUserRolesAndVisuals() {
  const displayName = state.user.customName || state.assignedRole;
  state.user.name = displayName;

  elements.lobbyMyName.textContent = displayName;
  elements.localMetaName.textContent = displayName === 'Usuário 1' ? 'U1 (Você)' : 'U2 (Você)';

  const roleShort = state.assignedRole === 'Usuário 1' ? 'U1' : 'U2';
  if (state.user.avatarUrl) {
    const imgHtml = `<img src="${state.user.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    elements.lobbyMyAvatar.innerHTML = imgHtml;
    elements.localBigAvatar.innerHTML = imgHtml;
    elements.lobbyMyAvatar.style.background = 'transparent';
    elements.localBigAvatar.style.background = 'transparent';
  } else {
    elements.lobbyMyAvatar.textContent = roleShort;
    elements.localBigAvatar.textContent = roleShort;
    elements.lobbyMyAvatar.style.background = state.user.color;
    elements.localBigAvatar.style.background = state.user.color;
  }

  updateLobbyPartnerState();
  window.location.hash = state.user.room;
}

function updateLobbyPartnerState() {
  const peerIds = Object.keys(state.peers);
  if (peerIds.length > 0) {
    const peer = state.peers[peerIds[0]];
    const peerName = peer.customName || peer.assignedRole || (state.assignedRole === 'Usuário 1' ? 'Usuário 2' : 'Usuário 1');
    const peerRoleShort = peer.assignedRole === 'Usuário 1' ? 'U1' : 'U2';

    elements.lobbyHerName.textContent = peerName;
    elements.herStatusDot.className = 'chair-lamp online';

    if (peer.avatarUrl) {
      elements.lobbyHerAvatar.innerHTML = `<img src="${peer.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      elements.lobbyHerAvatar.style.background = 'transparent';
    } else {
      elements.lobbyHerAvatar.textContent = peerRoleShort;
      elements.lobbyHerAvatar.style.background = peer.color || '#e11d48';
    }
  } else {
    const expectedOtherRole = state.assignedRole === 'Usuário 1' ? 'Usuário 2' : 'Usuário 1';
    elements.lobbyHerName.textContent = expectedOtherRole;
    elements.herStatusDot.className = 'chair-lamp waiting';
    elements.lobbyHerAvatar.textContent = expectedOtherRole === 'Usuário 2' ? 'U2' : 'U1';
    elements.lobbyHerAvatar.style.background = 'linear-gradient(135deg, #e11d48, #9f1239)';
  }
}

function updateRemoteCard() {
  const peerIds = Object.keys(state.peers);
  if (peerIds.length === 0) return;

  const peer = state.peers[peerIds[0]];
  const peerRoleShort = peer.assignedRole === 'Usuário 1' ? 'U1' : 'U2';

  elements.remoteMetaName.textContent = peerRoleShort;

  if (peer.avatarUrl) {
    elements.remoteBigAvatar.innerHTML = `<img src="${peer.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    elements.remoteBigAvatar.style.background = 'transparent';
  } else {
    elements.remoteBigAvatar.textContent = peerRoleShort;
    elements.remoteBigAvatar.style.background = peer.color || '#e11d48';
  }

  elements.remoteMutedBadge.style.display = peer.isMuted ? 'inline' : 'none';
}

// --- Toast ---
function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 3500);
}

function copyRoomLink() {
  const url = `${window.location.origin}${window.location.pathname}#${state.user.room}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('🎟️ Ingresso copiado! Mande para seu amor.');
  }).catch(() => {
    prompt('Copie o link abaixo para compartilhar:', url);
  });
}

// --- Cronômetro ---
function startCallTimer() {
  state.callStartTime = Date.now();
  if (elements.callTimerBadge) {
    elements.callTimerBadge.style.display = 'flex';
  }
  if (elements.callTimerDigits) {
    elements.callTimerDigits.textContent = '00:00:00';
  }

  if (state.callTimerInterval) clearInterval(state.callTimerInterval);
  state.callTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.callStartTime) / 1000);
    const hrs = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    if (elements.callTimerDigits) {
      elements.callTimerDigits.textContent =
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function stopCallTimer() {
  if (state.callTimerInterval) {
    clearInterval(state.callTimerInterval);
    state.callTimerInterval = null;
  }
  if (elements.callTimerBadge) {
    elements.callTimerBadge.style.display = 'none';
  }
}

// --- Entrar na Sessão ---
async function joinCall() {
  try {
    const clapperArm = document.querySelector('.clapper-arm');
    if (clapperArm) {
      clapperArm.style.animation = 'clapperSnap 0.3s ease-in-out';
    }

    state.joinedAt = Date.now();

    // 1. Tenta inicializar o microfone de forma suave (se o navegador já tiver ocupado ou der erro, entra mesmo assim)
    try {
      state.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      setupVoiceDetector(state.localStream);
      state.isMuted = false;
      if (elements.toggleMicBtn) {
        elements.toggleMicBtn.classList.remove('muted');
      }
    } catch (micErr) {
      console.warn('Microfone não pôde ser ativado ao entrar (ocupado por outra aba/app ou sem permissão):', micErr);
      state.localStream = null;
      state.isMuted = true;
      if (elements.toggleMicBtn) {
        elements.toggleMicBtn.classList.add('muted');
      }
      showToast('⚠️ Microfone ocupado ou bloqueado. Entrou no modo ouvinte!');
    }

    playSfx('join');

    // 2. Conecta na sala P2P (Trystero)
    state.room = joinRoom(TRYSTERO_CONFIG, state.user.room);

    const [sendPresence, onPresence] = state.room.makeAction('presence');
    const [sendSpeaking, onSpeaking] = state.room.makeAction('speaking');
    const [sendAlarm, onAlarm] = state.room.makeAction('alarm');
    const [sendRoomFull, onRoomFull] = state.room.makeAction('room_full');
    const [sendScreenSync, onScreenSync] = state.room.makeAction('screensync');
    const [sendVirtualBrowserSync, onVirtualBrowserSync] = state.room.makeAction('vb_sync');

    state.sendPresence = sendPresence;
    state.sendSpeaking = sendSpeaking;
    state.sendAlarm = sendAlarm;
    state.sendRoomFull = sendRoomFull;
    state.sendScreenSync = sendScreenSync;
    state.sendVirtualBrowserSync = sendVirtualBrowserSync;

    // Sincronização do Navegador Virtual entre o casal
    onVirtualBrowserSync((data, peerId) => {
      if (data.active && data.embedUrl) {
        mountVirtualBrowser(data.embedUrl, false);
        showToast('🌐 O parceiro abriu o Navegador Virtual na telona!');
      } else {
        unmountVirtualBrowser(false);
      }
    });

    // Se este usuário for o 3º tentando entrar em uma sala já com 2 pessoas
    onRoomFull((data, peerId) => {
      console.warn('Sala lotada. Apenas 2 participantes permitidos.');
      leaveCall();
      alert('🚫 Sala cheia! Esta sessão de cinema exclusiva permite apenas 2 participantes (o casal VIP).');
    });

    // Quando o parceiro clica em ACORDAR
    onAlarm((data, peerId) => {
      if (data.action === 'wake') {
        playAlarmSound();
        const wakeBtn = document.getElementById('wakeUpBtn');
        if (wakeBtn) wakeBtn.classList.add('ringing');
        showToast('⏰ SEU AMOR ESTÁ TE ACORDANDO!!!');
      }
    });

    // Sincronização explícita de tela (evita confusão de câmera com tela compartilhada)
    onScreenSync((data, peerId) => {
      if (state.peers[peerId]) {
        state.peers[peerId].isSharingScreen = data.active;
        state.peers[peerId].screenStreamId = data.streamId;
      }
      if (data.active) {
        elements.mainCinemaScreen.classList.add('live');
      } else {
        elements.mainCinemaScreen.classList.remove('live');
        elements.screenShareVideo.srcObject = null;
      }
    });

    // Garante que o card do parceiro só aparece se ele REALMENTE estiver na call
    if (elements.remoteCamSlot) {
      elements.remoteCamSlot.style.display = 'none';
    }

    state.room.onPeerJoin(async peerId => {
      const currentPeers = Object.keys(state.peers);
      // REGRA: Apenas 2 usuários permitidos na call. Se já existe 1 parceiro diferente, rejeita o 3º!
      if (currentPeers.length >= 1 && !state.peers[peerId]) {
        console.warn('Tentativa de 3º usuário rejeitada:', peerId);
        sendRoomFull({ reason: 'full' }, peerId);
        return;
      }

      const isNewPeer = !state.peers[peerId];
      if (isNewPeer) {
        console.log('Novo parceiro conectou:', peerId);
        playSfx('join');
      }

      if (!state.peers[peerId]) {
        state.peers[peerId] = {
          name: 'Usuário 2',
          color: '#e11d48',
          avatarUrl: '',
          isMuted: false,
          isCameraOn: false,
          isSharingScreen: false,
          streamAdded: false
        };
      }

      // O OUTRO USUÁRIO SÓ APARECE LA SE REALMENTE TIVER NA CALL
      if (elements.remoteCamSlot) {
        elements.remoteCamSlot.style.display = 'block';
      }

      // Envia áudio local apenas se ainda não foi adicionado para este peer
      if (!state.peers[peerId].streamAdded && state.localStream) {
        state.peers[peerId].streamAdded = true;
        try {
          await state.room.addStream(state.localStream, peerId, { type: 'mic' });
        } catch (err) {
          console.warn('Aviso ao sincronizar áudio com parceiro:', err?.message || err);
        }
      }

      if (state.screenStream) {
        try {
          await state.room.addStream(state.screenStream, peerId, { type: 'screen' });
        } catch (err) {
          console.warn('Aviso ao sincronizar transmissão de tela:', err?.message || err);
        }
      }

      if (state.isVirtualBrowserActive && state.virtualBrowserEmbedUrl && state.sendVirtualBrowserSync) {
        state.sendVirtualBrowserSync({ active: true, embedUrl: state.virtualBrowserEmbedUrl }, peerId);
      }

      broadcastPresence();
      resolveUserRoles();
    });

    state.room.onPeerLeave(peerId => {
      console.log('Parceiro saiu:', peerId);
      playSfx('leave');
      delete state.peers[peerId];
      if (elements.remoteAudio) elements.remoteAudio.srcObject = null;
      elements.remoteVideo.srcObject = null;
      elements.remoteAvatarPlaceholder.style.display = 'flex';
      elements.mainCinemaScreen.classList.remove('live');
      elements.screenShareVideo.srcObject = null;

      // Se o parceiro estava fixado no palco principal, desafixa antes de ocultar
      if (state.pinnedUser === 'remote') {
        togglePinSwap('remote');
      }

      // Oculta o card pois o parceiro saiu da call
      if (elements.remoteCamSlot) {
        elements.remoteCamSlot.style.display = 'none';
      }

      resolveUserRoles();
    });

    state.room.onPeerStream((stream, peerId, metadata) => {
      handleRemoteStream(stream, peerId, metadata);
    });

    state.room.onPeerTrack((track, stream, peerId, metadata) => {
      handleRemoteTrack(track, stream, peerId, metadata);
    });

    onPresence((data, peerId) => {
      if (!state.peers[peerId]) state.peers[peerId] = {};
      const prevCam = state.peers[peerId].isCameraOn;
      const prevScreen = state.peers[peerId].isSharingScreen;
      state.peers[peerId] = { ...state.peers[peerId], ...data };

      if (data.left || data.inCall === false) {
        delete state.peers[peerId];
        if (elements.remoteAudio) elements.remoteAudio.srcObject = null;
        elements.remoteVideo.srcObject = null;
        elements.remoteAvatarPlaceholder.style.display = 'flex';
        elements.mainCinemaScreen.classList.remove('live');
        elements.screenShareVideo.srcObject = null;
        if (elements.remoteCamSlot) elements.remoteCamSlot.style.display = 'none';
        if (state.pinnedUser === 'remote') {
          togglePinSwap('remote');
        }
        resolveUserRoles();
        return;
      }

      if (data.isCameraOn === false && prevCam !== false) {
        elements.remoteVideo.srcObject = null;
        elements.remoteAvatarPlaceholder.style.display = 'flex';
      }

      if (data.isSharingScreen === false && prevScreen !== false) {
        elements.mainCinemaScreen.classList.remove('live');
        elements.screenShareVideo.srcObject = null;
      }

      if (data.isVirtualBrowserActive && data.virtualBrowserEmbedUrl && !state.isVirtualBrowserActive) {
        mountVirtualBrowser(data.virtualBrowserEmbedUrl, false);
      }

      resolveUserRoles();
    });

    onSpeaking((data, peerId) => {
      if (state.peers[peerId]) {
        state.peers[peerId].isSpeaking = data.isSpeaking;
        if (data.isSpeaking) {
          elements.remoteCamSlot.classList.add('speaking');
        } else {
          elements.remoteCamSlot.classList.remove('speaking');
        }
      }
    });

    state.inCall = true;
    startCallTimer();
    elements.lobbySection.style.display = 'none';
    elements.callGrid.style.display = 'flex';
    elements.dockContainer.style.display = 'flex';

    resolveUserRoles();
    broadcastPresence();

    showToast(`🍿 Poltrona ocupada! Você é o ${state.assignedRole}.`);
  } catch (err) {
    console.error('Erro ao conectar na sala:', err);
    showToast('⚠️ Erro ao entrar: ' + (err.message || 'tente recarregar'));
  }
}

// --- Sair da Sessão ---
function leaveCall() {
  playSfx('leave');
  stopCallTimer();
  stopAlarmSound();

  if (state.vadInterval) {
    clearInterval(state.vadInterval);
    state.vadInterval = null;
  }

  if (document.fullscreenElement) {
    exitMovieFullscreen();
  }

  // Notifica o parceiro imediatamente via WebRTC antes de fechar a sala
  if (state.sendScreenSync) {
    try {
      state.sendScreenSync({ active: false });
    } catch (e) {}
  }

  if (state.sendVirtualBrowserSync) {
    try {
      state.sendVirtualBrowserSync({ active: false });
    } catch (e) {}
  }

  if (state.isVirtualBrowserActive) {
    unmountVirtualBrowser(false);
  }

  if (state.sendPresence) {
    try {
      state.sendPresence({
        name: state.user.name,
        customName: state.user.customName,
        assignedRole: state.assignedRole,
        inCall: false,
        isCameraOn: false,
        isSharingScreen: false,
        left: true
      });
    } catch (e) {}
  }

  // Interrompe qualquer transmissão de tela ativa e libera o navegador imediatamente
  if (state.screenStream) {
    try {
      if (state.room) {
        state.room.removeStream(state.screenStream);
      }
    } catch (e) {}
    try {
      state.screenStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {}
    state.screenStream = null;
  }

  // Interrompe microfone e câmera
  if (state.localStream) {
    try {
      state.localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {}
    state.localStream = null;
  }

  // Interrompe e limpa qualquer stream residual nos elementos HTML
  [elements.localVideo, elements.remoteVideo, elements.screenShareVideo, elements.remoteAudio].forEach(el => {
    if (el && el.srcObject) {
      try {
        if (el.srcObject.getTracks) {
          el.srcObject.getTracks().forEach(t => t.stop());
        }
      } catch (e) {}
      el.srcObject = null;
    }
  });

  if (state.room) {
    try {
      state.room.leave();
    } catch (e) {}
    state.room = null;
  }

  state.inCall = false;
  state.joinedAt = null;
  state.isCameraOn = false;
  state.isScreenSharing = false;
  state.isMuted = false;
  state.isDeafened = false;
  state.peers = {};
  state.sendAlarm = null;
  state.sendScreenSync = null;

  elements.lobbySection.style.display = 'flex';
  elements.callGrid.style.display = 'none';
  elements.dockContainer.style.display = 'none';

  elements.mainCinemaScreen.classList.remove('live');
  elements.localAvatarPlaceholder.style.display = 'flex';
  elements.remoteAvatarPlaceholder.style.display = 'flex';
  if (elements.remoteCamSlot) {
    elements.remoteCamSlot.style.display = 'none';
  }

  elements.toggleCameraBtn.classList.remove('active');
  elements.toggleScreenBtn.classList.remove('active');
  elements.toggleMicBtn.classList.remove('muted');
  elements.toggleDeafenBtn.classList.remove('muted');

  // Se havia alguém fixado na telona, restaura para o layout padrão
  if (state.pinnedUser) {
    if (elements.localSlot && elements.localTile) {
      elements.localSlot.appendChild(elements.localTile);
      elements.localTile.classList.remove('as-main-screen');
    }
    if (elements.remoteSlot && elements.remoteCamSlot) {
      elements.remoteSlot.appendChild(elements.remoteCamSlot);
      elements.remoteCamSlot.classList.remove('as-main-screen');
    }
    if (elements.mainStageSlot && elements.mainCinemaScreen) {
      elements.mainStageSlot.appendChild(elements.mainCinemaScreen);
      elements.mainCinemaScreen.classList.remove('as-side-card');
    }
    state.pinnedUser = null;
  }

  resolveUserRoles();
}

function broadcastPresence() {
  if (!state.sendPresence) return;
  state.sendPresence({
    name: state.user.name,
    customName: state.user.customName,
    assignedRole: state.assignedRole,
    joinedAt: state.joinedAt,
    color: state.user.color,
    avatarUrl: state.user.avatarUrl,
    isMuted: state.isMuted,
    isDeafened: state.isDeafened,
    isCameraOn: state.isCameraOn,
    isSharingScreen: state.isScreenSharing,
    screenStreamId: state.screenStream ? state.screenStream.id : null,
    isVirtualBrowserActive: state.isVirtualBrowserActive,
    virtualBrowserEmbedUrl: state.virtualBrowserEmbedUrl
  });
}

// --- Detector de Voz ---
function setupVoiceDetector(stream) {
  if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    // CRÍTICO PARA ELIMINAR O CHIADO / CLIQUES "titititi":
    // O Chromium requer um nó de saída conectado ao destination para manter a taxa de amostragem
    // do WebAudio sincronizada com o hardware e evitar estouro de buffer (buffer underrun).
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    analyser.connect(silentGain);
    silentGain.connect(ctx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceTimer = null;

    if (state.vadInterval) {
      clearInterval(state.vadInterval);
      state.vadInterval = null;
    }

    // Intervalo de 100ms: elimina sobrecarga da thread de áudio e impede rajadas de pacotes a 60 FPS
    state.vadInterval = setInterval(() => {
      if (!state.inCall || state.isMuted) {
        if (state.isSpeaking) {
          setLocalSpeaking(false);
        }
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;

      if (avg > 14) {
        if (!state.isSpeaking) {
          setLocalSpeaking(true);
        }
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (state.isSpeaking && !silenceTimer) {
        silenceTimer = setTimeout(() => {
          setLocalSpeaking(false);
          silenceTimer = null;
        }, 350);
      }
    }, 100);
  } catch (err) {
    console.warn('Detector ignorado:', err);
  }
}

function setLocalSpeaking(speaking) {
  // GUARDA CRÍTICA: Não envia nada se o estado não mudou! Evita flooding de pacotes contínuos
  if (state.isSpeaking === speaking) return;
  state.isSpeaking = speaking;

  if (speaking) {
    elements.localTile.classList.add('speaking');
  } else {
    elements.localTile.classList.remove('speaking');
  }
  if (state.sendSpeaking) {
    state.sendSpeaking({ isSpeaking: speaking });
  }
}

// --- Identificador Seguro de Transmissão de Tela ---
function isScreenMedia(streamOrTrack, metadata) {
  if (metadata && metadata.type === 'screen') return true;
  if (!streamOrTrack) return false;

  if (streamOrTrack instanceof MediaStream) {
    const videoTrack = streamOrTrack.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
      if (settings.displaySurface) return true;
      const label = (videoTrack.label || '').toLowerCase();
      if (label.includes('screen') || label.includes('window') || label.includes('display') || label.includes('monitor') || label.includes('tab')) {
        return true;
      }
    }
  }

  if (streamOrTrack instanceof MediaStreamTrack || (streamOrTrack.kind && streamOrTrack.getSettings)) {
    const settings = streamOrTrack.getSettings ? streamOrTrack.getSettings() : {};
    if (settings.displaySurface) return true;
    const label = (streamOrTrack.label || '').toLowerCase();
    if (label.includes('screen') || label.includes('window') || label.includes('display') || label.includes('monitor') || label.includes('tab')) {
      return true;
    }
  }

  return false;
}

// --- Streams Remotos ---
function handleRemoteStream(stream, peerId, metadata) {
  if (!state.peers[peerId]) {
    state.peers[peerId] = {
      name: state.assignedRole === 'Usuário 1' ? 'Usuário 2' : 'Usuário 1',
      color: '#e11d48',
      avatarUrl: '',
      isMuted: false,
      isCameraOn: false,
      isSharingScreen: false
    };
  }

  const isScreen = isScreenMedia(stream, metadata) || (state.peers[peerId]?.isSharingScreen && state.peers[peerId]?.screenStreamId === stream.id);

  if (isScreen) {
    elements.mainCinemaScreen.classList.add('live');
    elements.screenShareVideo.srcObject = stream;
    elements.screenShareVideo.muted = false; // Ouvinte escuta o áudio do filme transmitido
    elements.screenShareVideo.play().catch(e => console.warn(e));
    showToast('🍿 O filme começou na telona!');
    return;
  }

  // Microfone e Câmera (isolados da transmissão de tela)
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length > 0 && elements.remoteAudio) {
    elements.remoteAudio.srcObject = new MediaStream(audioTracks);
    elements.remoteAudio.muted = state.isDeafened;
    elements.remoteAudio.play().catch(e => console.warn(e));
  }

  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length > 0) {
    elements.remoteVideo.srcObject = new MediaStream(videoTracks);
    elements.remoteVideo.muted = true; // remoteAudio cuida da reprodução do som
    elements.remoteVideo.play().catch(e => console.warn(e));
    elements.remoteAvatarPlaceholder.style.display = 'none';
  } else {
    elements.remoteAvatarPlaceholder.style.display = 'flex';
  }

  resolveUserRoles();
}

function handleRemoteTrack(track, stream, peerId, metadata) {
  if (!state.peers[peerId]) {
    state.peers[peerId] = {
      name: state.assignedRole === 'Usuário 1' ? 'Usuário 2' : 'Usuário 1',
      color: '#e11d48',
      avatarUrl: '',
      isMuted: false,
      isCameraOn: false,
      isSharingScreen: false
    };
  }

  const isScreen = isScreenMedia(track, metadata) || (state.peers[peerId]?.isSharingScreen && state.peers[peerId]?.screenStreamId === stream?.id);

  if (isScreen) {
    elements.mainCinemaScreen.classList.add('live');
    if (elements.screenShareVideo.srcObject !== stream) {
      elements.screenShareVideo.srcObject = stream;
      elements.screenShareVideo.muted = false;
      elements.screenShareVideo.play().catch(e => console.warn(e));
    }
    return;
  }

  if (track.kind === 'audio' && elements.remoteAudio) {
    elements.remoteAudio.srcObject = stream;
    elements.remoteAudio.muted = state.isDeafened;
    elements.remoteAudio.play().catch(e => console.warn(e));
  } else if (track.kind === 'video') {
    elements.remoteVideo.srcObject = new MediaStream([track]);
    elements.remoteVideo.muted = true;
    elements.remoteVideo.play().catch(e => console.warn(e));
    elements.remoteAvatarPlaceholder.style.display = 'none';

    track.onended = () => {
      elements.remoteVideo.srcObject = null;
      elements.remoteAvatarPlaceholder.style.display = 'flex';
    };
  }
}

// --- Controles de Mídia ---
async function toggleMute() {
  if (!state.localStream) {
    try {
      state.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      setupVoiceDetector(state.localStream);
      state.isMuted = false;
      playSfx('unmute');
      elements.toggleMicBtn.classList.remove('muted');
      elements.localMutedBadge.style.display = 'none';

      for (const peerId of Object.keys(state.peers)) {
        try {
          await state.room.addStream(state.localStream, peerId, { type: 'mic' });
        } catch (e) {}
      }

      broadcastPresence();
      showToast('🎤 Microfone ativado com sucesso!');
      return;
    } catch (err) {
      console.warn('Falha ao ativar microfone:', err);
      showToast('⚠️ Microfone não disponível ou bloqueado.');
      return;
    }
  }

  state.isMuted = !state.isMuted;

  const audioTrack = state.localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !state.isMuted;
  }

  playSfx(state.isMuted ? 'mute' : 'unmute');
  elements.toggleMicBtn.classList.toggle('muted', state.isMuted);
  elements.localMutedBadge.style.display = state.isMuted ? 'inline' : 'none';
  broadcastPresence();
}

function toggleDeafen() {
  state.isDeafened = !state.isDeafened;

  if (elements.remoteAudio) {
    elements.remoteAudio.muted = state.isDeafened;
  }
  if (elements.screenShareVideo && !state.isScreenSharing) {
    elements.screenShareVideo.muted = state.isDeafened;
  }

  playSfx(state.isDeafened ? 'deafen_on' : 'deafen_off');
  elements.toggleDeafenBtn.classList.toggle('muted', state.isDeafened);

  if (state.isDeafened && !state.isMuted) {
    toggleMute();
  }

  broadcastPresence();
}

async function toggleCamera() {
  if (!state.inCall) return;

  if (state.isCameraOn) {
    playSfx('camera_off');
    const videoTrack = state.localStream?.getVideoTracks()[0];
    if (videoTrack) {
      if (state.room) {
        try {
          state.room.removeTrack(videoTrack, state.localStream);
        } catch (e) {
          console.warn('Erro ao remover track de vídeo:', e);
        }
      }
      videoTrack.stop();
      if (state.localStream) {
        state.localStream.removeTrack(videoTrack);
      }
    }
    elements.localVideo.srcObject = null;
    elements.localAvatarPlaceholder.style.display = 'flex';
    elements.toggleCameraBtn.classList.remove('active');
    state.isCameraOn = false;
  } else {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      playSfx('camera_on');
      const videoTrack = camStream.getVideoTracks()[0];
      if (!state.localStream) {
        state.localStream = new MediaStream();
      }
      state.localStream.addTrack(videoTrack);

      elements.localVideo.srcObject = new MediaStream([videoTrack]);
      elements.localAvatarPlaceholder.style.display = 'none';
      elements.toggleCameraBtn.classList.add('active');
      state.isCameraOn = true;

      if (state.room) {
        try {
          await state.room.addTrack(videoTrack, state.localStream);
        } catch (e) {
          console.warn('Aviso ao sincronizar track de vídeo:', e);
        }
      }
    } catch (err) {
      alert('Não foi possível acessar a câmera.');
    }
  }

  broadcastPresence();
}

// --- Fluxo de Seleção de Projeção (Compartilhar Tela vs Navegador Virtual) ---
function handleProjectionBtnClick() {
  playSfx('click');
  if (state.isScreenSharing) {
    stopScreenShare();
    return;
  }
  if (state.isVirtualBrowserActive) {
    unmountVirtualBrowser(true);
    return;
  }
  openProjectionChoiceModal();
}

function openProjectionChoiceModal() {
  if (elements.projectionChoiceModal) {
    elements.projectionChoiceModal.style.display = 'flex';
  }
}

function closeProjectionChoiceModal() {
  if (elements.projectionChoiceModal) {
    elements.projectionChoiceModal.style.display = 'none';
  }
}

function openHyperbeamConfigModal() {
  if (elements.hyperbeamConfigModal) {
    if (elements.hbApiKeyInput && !elements.hbApiKeyInput.value) {
      elements.hbApiKeyInput.value = localStorage.getItem('hyperbeam_api_key') || HYPERBEAM_DEFAULT_API_KEY;
    }
    if (elements.hbEmbedUrlInput) {
      elements.hbEmbedUrlInput.value = localStorage.getItem('hyperbeam_embed_url') || '';
    }
    elements.hyperbeamConfigModal.style.display = 'flex';
  }
}

function closeHyperbeamConfigModal() {
  if (elements.hyperbeamConfigModal) {
    elements.hyperbeamConfigModal.style.display = 'none';
  }
}

function openVirtualBrowserFlow() {
  const savedEmbedUrl = localStorage.getItem('hyperbeam_embed_url') || '';
  const apiKey = (localStorage.getItem('hyperbeam_api_key') || HYPERBEAM_DEFAULT_API_KEY).trim();

  if (savedEmbedUrl) {
    mountVirtualBrowser(savedEmbedUrl, true);
    return;
  }

  if (apiKey) {
    showToast('⏳ Conectando ao Navegador Virtual...');
    createHyperbeamSession(apiKey).then(url => {
      mountVirtualBrowser(url, true);
    }).catch(err => {
      console.warn(err);
      openHyperbeamConfigModal();
    });
    return;
  }

  openHyperbeamConfigModal();
}

async function handleStartHyperbeamSubmit() {
  const apiKey = (elements.hbApiKeyInput ? elements.hbApiKeyInput.value.trim() : '') || HYPERBEAM_DEFAULT_API_KEY;
  const embedUrl = elements.hbEmbedUrlInput ? elements.hbEmbedUrlInput.value.trim() : '';

  if (!apiKey && !embedUrl) {
    alert('Por favor, informe a Chave de API do Hyperbeam ou cole um Link de Sessão direto.');
    return;
  }

  playSfx('click');
  closeHyperbeamConfigModal();

  if (embedUrl) {
    localStorage.setItem('hyperbeam_embed_url', embedUrl);
    mountVirtualBrowser(embedUrl, true);
    return;
  }

  if (apiKey) {
    localStorage.setItem('hyperbeam_api_key', apiKey);
    showToast('⏳ Conectando ao Chrome Virtual na nuvem...');
    try {
      const generatedUrl = await createHyperbeamSession(apiKey);
      mountVirtualBrowser(generatedUrl, true);
    } catch (err) {
      alert(err.message || 'Erro ao conectar à API do Hyperbeam.');
      openHyperbeamConfigModal();
    }
  }
}

async function createHyperbeamSession(apiKey) {
  const cleanKey = (apiKey || HYPERBEAM_DEFAULT_API_KEY).trim();
  const payload = {
    start_url: 'https://www.google.com',
    offline_timeout: 3600
  };

  // Proxy seguro com suporte total a CORS e repasse de Authorization Bearer
  const proxies = [
    `https://vercel-cors-proxy.vercel.app/api/proxy?url=${encodeURIComponent('https://engine.hyperbeam.com/v0/vm')}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session_id) {
          state.virtualBrowserSessionId = data.session_id;
        }
        if (data.embed_url) return data.embed_url;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'err_too_many_vm_requests') {
          throw new Error('Aguarde alguns instantes antes de iniciar outra sessão de navegador virtual.');
        }
      }
    } catch (err) {
      if (err.message && err.message.includes('Aguarde')) throw err;
      console.warn('Proxy falhou:', err);
    }
  }

  // Fallback direto
  try {
    const res = await fetch('https://engine.hyperbeam.com/v0/vm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session_id) state.virtualBrowserSessionId = data.session_id;
      if (data.embed_url) return data.embed_url;
    }
  } catch (e) {
    console.warn('Tentativa direta ao Hyperbeam bloqueada por CORS.');
  }

  throw new Error('Não foi possível conectar à API do Hyperbeam automaticamente. Cole diretamente o Link de Sessão (Embed URL)!');
}

function mountVirtualBrowser(embedUrl, isCreator) {
  state.isVirtualBrowserActive = true;
  state.virtualBrowserEmbedUrl = embedUrl;

  if (state.isScreenSharing) {
    stopScreenShare();
  }

  elements.mainCinemaScreen.classList.add('live', 'virtual-browser-active');
  if (elements.virtualBrowserIframe) {
    elements.virtualBrowserIframe.src = embedUrl;
  }
  if (elements.virtualBrowserWrapper) {
    elements.virtualBrowserWrapper.style.display = 'flex';
  }
  if (elements.screenShareVideo) {
    elements.screenShareVideo.style.display = 'none';
  }
  if (elements.projectorStandby) {
    elements.projectorStandby.style.display = 'none';
  }
  elements.toggleScreenBtn.classList.add('active');

  if (isCreator && state.sendVirtualBrowserSync) {
    state.sendVirtualBrowserSync({ active: true, embedUrl });
    showToast('🌐 Navegador Virtual iniciado! Ambos têm controle conjunto.');
  }

  broadcastPresence();
}

function unmountVirtualBrowser(isInitiator) {
  const sessionId = state.virtualBrowserSessionId;
  const apiKey = (localStorage.getItem('hyperbeam_api_key') || HYPERBEAM_DEFAULT_API_KEY).trim();

  state.isVirtualBrowserActive = false;
  state.virtualBrowserEmbedUrl = null;
  state.virtualBrowserSessionId = null;

  // Encerra a VM na nuvem para economizar minutos e evitar rate limits
  if (isInitiator && sessionId) {
    try {
      const deleteUrl = `https://vercel-cors-proxy.vercel.app/api/proxy?url=${encodeURIComponent('https://engine.hyperbeam.com/v0/vm/' + sessionId)}`;
      fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }).catch(e => console.warn('Erro ao encerrar sessão VM:', e));
    } catch (e) {}
  }

  if (elements.virtualBrowserIframe) {
    elements.virtualBrowserIframe.src = 'about:blank';
  }
  if (elements.virtualBrowserWrapper) {
    elements.virtualBrowserWrapper.style.display = 'none';
  }
  elements.mainCinemaScreen.classList.remove('live', 'virtual-browser-active');
  if (elements.screenShareVideo) {
    elements.screenShareVideo.style.display = 'none';
  }
  if (elements.projectorStandby) {
    elements.projectorStandby.style.display = 'flex';
  }
  elements.toggleScreenBtn.classList.remove('active');

  if (isInitiator && state.sendVirtualBrowserSync) {
    state.sendVirtualBrowserSync({ active: false });
    showToast('🌐 Navegador Virtual encerrado.');
  }

  broadcastPresence();
}

// --- Transmitir Filme ---
async function toggleScreenShare() {
  if (!state.inCall) return;

  if (state.isScreenSharing) {
    stopScreenShare();
  } else {
    try {
      state.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
        systemAudio: 'include'
      });

      playSfx('screen_on');
      state.isScreenSharing = true;
      elements.toggleScreenBtn.classList.add('active');

      elements.mainCinemaScreen.classList.add('live');
      elements.screenShareVideo.srcObject = state.screenStream;
      elements.screenShareVideo.muted = true; // Transmissor NÃO deve ouvir o próprio áudio duplicado com eco!
      elements.screenShareVideo.play().catch(e => console.warn(e));

      const hasAudio = state.screenStream.getAudioTracks().length > 0;
      if (!hasAudio) {
        showToast('💡 Dica: Para seu parceiro ouvir o som do filme, marque "Compartilhar áudio" na janela de seleção.');
      } else {
        showToast('🎬 Transmissão iniciada! Dica: Clique em "Ocultar" na barrinha flutuante do navegador para ela sumir da tela.');
      }

      if (state.room) {
        try {
          await state.room.addStream(state.screenStream, null, { type: 'screen' });
        } catch (err) {
          console.warn('Aviso ao transmitir tela:', err);
        }
      }

      if (state.sendScreenSync) {
        state.sendScreenSync({ active: true, streamId: state.screenStream.id });
      }

      state.screenStream.getTracks().forEach(track => {
        track.onended = () => {
          if (state.isScreenSharing) {
            stopScreenShare();
          }
        };
      });

      broadcastPresence();
    } catch (err) {
      console.warn('Transmissão cancelada:', err);
    }
  }
}

function stopScreenShare() {
  if (state.screenStream) {
    playSfx('screen_off');
    if (state.room) {
      try {
        state.room.removeStream(state.screenStream);
      } catch (e) {
        console.warn('Aviso ao remover transmissão de tela:', e);
      }
    }
    try {
      state.screenStream.getTracks().forEach(t => {
        t.stop();
        t.enabled = false;
      });
    } catch (e) {}
    state.screenStream = null;
  }

  if (state.sendScreenSync) {
    try {
      state.sendScreenSync({ active: false });
    } catch (e) {}
  }

  state.isScreenSharing = false;
  elements.toggleScreenBtn.classList.remove('active');
  elements.mainCinemaScreen.classList.remove('live');
  elements.screenShareVideo.srcObject = null;
  broadcastPresence();
}

// --- Fullscreen (Página inteira) ---
function togglePageFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// --- Fullscreen da Telona de Cinema (Imersão Absoluta de Ponta a Ponta) ---
function enterMovieFullscreen() {
  const target = elements.mainCinemaScreen || elements.callGrid;
  if (target && target.requestFullscreen) {
    target.requestFullscreen().catch(() => {
      // Fallback
      if (elements.callGrid && elements.callGrid.requestFullscreen) {
        elements.callGrid.requestFullscreen().catch(() => {});
      }
    });
  }
}

function exitMovieFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// --- Modal ---
function openProfileModal() {
  elements.usernameInput.value = state.user.customName || '';
  elements.avatarUrlInput.value = state.user.avatarUrl || '';
  elements.roomNameInput.value = state.user.room;
  elements.profileModal.style.display = 'flex';
}

function closeProfileModal() {
  elements.profileModal.style.display = 'none';
}

function saveProfileModal() {
  const newCustomName = elements.usernameInput.value.trim();
  const newAvatarUrl = elements.avatarUrlInput.value.trim();
  const newRoom = elements.roomNameInput.value.trim() || 'meu-coracao';

  const activeColorDot = elements.colorPickerGrid.querySelector('.color-circle.active');
  const newColor = activeColorDot ? activeColorDot.dataset.color : state.user.color;

  const roomChanged = (newRoom !== state.user.room);

  state.user.customName = newCustomName;
  state.user.avatarUrl = newAvatarUrl;
  state.user.room = newRoom;
  state.user.color = newColor;

  localStorage.setItem('cinema_user_name', newCustomName);
  localStorage.setItem('cinema_avatar_url', newAvatarUrl);
  localStorage.setItem('cinema_room_code', newRoom);
  localStorage.setItem('cinema_user_color', newColor);

  resolveUserRoles();
  closeProfileModal();
  broadcastPresence();

  if (roomChanged && state.inCall) {
    leaveCall();
    showToast('Sala alterada. Conecte-se novamente!');
  } else {
    showToast('Ingresso atualizado com sucesso!');
  }
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', () => {
  if (state.inCall) {
    leaveCall();
  }
});
