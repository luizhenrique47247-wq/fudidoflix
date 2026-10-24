import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'admin@fudidoflix.app';

export async function loginWithFirebase(password) {
  if (!password || !password.trim()) {
    throw new Error('Por favor, digite a senha de acesso.');
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password.trim());
    return userCredential.user;
  } catch (err) {
    console.error('Erro na autenticação Firebase:', err);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      throw new Error('Senha incorreta! Verifique e tente novamente.');
    } else if (err.code === 'auth/user-not-found') {
      throw new Error(`Usuário não cadastrado no Firebase Console. Crie o e-mail ${ADMIN_EMAIL} no console!`);
    } else if (err.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas sem sucesso. Aguarde um instante.');
    } else if (err.code === 'auth/invalid-api-key' || err.code === 'auth/invalid-app-id') {
      throw new Error('Chaves do Firebase não configuradas! Verifique o firebase.js.');
    } else {
      throw new Error(err.message || 'Falha ao autenticar no Firebase. Tente novamente.');
    }
  }
}

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!password || !password.trim()) {
      setErrorMsg('Por favor, digite a senha de acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await loginWithFirebase(password);
      sessionStorage.setItem('fudidoFlixAccess', 'granted');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setPassword('');
      setErrorMsg(err.message || 'Senha incorreta! Tente novamente.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen text-gray-100 relative select-none flex items-center justify-start pl-6 md:pl-20 lg:pl-28 overflow-hidden font-sans">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="./videologin.mp4" type="video/mp4" />
      </video>

      {/* Dark gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/20 pointer-events-none z-10"></div>

      {/* Login Box */}
      <div className="relative z-20 w-full max-w-md p-8 sm:p-10 bg-black/75 rounded-2xl shadow-2xl backdrop-blur-md border border-zinc-800/80 animate-scale-up">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-[#E50914] tracking-wider uppercase mb-8 drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">
            FUDIDOFLIX
          </h1>
          <h2 className="text-2xl font-bold text-white mb-2">
            Entrar
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Informe sua senha para liberar o catálogo.
          </p>
        </header>

        {errorMsg && (
          <div className="mb-5 bg-red-950/80 border border-red-600/80 text-red-200 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-left leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-5">
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Senha de Acesso"
              disabled={loading}
              autoFocus
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all font-mono tracking-widest"
            />
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading || !password}
            className="w-full py-3.5 bg-[#E50914] hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:shadow-[0_0_30px_#E50914] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
