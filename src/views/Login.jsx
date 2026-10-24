import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'admin@fudidoflix.app';

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const verifyLogin = async () => {
    const cleanPass = (password || '').trim();
    if (!cleanPass) {
      setErrorMsg('Por favor, digite a senha de acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // 1. Tenta autenticar pelo Firebase Authentication oficial
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, cleanPass);
      sessionStorage.setItem('fudidoFlixAccess', 'granted');
      if (onLoginSuccess) onLoginSuccess();
      return;
    } catch (err) {
      console.warn('[Auth] Tentativa Firebase falhou:', err.code, err.message);

      // 2. Fallback de compatibilidade (aceita "senha" ou "fudidoflix")
      const salt = "fudidoflix2025";
      const target = "c2VuaGFmdWRpZG9mbGl4MjAyNQ=="; // "senha"
      let encodedInput = "";
      try {
        encodedInput = btoa(cleanPass + salt);
      } catch (_) {}

      if (encodedInput === target || cleanPass.toLowerCase() === 'senha' || cleanPass.toLowerCase() === 'fudidoflix') {
        sessionStorage.setItem('fudidoFlixAccess', 'granted');
        if (onLoginSuccess) onLoginSuccess();
        return;
      }

      // Mensagem clara para o usuário
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Senha incorreta! Verifique sua senha e tente novamente.');
      } else if (err.code === 'auth/user-not-found') {
        setErrorMsg(`Usuário ${ADMIN_EMAIL} não encontrado no Firebase Console. Crie-o ou use a senha padrão.`);
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Muitas tentativas com erro. Aguarde alguns instantes.');
      } else {
        setErrorMsg(err.message || 'Senha incorreta! Tente novamente.');
      }

      setPassword('');
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      verifyLogin();
    }
  };

  return (
    <div className="min-h-screen text-gray-100 relative select-none flex items-center justify-start pl-6 md:pl-20 lg:pl-28 overflow-hidden">
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

      {/* Dark overlay */}
      <div className="fixed inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30 pointer-events-none z-10"></div>

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-md p-8 sm:p-10 bg-black/80 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-md">
        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-black text-[#E50914] tracking-wider uppercase drop-shadow-[0_0_20px_rgba(229,9,20,0.5)]">
            FUDIDOFLIX
          </h1>
          <h2 className="text-xl font-bold text-white mt-4 mb-1">
            Entrar no Streaming
          </h2>
          <p className="text-xs text-zinc-400">
            Digite sua chave de acesso para liberar o catálogo completo.
          </p>
        </header>

        {errorMsg && (
          <div className="mb-5 bg-red-950/80 border border-red-600/80 text-red-200 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-left leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="password" 
              placeholder="Senha de Acesso" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all font-mono tracking-wider"
            />
          </div>

          <button 
            onClick={verifyLogin}
            disabled={loading || !password}
            className="w-full bg-[#E50914] hover:bg-red-700 hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] active:scale-98 text-white font-black py-3.5 rounded-xl transition-all cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Entrar no FudidoFlix</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
