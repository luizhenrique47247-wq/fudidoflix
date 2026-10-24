import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import * as Storage from '../services/storageService';

// Preset lists of cartoon avatars ("bonequinhos")
const AVATAR_OPTIONS = [
  { id: 'av_1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { id: 'av_2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoro' },
  { id: 'av_3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna' },
  { id: 'av_4', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar' },
  { id: 'av_5', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Buster' },
  { id: 'av_6', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky' },
  { id: 'av_7', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi' },
  { id: 'av_8', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Bella' }
];

export default function Profiles({ onSelectProfile }) {
  const [profiles, setProfiles] = useState(Storage.getProfiles());
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Add / Edit Profile States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].url);
  const [editingProfile, setEditingProfile] = useState(null); // Profile object if editing
  
  // Zoom Selection State
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => {
    // 1. Initial read from local state
    const current = Storage.getProfiles();
    setProfiles(current);
    if (current && current.length > 0) {
      setLoading(false);
    }

    // 2. Start firestore sync
    Storage.initFirestoreSync();

    // 3. Listen to real-time storage updates from Firestore
    const handleUpdate = () => {
      const updated = Storage.getProfiles();
      setProfiles(updated);
      setLoading(false);
    };

    window.addEventListener('fudidoFlixStorageUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Timeout fallback (max 1.5s for loading state)
    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
      window.removeEventListener('fudidoFlixStorageUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearTimeout(timer);
    };
  }, []);

  const handleSelect = (profile) => {
    if (isEditing) {
      setEditingProfile(profile);
      setNewProfileName(profile.name);
      setSelectedAvatar(profile.avatar);
      setShowAddModal(true);
      return;
    }
    
    setSelectedProfileId(profile.id);
    setIsZooming(true);
    
    // Smooth cinematic zoom transition
    setTimeout(() => {
      onSelectProfile(profile);
    }, 600);
  };

  const handleAddOrEditProfile = () => {
    if (!newProfileName.trim()) return;

    if (editingProfile) {
      // Edit existing profile name and selected avatar
      Storage.updateProfile(editingProfile.id, newProfileName.trim(), selectedAvatar);
      setProfiles(Storage.getProfiles());
    } else {
      // Create new profile with selected avatar
      const newProfile = Storage.saveProfile(newProfileName.trim(), selectedAvatar);
      if (newProfile) {
        setProfiles(Storage.getProfiles());
      }
    }

    // Reset fields
    setNewProfileName('');
    setSelectedAvatar(AVATAR_OPTIONS[0].url);
    setEditingProfile(null);
    setShowAddModal(false);
  };

  const handleDeleteProfile = (id) => {
    Storage.deleteProfile(id);
    setProfiles(Storage.getProfiles());
    setNewProfileName('');
    setSelectedAvatar(AVATAR_OPTIONS[0].url);
    setEditingProfile(null);
    setShowAddModal(false);
  };

  const openCreateModal = () => {
    setEditingProfile(null);
    setNewProfileName('');
    // Select a random avatar default to make it fun
    const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)].url;
    setSelectedAvatar(randomAvatar);
    setShowAddModal(true);
  };

  return (
    <div 
      className="min-h-screen bg-black flex flex-col justify-center items-center text-white px-4 select-none relative overflow-hidden font-sans"
    >
      <div className="w-full max-w-4xl flex flex-col items-center z-10">
        
        {/* Title */}
        <h1 className={`text-3xl md:text-5xl font-medium tracking-wide mb-12 text-center text-zinc-100 ${
          isZooming ? 'animate-fade-out-blur' : ''
        }`}>
          {isEditing ? 'Gerenciar perfis:' : 'Quem está assistindo?'}
        </h1>

        {/* Loading Spinner while fetching from Firestore */}
        {loading && profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <Loader2 className="w-10 h-10 text-[#E50914] animate-spin mb-4" />
            <p className="text-zinc-400 text-sm font-semibold tracking-wider">Carregando seus perfis...</p>
          </div>
        ) : (
          /* Profiles Grid */
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-16">
            {profiles.map(profile => {
              const isTarget = selectedProfileId === profile.id;
              return (
                <div 
                  key={profile.id}
                  className="flex flex-col items-center group cursor-pointer relative"
                >
                  {/* Clickable Avatar Circle */}
                  <div 
                    onClick={() => handleSelect(profile)}
                    className={`w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 relative transition-all duration-300 ${
                      isTarget 
                        ? 'border-[#E50914] scale-110 shadow-[0_0_25px_rgba(229,9,20,0.5)] z-50 animate-cinematic-zoom' 
                        : 'border-transparent group-hover:border-zinc-300 group-hover:scale-105 shadow-lg'
                    } ${isZooming && isTarget ? 'animate-cinematic-zoom' : ''} ${isZooming && !isTarget ? 'animate-fade-out-blur opacity-0 scale-90' : 'opacity-100'}`}
                  >
                    <img 
                      src={profile.avatar} 
                      alt={profile.name} 
                      className="w-full h-full object-cover bg-zinc-800"
                    />

                    {/* Dark edit overlay overlaying when in editing mode */}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity">
                        <div className="p-2.5 bg-black/85 border border-zinc-700 rounded-full text-white hover:scale-110 transition-transform">
                          <Pencil className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pencil Button overlay (Hover state) */}
                  {!isZooming && !isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // prevent select profile trigger
                        setEditingProfile(profile);
                        setNewProfileName(profile.name);
                        setSelectedAvatar(profile.avatar);
                        setShowAddModal(true);
                      }}
                      className="absolute top-20 right-0 md:top-24 md:right-1 p-2 bg-zinc-900 border border-zinc-700 hover:border-white rounded-full text-zinc-350 hover:text-white shadow-lg transition-all duration-200 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 z-30 cursor-pointer"
                      title="Editar Perfil"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Profile Name */}
                  <span className={`mt-4 text-base md:text-lg font-medium tracking-wide transition-colors ${
                    isTarget ? 'text-[#E50914] font-bold' : 'text-zinc-400 group-hover:text-white'
                  } ${isZooming && isTarget ? 'scale-110' : ''} ${isZooming && !isTarget ? 'opacity-0' : 'opacity-100'}`}>
                    {profile.name}
                  </span>
                </div>
              );
            })}

            {/* Add Profile Option Button */}
            {!isEditing && profiles.length < 5 && (
              <div 
                onClick={openCreateModal}
                className={`flex flex-col items-center group cursor-pointer ${
                  isZooming ? 'animate-fade-out-blur opacity-0' : 'opacity-100'
                }`}
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 bg-zinc-950/40">
                  <Plus className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <span className="mt-4 text-sm md:text-base text-zinc-500 group-hover:text-white transition-colors font-medium">
                  Adicionar Novo
                </span>
              </div>
            )}
          </div>
        )}

        {/* Manage Profiles Trigger Toggle */}
        {profiles.length > 0 && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`border border-zinc-700 hover:border-white text-zinc-400 hover:text-white px-6 py-2 tracking-widest uppercase text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer rounded-sm active:scale-95 ${
              isZooming ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {isEditing ? 'Concluído' : 'Gerenciar Perfis'}
          </button>
        )}
      </div>

      {/* Add / Edit Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-zinc-800 rounded-xl max-w-md w-full p-6 md:p-8 relative shadow-2xl animate-scale-up">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl md:text-2xl font-bold mb-6 text-white text-center">
              {editingProfile ? 'Editar Perfil' : 'Adicionar Perfil'}
            </h3>

            {/* Selected Avatar Preview */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#E50914] mb-4 shadow-xl">
                <img 
                  src={selectedAvatar} 
                  alt="Avatar selecionado" 
                  className="w-full h-full object-cover bg-zinc-800"
                />
              </div>

              {/* Avatar Selector Tray */}
              <span className="text-xs text-zinc-400 mb-2 font-medium">Escolha um bonequinho:</span>
              <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                {AVATAR_OPTIONS.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`w-9 h-9 rounded-full overflow-hidden border transition-transform cursor-pointer ${
                      selectedAvatar === av.url ? 'border-[#E50914] scale-110 shadow-md ring-2 ring-red-500/30' : 'border-zinc-700 hover:scale-105 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt="" className="w-full h-full object-cover bg-zinc-800" />
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Nome do perfil
              </label>
              <input 
                type="text" 
                placeholder="Ex: Pedro, Maria, Sala..." 
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-medium focus:outline-none focus:border-[#E50914] transition-colors text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
              {editingProfile ? (
                <button
                  type="button"
                  onClick={() => handleDeleteProfile(editingProfile.id)}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-800/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              ) : <div></div>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddOrEditProfile}
                  disabled={!newProfileName.trim()}
                  className="px-6 py-2.5 bg-[#E50914] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
