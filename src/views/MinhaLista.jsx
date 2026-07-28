import React, { useState, useEffect } from 'react';
import MediaCard from '../components/MediaCard';
import * as Storage from '../services/storageService';
import { Bookmark, Plus } from 'lucide-react';

export default function MinhaLista({ onSelectMedia }) {
  const [myList, setMyList] = useState([]);

  const loadData = () => {
    setMyList(Storage.getMyList());
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="pt-24 px-4 md:px-16 pb-20 route-transition select-none min-h-[80vh]">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-wide flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-[#E50914] fill-[#E50914]" /> Minha Lista
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Seus filmes e séries salvos para assistir a qualquer momento.</p>
        </div>
      </div>

      {myList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-zinc-900/80 rounded-full flex items-center justify-center mb-4 border border-zinc-800/60">
            <Plus className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sua lista está vazia</h3>
          <p className="text-zinc-500 text-sm max-w-md">
            Clique no botão <strong className="text-white">+</strong> nos detalhes de qualquer filme ou série para salvá-los aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
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
  );
}
