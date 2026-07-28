import React, { useState, useEffect } from 'react';
import MediaCard from '../components/MediaCard';
import * as Storage from '../services/storageService';
import { X, Trash2 } from 'lucide-react';

export default function MinhaLista({ onSelectMedia }) {
  const [myList, setMyList] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedItemToRemove, setSelectedItemToRemove] = useState(null);

  const loadData = () => {
    setMyList(Storage.getMyList());
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

  return (
    <div className="pt-24 px-4 md:px-16 pb-20 route-transition select-none">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        
        {/* Column 1: Minha Lista */}
        <div>
          <h2 className="text-3xl font-black mb-6 text-white tracking-wide border-b border-zinc-900 pb-3">Minha Lista</h2>
          {myList.length === 0 ? (
            <p className="text-zinc-500 font-medium">Sua lista está vazia. Adicione filmes e séries para vê-los aqui.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {myList.map(item => (
                <MediaCard
                  key={`mylist-${item.id}`}
                  item={item}
                  type={item.type || item.media_type}
                  onClick={onSelectMedia}
                />
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Continuar Assistindo */}
        <div>
          <h2 className="text-3xl font-black mb-6 text-white tracking-wide border-b border-zinc-900 pb-3">Continuar Assistindo</h2>
          {continueWatching.length === 0 ? (
            <p className="text-zinc-500 font-medium">Você ainda não assistiu nada. Seu histórico aparecerá aqui.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedItemToRemove && (
        <div className="fixed inset-0 z-[150] confirmation-backdrop flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirmModal(false)}></div>
          
          <div className="bg-[#181818] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 z-10 animate-scale-up">
            <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" /> Remover Título
            </h4>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Deseja remover <strong>"{selectedItemToRemove.title || selectedItemToRemove.name}"</strong> da sua lista "Continuar Assistindo"?
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
