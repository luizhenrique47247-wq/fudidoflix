import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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
  const [profiles, setProfiles] = useState([]);
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
    setProfiles(Storage.getProfiles());
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
      const updatedProfiles = profiles.map(p => {
        if (p.id === editingProfile.id) {
          const name = newProfileName.trim();
          return { ...p, name, avatar: selectedAvatar };
        }
        return p;
      });
      localStorage.setItem('fudidoFlixProfiles', JSON.stringify(updatedProfiles));
      setProfiles(updatedProfiles);
    } else {
      // Create new profile with selected avatar
      const newProfile = Storage.saveProfile(newProfileName, selectedAvatar);
      if (newProfile) {
        setProfiles([...profiles, newProfile]);
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
    setProfiles(profiles.filter(p => p.id !== id));
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
      className="min-h-screen bg-black flex flex-col justify-center items-center text-white px-4 select-none relative overflow-hidden"
    >
      <div className="w-full max-w-4xl flex flex-col items-center z-10">
        
        {/* Title */}
        <h1 className={`text-3xl md:text-5xl font-medium tracking-wide mb-12 text-center text-zinc-100 ${
          isZooming ? 'animate-fade-out-blur' : ''
        }`}>
          {isEditing ? 'Gerenciar perfis:' : 'Quem está assistindo?'}
        </h1>

        {/* Profiles Grid */}
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
                <span 
                  className={`mt-4 text-sm md:text-base font-medium tracking-wide transition-colors ${
                    isTarget ? 'text-[#E50914] font-bold' : 'text-zinc-400 group-hover:text-zinc-100'
                  } ${isZooming ? 'animate-fade-out-blur' : ''}`}
                >
                  {profile.name}
                </span>
              </div>
            );
          })}

          {/* "Add Profile" Option */}
          {profiles.length < 5 && !isZooming && (
            <div 
              onClick={openCreateModal}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-dashed border-zinc-700 hover:border-zinc-300 flex items-center justify-center bg-zinc-900/40 hover:bg-zinc-800/30 transition-all duration-300 hover:scale-105">
                <Plus className="w-10 h-10 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </div>
              <span className="mt-4 text-sm md:text-base text-zinc-500 group-hover:text-zinc-200 font-medium tracking-wide transition-colors">
                Adicionar Novo
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isZooming && profiles.length > 0 && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-6 py-2 border-2 border-zinc-500 text-zinc-500 hover:border-zinc-200 hover:text-zinc-200 font-bold text-sm tracking-widest uppercase rounded-none transition-all duration-300 cursor-pointer active:scale-95 bg-transparent"
          >
            {isEditing ? 'Pronto' : 'Gerenciar Perfis'}
          </button>
        )}
      </div>

      {/* Add / Edit Profile Popup Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl md:text-2xl font-black mb-6 text-white tracking-tight">
              {editingProfile ? 'Editar Perfil' : 'Criar Perfil'}
            </h3>

            <div className="space-y-6">
              {/* Profile Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Nome do Perfil
                </label>
                <input 
                  type="text" 
                  placeholder="Nome do usuário" 
                  maxLength={15}
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-[#E50914] placeholder-zinc-650 font-medium text-sm transition-all focus:ring-1 focus:ring-[#E50914]/50"
                  autoFocus
                />
              </div>

              {/* Avatar Selector Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Escolha um Avatar
                </label>
                <div className="grid grid-cols-4 gap-3 py-1">
                  {AVATAR_OPTIONS.map(av => {
                    const isSelected = selectedAvatar === av.url;
                    return (
                      <div 
                        key={av.id}
                        onClick={() => setSelectedAvatar(av.url)}
                        className={`aspect-square rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-110 bg-zinc-900 ${
                          isSelected 
                            ? 'border-[#E50914] scale-105 shadow-md shadow-[#E50914]/30' 
                            : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img src={av.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleAddOrEditProfile}
                  disabled={!newProfileName.trim()}
                  className="flex-grow flex items-center justify-center py-3 bg-[#E50914] hover:bg-red-700 text-white font-extrabold rounded-xl text-sm uppercase tracking-wider cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed transition-all active:scale-98"
                >
                  <Check className="w-4 h-4 mr-2" /> Salvar
                </button>

                {editingProfile && (
                  <button 
                    onClick={() => handleDeleteProfile(editingProfile.id)}
                    className="px-4 bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-500 border border-zinc-850 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    title="Excluir Perfil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
