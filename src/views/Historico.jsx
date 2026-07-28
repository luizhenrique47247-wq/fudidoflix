import React, { useState, useEffect } from 'react';
import MediaCard from '../components/MediaCard';
import * as Storage from '../services/storageService';
import { History, Trash2, Play } from 'lucide-react';

export default function Historico({ onSelectMedia }) {
  const [continueWatching, setContinueWatching] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedItemToRemove, setSelectedItemToRemove] = useState(null);

  const loadData = () => {
    setContinueWatching(Storage.getContinueWatchingList());
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerRemoveConfirm = (item) => {
    setSelectedItemToRemove(item);
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = () => {
    if (selectedItemToRemove) {
      Storage.removeFromContinueWatching(selectedItemToRemove.id);
      loadData();
    }
    setShowConfirmModal(false);
    setSelectedItemToRemove(null);
  };

  const handleClearAllHistory = () => {
    Storage.clearAllHistory();
    loadData();
  };

  return (
    <div className="pt-24 px-4 md:px-16 pb-20 route-transition select-none min-h-[80vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-wide flex items-center gap-3">
            <History className="w-8 h-8 text-[#E50914]" /> Histórico de Exibição
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Títulos que você começou a assistir recentemente.</p>
        </div>

        {continueWatching.length > 0 && (
          <button
            onClick={handleClearAllHistory}
            className="flex items-center px-4 py-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 font-semibold rounded-xl border border-zinc-800 transition-colors text-sm cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Todo Histórico
          </button>
        )}
      </div>

      {continueWatching.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-zinc-900/80 rounded-full flex items-center justify-center mb-4 border border-zinc-800/60">
            <History className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Seu histórico está vazio</h3>
          <p className="text-zinc-500 text-sm max-w-md">
            Os filmes e episódios de séries que você assistir aparecerão aqui automaticamente para continuar de onde parou.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {continueWatching.map(item => (
            <MediaCard
              key={`continue-${item.id}`}
              item={item}
              type={item.type || item.media_type}
              onClick={onSelectMedia}
              showRemoveButton={true}
              onRemove={triggerRemoveConfirm}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal for Removing Single Item */}
      {showConfirmModal && selectedItemToRemove && (
        <div className="fixed inset-0 z-[150] confirmation-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirmModal(false)}></div>
          
          <div className="bg-[#181818] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 z-10 animate-scale-up">
            <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" /> Remover do Histórico
            </h4>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Deseja remover <strong>"{selectedItemToRemove.title || selectedItemToRemove.name}"</strong> do seu histórico de exibição?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 transition-colors text-sm cursor-pointer border border-zinc-700/40"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmRemove}
                className="px-5 py-2.5 bg-[#E50914] text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm cursor-pointer shadow-lg shadow-red-600/10"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
