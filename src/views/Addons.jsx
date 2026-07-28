import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import * as Stremio from '../services/stremioService';

export default function Addons() {
  const [addons, setAddons] = useState([]);
  const [rdToken, setRdToken] = useState('');
  
  // Input fields
  const [newAddonUrl, setNewAddonUrl] = useState('');
  const [loadingAddon, setLoadingAddon] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setAddons(Stremio.getInstalledAddons());
    setRdToken(Stremio.getRealDebridToken());
  }, []);

  const handleSaveToken = (e) => {
    e.preventDefault();
    Stremio.saveRealDebridToken(rdToken);
    setSuccessMsg('Token Real-Debrid salvo com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleInstallAddon = async (e) => {
    e.preventDefault();
    if (!newAddonUrl.trim()) return;

    setLoadingAddon(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const url = newAddonUrl.trim();
      
      // Fetch manifest.json to validate with timeout
      const res = await Stremio.fetchWithTimeout(url);
      if (!res.ok) {
        throw new Error("Não foi possível alcançar a URL do manifesto. Verifique se o link está correto.");
      }
      const manifest = await res.json();

      if (!manifest.name || !manifest.resources) {
        throw new Error("O arquivo não parece ser um manifesto válido do protocolo Stremio.");
      }

      // Check if it supports stream resources
      const supportsStreams = manifest.resources.includes('stream') || 
                               manifest.resources.some(r => typeof r === 'object' && r.name === 'stream');

      if (!supportsStreams) {
        throw new Error("Este addon não fornece recursos de transmissão ('stream').");
      }

      // Prevent duplicates
      if (addons.some(a => a.manifestUrl === url)) {
        throw new Error("Este addon já está instalado no FudidoFlix.");
      }

      const newAddon = {
        name: manifest.name,
        manifestUrl: url,
        type: 'stream',
        enabled: true
      };

      const updated = [...addons, newAddon];
      Stremio.saveInstalledAddons(updated);
      setAddons(updated);
      setNewAddonUrl('');
      setSuccessMsg(`Addon "${manifest.name}" instalado com sucesso!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      setErrorMsg(e.message || "Ocorreu um erro ao tentar ler o addon.");
    } finally {
      setLoadingAddon(false);
    }
  };

  const handleToggleAddon = (manifestUrl) => {
    const updated = addons.map(a => {
      if (a.manifestUrl === manifestUrl) {
        return { ...a, enabled: !a.enabled };
      }
      return a;
    });
    Stremio.saveInstalledAddons(updated);
    setAddons(updated);
  };

  const handleDeleteAddon = (manifestUrl) => {
    const updated = addons.filter(a => a.manifestUrl !== manifestUrl);
    Stremio.saveInstalledAddons(updated);
    setAddons(updated);
  };

  const handleRestoreDefaults = () => {
    Stremio.saveInstalledAddons(Stremio.DEFAULT_ADDONS);
    setAddons(Stremio.DEFAULT_ADDONS);
    setSuccessMsg('Addons padrão restaurados!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="pt-18 px-4 md:px-16 pb-20 route-transition">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-zinc-900 pb-4 select-none">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Addons do Stremio</h2>
          <p className="text-zinc-500 text-sm mt-1">Configure fontes de transmissão descentralizadas e torrent cache.</p>
        </div>
        <button 
          onClick={handleRestoreDefaults}
          className="text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
        >
          Restaurar Padrão
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-900/35 text-emerald-400 rounded-xl text-sm font-semibold flex items-center select-none animate-fade-in">
          <Check className="w-5 h-5 mr-3 flex-shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-950/20 border border-red-900/35 text-red-400 rounded-xl text-sm font-semibold flex items-center select-none animate-fade-in">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Real-Debrid Settings */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-3">Real-Debrid Torrent Cache</h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Adicione seu token do Real-Debrid para converter links magnet (torrents) em transmissões diretas HTTP de alta velocidade instantaneamente.
            </p>
            <form onSubmit={handleSaveToken} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Token de API Privado</label>
                <input 
                  type="password"
                  placeholder="Cole seu token rd_token"
                  value={rdToken}
                  onChange={(e) => setRdToken(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-[#E50914] placeholder-zinc-600 font-medium text-sm transition-all focus:ring-1 focus:ring-[#E50914]/30 shadow-inner"
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <a 
                  href="https://real-debrid.com/private" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-[#E50914] hover:underline font-bold flex items-center"
                >
                  Pegar meu token <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer hover:shadow-lg active:scale-95"
                >
                  Salvar Token
                </button>
              </div>
            </form>
          </div>

          {/* Add New Addon */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-3">Instalar Novo Addon</h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Cole a URL do arquivo de manifesto (`manifest.json`) do addon de transmissão do Stremio que deseja instalar.
            </p>
            <form onSubmit={handleInstallAddon} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">URL do Manifesto</label>
                <input 
                  type="url"
                  placeholder="https://exemplo.com/manifest.json"
                  value={newAddonUrl}
                  onChange={(e) => setNewAddonUrl(e.target.value)}
                  disabled={loadingAddon}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-[#E50914] placeholder-zinc-600 font-medium text-sm transition-all focus:ring-1 focus:ring-[#E50914]/30 shadow-inner disabled:opacity-50"
                />
              </div>
              <button 
                type="submit"
                disabled={loadingAddon || !newAddonUrl.trim()}
                className="w-full py-3 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer hover:shadow-lg active:scale-95 disabled:bg-zinc-900 disabled:text-zinc-650 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loadingAddon ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando Addon...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" /> Instalar Addon
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Installed Addons List */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl backdrop-blur-md h-full">
            <h3 className="text-xl font-bold text-white mb-6 select-none">Addons Instalados</h3>

            {addons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none">
                <p className="text-zinc-500 text-sm font-semibold mb-2">Nenhum addon instalado no momento.</p>
                <p className="text-zinc-650 text-xs max-w-sm">Você precisa instalar pelo menos um addon de transmissão para reproduzir conteúdos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addons.map((addon) => (
                  <div 
                    key={addon.manifestUrl}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800/80 rounded-xl gap-4 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2.5">
                        <h4 className="font-extrabold text-white text-base truncate">{addon.name}</h4>
                        <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full select-none">
                          {addon.type === 'stream' ? 'Transmissão' : addon.type}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs font-medium truncate mt-1.5 select-text select-all" title={addon.manifestUrl}>
                        {addon.manifestUrl}
                      </p>
                    </div>

                    <div className="flex items-center justify-end space-x-4 flex-shrink-0">
                      {/* Checkbox toggle status */}
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={addon.enabled} 
                          onChange={() => handleToggleAddon(addon.manifestUrl)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E50914] transition-colors"></div>
                        <span className="ml-2.5 text-xs font-bold text-zinc-400 peer-checked:text-zinc-100">
                          {addon.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </label>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteAddon(addon.manifestUrl)}
                        className="p-2.5 bg-zinc-900/80 hover:bg-red-950/20 text-zinc-400 hover:text-red-500 border border-zinc-850 rounded-xl transition-all cursor-pointer"
                        title="Desinstalar Addon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
