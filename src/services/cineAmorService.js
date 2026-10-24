import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  deleteDoc, 
  arrayUnion 
} from 'firebase/firestore';
import { db } from './firebase';

export const ROOMS_COLLECTION = 'fudidoflix_rooms';

/**
 * Gera um código legível de 6 caracteres (sem caracteres confusos como O, 0, I, 1)
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Extrai o ID de um vídeo do YouTube a partir de qualquer formato de URL
 */
export function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.trim().match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Cria uma nova sala temporária no Firestore
 */
export async function createRoom({ hostProfile, initialMedia = null }) {
  const code = generateRoomCode();
  const roomRef = doc(db, ROOMS_COLLECTION, code);

  const initialData = {
    code,
    createdAt: Date.now(),
    state: 'waiting', // 'waiting' | 'active' | 'closed'
    host: {
      id: hostProfile.id || 'host_' + Date.now(),
      name: hostProfile.name || 'Usuário 1',
      avatar: hostProfile.avatar || ''
    },
    guest: null,
    // Sinalização WebRTC
    offer: null,
    answer: null,
    hostCandidates: [],
    guestCandidates: [],
    // Controle do Telão: 'screen' (Compartilhamento de Tela) ou 'youtube'
    currentMode: 'screen',
    screenBroadcaster: null, // id de quem está compartilhando
    media: initialMedia ? {
      id: initialMedia.id || '',
      title: initialMedia.title || initialMedia.name || '',
      poster_path: initialMedia.poster_path || ''
    } : null,
    // Player e Fila do YouTube sincronizados
    youtube: {
      videoId: '',
      title: '',
      status: 'paused', // 'playing' | 'paused'
      currentTime: 0,
      updatedAt: Date.now(),
      updatedBy: hostProfile.id || 'host',
      playlist: [] // [ { id: '...', title: '...', addedBy: '...' } ]
    }
  };

  await setDoc(roomRef, initialData);
  return code;
}

/**
 * Entra em uma sala existente
 */
export async function joinRoom(code, guestProfile) {
  const cleanCode = (code || '').trim().toUpperCase();
  const roomRef = doc(db, ROOMS_COLLECTION, cleanCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    throw new Error('Sala não encontrada. Verifique o código digitado.');
  }

  const room = snap.data();
  if (room.state === 'closed') {
    throw new Error('Esta sessão de cinema já foi encerrada.');
  }

  if (room.guest && room.guest.id !== guestProfile.id) {
    throw new Error('Esta sessão já atingiu o limite máximo de 2 pessoas.');
  }

  const guestData = {
    id: guestProfile.id || 'guest_' + Date.now(),
    name: guestProfile.name || 'Usuário 2',
    avatar: guestProfile.avatar || ''
  };

  await updateDoc(roomRef, {
    guest: guestData,
    state: 'active'
  });

  return { ...room, guest: guestData, state: 'active' };
}

/**
 * Escuta mudanças da sala em tempo real
 */
export function subscribeToRoom(code, callback) {
  const cleanCode = (code || '').trim().toUpperCase();
  const roomRef = doc(db, ROOMS_COLLECTION, cleanCode);

  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback({ state: 'closed' });
    }
  }, (err) => {
    console.warn('[CineAmor] Erro no listener do Firestore:', err);
  });
}

/**
 * Sinalização WebRTC: Envia Oferta SDP (Host)
 */
export async function sendWebRTCOffer(code, offer) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  await updateDoc(roomRef, { offer: JSON.parse(JSON.stringify(offer)) });
}

/**
 * Sinalização WebRTC: Envia Resposta SDP (Guest)
 */
export async function sendWebRTCAnswer(code, answer) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  await updateDoc(roomRef, { answer: JSON.parse(JSON.stringify(answer)) });
}

/**
 * Sinalização WebRTC: Envia ICE Candidate
 */
export async function sendIceCandidate(code, candidate, isHost) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  const field = isHost ? 'hostCandidates' : 'guestCandidates';
  try {
    await updateDoc(roomRef, {
      [field]: arrayUnion(JSON.parse(JSON.stringify(candidate)))
    });
  } catch (err) {
    console.warn('[CineAmor] Erro ao enviar ICE candidate:', err);
  }
}

/**
 * Alterna modo de exibição do telão ('screen' ou 'youtube')
 */
export async function setScreenMode(code, mode, broadcasterId = null) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  await updateDoc(roomRef, { 
    currentMode: mode,
    screenBroadcaster: broadcasterId 
  });
}

/**
 * Sincroniza estado de reprodução do YouTube (play/pause/seek)
 */
export async function syncYouTubePlayer(code, { videoId, status, currentTime, updatedBy }) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  await updateDoc(roomRef, {
    'youtube.videoId': videoId,
    'youtube.status': status,
    'youtube.currentTime': currentTime,
    'youtube.updatedAt': Date.now(),
    'youtube.updatedBy': updatedBy
  });
}

/**
 * Adiciona um vídeo à fila do YouTube
 */
export async function addVideoToQueue(code, videoItem) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  await updateDoc(roomRef, {
    'youtube.playlist': arrayUnion(videoItem)
  });
}

/**
 * Atualiza a fila completa do YouTube (remover vídeo, tocar próximo)
 */
export async function updateQueueList(code, newPlaylist, currentVideo = null) {
  const roomRef = doc(db, ROOMS_COLLECTION, code);
  const updates = {
    'youtube.playlist': newPlaylist
  };
  if (currentVideo) {
    updates['youtube.videoId'] = currentVideo.id;
    updates['youtube.title'] = currentVideo.title;
    updates['youtube.status'] = 'playing';
    updates['youtube.currentTime'] = 0;
    updates['youtube.updatedAt'] = Date.now();
  }
  await updateDoc(roomRef, updates);
}

/**
 * Encerra e apaga a sala (AUTO-DELETA do banco em 3 segundos para custo zero de armazenamento)
 */
export async function leaveRoom(code, isHost) {
  const cleanCode = (code || '').trim().toUpperCase();
  const roomRef = doc(db, ROOMS_COLLECTION, cleanCode);
  try {
    if (isHost) {
      // Se o anfitrião saiu, encerra a sala para todos
      await updateDoc(roomRef, { state: 'closed' });
      // Deleta o documento do Firestore em 3s
      setTimeout(async () => {
        try {
          await deleteDoc(roomRef);
          console.log(`[CineAmor] Sala ${cleanCode} auto-deletada com sucesso. Zero lixo no banco!`);
        } catch (_) {}
      }, 3000);
    } else {
      // Se foi o convidado, apenas desvincula o guest
      await updateDoc(roomRef, { guest: null });
    }
  } catch (err) {
    console.warn('[CineAmor] Erro ao encerrar sala:', err);
  }
}
