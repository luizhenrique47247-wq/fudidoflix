import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const verifyLogin = () => {
    setLoading(true);
    setError(false);

    // Replicate vanilla salts and target checks exactly
    const _s1 = "fudido";
    const _s2 = "flix";
    const _s3 = "2025";
    const salt = _s1 + _s2 + _s3; // "fudidoflix2025"

    const _h1 = "c2VuaGFmdWRp";
    const _h2 = "ZG9mbGl4Mj";
    const _h3 = "AyNQ==";
    const target = _h1 + _h2 + _h3; // "c2VuaGFmdWRpZG9mbGl4MjAyNQ=="

    const inputWithSalt = password + salt;

    let encodedInput;
    try {
      encodedInput = btoa(inputWithSalt);
    } catch (e) {
      encodedInput = "";
    }

    setTimeout(() => {
      if (encodedInput === target) {
        sessionStorage.setItem('fudidoFlixAccess', 'granted');
        onLoginSuccess();
      } else {
        setPassword('');
        setError(true);
        setLoading(false);
      }
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      verifyLogin();
    }
  };

  return (
    <div className="min-h-screen text-gray-100 relative select-none">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videologin.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/45 z-10"></div>

      {/* Left aligned premium layout */}
      <div className="min-h-screen flex flex-col justify-center items-center md:items-start p-6 sm:p-12 md:pl-28 relative z-20">
        <header className="mb-8 text-center md:text-left select-none">
          <h1 className="text-5xl md:text-6xl font-black text-[#E50914] tracking-wider drop-shadow-[0_0_20px_rgba(229,9,20,0.45)]">
            FUDIDOFLIX
          </h1>
        </header>

        <main className="w-full max-w-[400px]">
          {/* Glassmorphic Panel */}
          <div className="bg-black/50 border border-zinc-800/80 p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-md">
            <h2 className="text-2xl font-bold mb-6 text-white text-left select-none tracking-tight">
              Acesso Restrito
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 select-none uppercase tracking-wider block">
                  Chave de Acesso
                </label>
                <input 
                  type="password" 
                  placeholder="Insira sua senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-black/40 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-[#E50914] placeholder-zinc-500 font-medium text-sm transition-all focus:ring-1 focus:ring-[#E50914]/50 shadow-inner"
                />
              </div>
              
              <button 
                onClick={verifyLogin}
                disabled={loading || !password}
                className="w-full bg-[#E50914] hover:bg-red-700 hover:shadow-[0_0_20px_rgba(229,9,20,0.3)] active:scale-98 text-white font-black py-3.5 rounded-xl transition-all cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed text-sm uppercase tracking-wider shadow-lg"
              >
                {loading ? 'Verificando...' : 'Entrar na Plataforma'}
              </button>
              
              {error && (
                <p className="text-[#E50914] text-xs font-semibold text-center mt-2 select-none animate-shake bg-red-950/20 border border-red-900/30 py-2.5 rounded-lg">
                  Senha incorreta. Tente novamente.
                </p>
              )}
            </div>
          </div>
          
          <p className="text-zinc-500 text-xs text-center md:text-left mt-6 px-2 select-none leading-relaxed">
            Aviso: Este ambiente contém acesso restrito. Chaves expiradas ou incorretas serão bloqueadas.
          </p>
        </main>
      </div>
    </div>
  );
}
