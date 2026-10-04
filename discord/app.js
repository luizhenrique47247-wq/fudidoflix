// Import do Trystero via Nostr (Sinalização P2P ultrarrápida sem servidor)
import { joinRoom } from 'https://esm.sh/trystero@0.20.1/nostr';

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
  appId: 'cine-amor-p2p-vip'
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

  toast: document.getElementById('toast')
};

// --- Temporizador de Ociosidade para Tela Cheia (Auto-hide) ---
let fullscreenIdleTimer = null;

function resetFullscreenIdleTimer() {
  if (!document.fullscreenElement) return;

  elements.callGrid.classList.remove('fullscreen-idle');

  if (fullscreenIdleTimer) {
    clearTimeout(fullscreenIdleTimer);
  }

  fullscreenIdleTimer = setTimeout(() => {
    if (document.fullscreenElement) {
      elements.callGrid.classList.add('fullscreen-idle');
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
  elements.toggleScreenBtn.addEventListener('click', toggleScreenShare);
  elements.standbyScreenShareBtn.addEventListener('click', toggleScreenShare);

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

  // Dois cliques na telona de vídeo alternam tela cheia
  elements.screenShareVideo.addEventListener('dblclick', () => {
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
    elements.screenFullscreenBtn.style.display = 'flex';
    elements.screenFullscreenBtn.title = isFS ? 'Sair da Tela Cheia' : 'Tela Cheia';
  }
  if (elements.screenExitFullscreenBtn) {
    elements.screenExitFullscreenBtn.style.display = 'none';
  }
  if (!isFS) {
    elements.callGrid.classList.remove('fullscreen-idle');
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

    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    playSfx('join');
    setupVoiceDetector(state.localStream);

    state.room = joinRoom(TRYSTERO_CONFIG, state.user.room);

    const [sendPresence, onPresence] = state.room.makeAction('presence');
    const [sendSpeaking, onSpeaking] = state.room.makeAction('speaking');
    const [sendAlarm, onAlarm] = state.room.makeAction('alarm');
    const [sendRoomFull, onRoomFull] = state.room.makeAction('room_full');

    state.sendPresence = sendPresence;
    state.sendSpeaking = sendSpeaking;
    state.sendAlarm = sendAlarm;
    state.sendRoomFull = sendRoomFull;

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

    // Garante que o card do parceiro só aparece se ele REALMENTE estiver na call
    if (elements.remoteCamSlot) {
      elements.remoteCamSlot.style.display = 'none';
    }

    state.room.onPeerJoin(peerId => {
      const currentPeers = Object.keys(state.peers);
      // REGRA: Apenas 2 usuários permitidos na call. Se já existe 1 parceiro, rejeita o 3º!
      if (currentPeers.length >= 1) {
        console.warn('Tentativa de 3º usuário rejeitada:', peerId);
        sendRoomFull({ reason: 'full' }, peerId);
        return;
      }

      console.log('Parceiro conectou:', peerId);
      playSfx('join');

      state.peers[peerId] = {
        name: 'Usuário 2',
        color: '#e11d48',
        avatarUrl: '',
        isMuted: false,
        isCameraOn: false,
        isSharingScreen: false
      };

      // O OUTRO USUÁRIO SÓ APARECE LA SE REALMENTE TIVER NA CALL
      if (elements.remoteCamSlot) {
        elements.remoteCamSlot.style.display = 'block';
      }

      state.room.addStream(state.localStream, peerId, { type: 'mic' });
      if (state.screenStream) {
        state.room.addStream(state.screenStream, peerId, { type: 'screen' });
      }
      broadcastPresence();
      resolveUserRoles();
    });

    state.room.onPeerLeave(peerId => {
      console.log('Parceiro saiu:', peerId);
      playSfx('leave');
      delete state.peers[peerId];
      elements.remoteVideo.srcObject = null;
      elements.remoteAvatarPlaceholder.style.display = 'flex';

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

    onPresence((data, peerId) => {
      if (!state.peers[peerId]) state.peers[peerId] = {};
      state.peers[peerId] = { ...state.peers[peerId], ...data };
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
    console.error('Erro ao conectar:', err);
    alert('Por favor, libere o microfone no navegador para entrar na sala.');
  }
}

// --- Sair da Sessão ---
function leaveCall() {
  playSfx('leave');
  stopCallTimer();
  stopAlarmSound();

  if (document.fullscreenElement) {
    exitMovieFullscreen();
  }

  if (state.localStream) {
    state.localStream.getTracks().forEach(t => t.stop());
    state.localStream = null;
  }
  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
  }
  if (state.room) {
    state.room.leave();
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

  elements.lobbySection.style.display = 'flex';
  elements.callGrid.style.display = 'none';
  elements.dockContainer.style.display = 'none';

  elements.mainCinemaScreen.classList.remove('live');
  elements.screenShareVideo.srcObject = null;

  elements.localVideo.srcObject = null;
  elements.localAvatarPlaceholder.style.display = 'flex';
  elements.remoteVideo.srcObject = null;
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
    isSharingScreen: state.isScreenSharing
  });
}

// --- Detector de Voz ---
function setupVoiceDetector(stream) {
  try {
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceTimer = null;

    function checkVolume() {
      if (!state.inCall || state.isMuted) {
        setLocalSpeaking(false);
        requestAnimationFrame(checkVolume);
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

      requestAnimationFrame(checkVolume);
    }

    checkVolume();
  } catch (err) {
    console.warn('Detector ignorado:', err);
  }
}

function setLocalSpeaking(speaking) {
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

  if (metadata && metadata.type === 'screen') {
    elements.mainCinemaScreen.classList.add('live');
    elements.screenShareVideo.srcObject = stream;
    elements.screenShareVideo.play().catch(e => console.warn(e));
    showToast('🍿 O filme começou na telona!');
    return;
  }

  state.peers[peerId].stream = stream;
  const hasVideo = stream.getVideoTracks().length > 0;

  if (hasVideo) {
    elements.remoteAvatarPlaceholder.style.display = 'none';
    elements.remoteVideo.srcObject = stream;
    elements.remoteVideo.play().catch(e => console.warn(e));
  } else {
    elements.remoteAvatarPlaceholder.style.display = 'flex';
  }

  resolveUserRoles();
}

// --- Controles de Mídia ---
function toggleMute() {
  if (!state.localStream) return;
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

  document.querySelectorAll('video, audio').forEach(el => {
    if (el !== elements.localVideo) {
      el.muted = state.isDeafened;
    }
  });

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
    const videoTrack = state.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      state.localStream.removeTrack(videoTrack);
    }
    elements.localVideo.srcObject = null;
    elements.localAvatarPlaceholder.style.display = 'flex';
    elements.toggleCameraBtn.classList.remove('active');
    state.isCameraOn = false;
  } else {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      playSfx('camera_on');
      const videoTrack = camStream.getVideoTracks()[0];
      state.localStream.addTrack(videoTrack);

      elements.localVideo.srcObject = new MediaStream([videoTrack]);
      elements.localAvatarPlaceholder.style.display = 'none';
      elements.toggleCameraBtn.classList.add('active');
      state.isCameraOn = true;

      if (state.room) {
        state.room.addStream(state.localStream);
      }
    } catch (err) {
      alert('Não foi possível acessar a câmera.');
    }
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
          cursor: 'always',
          displaySurface: 'browser'
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      playSfx('screen_on');
      state.isScreenSharing = true;
      elements.toggleScreenBtn.classList.add('active');

      elements.mainCinemaScreen.classList.add('live');
      elements.screenShareVideo.srcObject = state.screenStream;

      if (state.room) {
        state.room.addStream(state.screenStream, null, { type: 'screen' });
      }

      state.screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      broadcastPresence();
      showToast('🎬 Filme projetado na telona! Aproveitem a sessão.');
    } catch (err) {
      console.warn('Transmissão cancelada:', err);
    }
  }
}

function stopScreenShare() {
  if (state.screenStream) {
    playSfx('screen_off');
    state.screenStream.getTracks().forEach(t => t.stop());
    if (state.room) {
      state.room.removeStream(state.screenStream);
    }
    state.screenStream = null;
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

// --- Fullscreen (Transmissão de Cinema com todo o menu e câmeras acessíveis) ---
function enterMovieFullscreen() {
  const target = elements.callGrid;
  if (target && target.requestFullscreen) {
    target.requestFullscreen().catch(() => {
      // Fallback
      if (elements.mainCinemaScreen && elements.mainCinemaScreen.requestFullscreen) {
        elements.mainCinemaScreen.requestFullscreen().catch(() => {});
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
