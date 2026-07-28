import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, UserCircle, Menu, X, Trash2, History, LogOut, Dices, Eye, Users, Puzzle } from 'lucide-react';
import * as Storage from '../services/storageService';

export default function Navbar({ activeTab, setActiveTab, onSearch, onClearList, onClearHistory, onLogout, activeProfile, onChangeProfile, openDetails }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const searchInputRef = useRef(null);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    // Initial notifications check
    const currentInbox = Storage.getInbox();
    setInbox(currentInbox);

    if (currentInbox.length > 0) {
      triggerToast(currentInbox.length);
    }

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClickOutside);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Update inbox state on local storage changes
  const refreshInbox = () => {
    setInbox(Storage.getInbox());
  };

  const triggerToast = (count) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const msg = count === 1 
      ? "Você tem 1 novidade! Confira no sino." 
      : `Você tem ${count} novidades! Confira no sino.`;
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  const handleSearchClick = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchOpen(false);
      setSearchQuery('');
    } else {
      setSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        onSearch(searchQuery.trim());
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
  };

  const handleNotificationItemClick = (e, item) => {
    e.preventDefault();
    Storage.removeFromInbox(item.uniqueId);
    refreshInbox();
    openDetails(item.seriesId, item.type === 'new_ep' ? 'tv' : (item.itemType || 'tv'));
    setNotificationsOpen(false);
  };

  const handleClearNotification = (e, uniqueId) => {
    e.stopPropagation();
    Storage.removeFromInbox(uniqueId);
    refreshInbox();
  };

  const handleClearAllNotifications = () => {
    Storage.clearInbox();
    refreshInbox();
  };

  // Nav items configuration
  const navItems = [
    { id: 'inicio', name: 'Início' },
    { id: 'tv', name: 'Séries' },
    { id: 'movie', name: 'Filmes' },
    { id: 'anime', name: 'Animes' },
    { id: 'minha-lista', name: 'Minha lista' },
    { id: 'sorte', name: 'Sorte', icon: <Dices className="w-4 h-4 mr-1 inline-block" /> },
    { 
      id: 'ao-vivo', 
      name: 'Ao Vivo', 
      icon: <span className="w-2 h-2 rounded-full bg-red-600 mr-1.5 animate-pulse inline-block"></span> 
    }
  ];

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-16 py-4 flex justify-between items-center transition-all duration-300 ${
          scrolled ? 'bg-zinc-950/85 backdrop-blur-md shadow-lg border-b border-zinc-800/30' : 'bg-transparent'
        }`}
      >
        {/* Left Side: Logo */}
        <div className="flex items-center">
          <h1 
            onClick={() => setActiveTab('inicio')} 
            className="text-2xl md:text-3xl font-black text-[#E50914] cursor-pointer tracking-wider hover:brightness-110 transition-all select-none"
          >
            FUDIDOFLIX
          </h1>
        </div>

        {/* Center: Main Tabs Navigation (Desktop) */}
        <nav className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center space-x-1 bg-zinc-900/30 p-1 rounded-full border border-zinc-800/20 backdrop-blur-sm">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`font-semibold text-sm px-4 py-2 rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-white text-black font-extrabold shadow-md scale-105' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Search and Controls */}
        <div className="flex items-center space-x-4">
          {/* Expandable Search Input */}
          <div className="relative flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Títulos, atores, gêneros"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => {
                if (!searchQuery) setSearchOpen(false);
              }}
              className={`bg-zinc-950/80 border border-zinc-800 text-white text-sm rounded-full py-1.5 px-4 focus:outline-none focus:border-white placeholder-zinc-500 transition-all duration-300 ${
                searchOpen ? 'w-28 md:w-44 opacity-100' : 'w-0 opacity-0 pointer-events-none'
              }`}
            />
            <button 
              onClick={handleSearchClick}
              className="p-1 text-zinc-300 hover:text-white transition-colors focus:outline-none"
              aria-label="Buscar"
            >
              <Search className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Notifications bell */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
                refreshInbox();
              }}
              className="p-1 text-zinc-300 hover:text-white transition-colors relative focus:outline-none mt-1"
              aria-label="Notificações"
            >
              <Bell className="w-6 h-6 stroke-[2.2]" />
              {inbox.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#E50914] border-2 border-zinc-950 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Notification drop menu */}
            {notificationsOpen && (
              <div className="absolute top-10 right-0 w-80 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md z-50">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                  <h4 className="font-bold text-white">Novidades</h4>
                  {inbox.length > 0 && (
                    <button 
                      onClick={handleClearAllNotifications}
                      className="text-xs text-zinc-400 hover:text-red-500 font-medium transition-colors"
                    >
                      Limpar Tudo
                    </button>
                  )}
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y divide-zinc-900">
                  {inbox.length === 0 ? (
                    <li className="p-6 text-center text-sm text-zinc-500 font-medium">Você está em dia!</li>
                  ) : (
                    inbox.map(item => (
                      <li key={item.uniqueId} className="flex justify-between items-center p-3 hover:bg-zinc-900/50 transition-colors">
                        <button 
                          onClick={(e) => handleNotificationItemClick(e, item)}
                          className="flex-grow text-left text-sm text-zinc-300 hover:text-white truncate font-medium mr-2"
                        >
                          {item.type === 'new_ep' && (
                            <span><strong className="text-[#E50914] font-bold">Novo Ep:</strong> {item.seriesName} (T{item.season} E{item.episode})</span>
                          )}
                          {item.type === 'continue_watching' && (
                            <span><strong className="text-blue-500 font-bold">Continue:</strong> {item.seriesName}</span>
                          )}
                          {item.type === 'my_list_reminder' && (
                            <span><strong className="text-green-500 font-bold">Da lista:</strong> {item.seriesName}</span>
                          )}
                        </button>
                        <button 
                          onClick={(e) => handleClearNotification(e, item.uniqueId)}
                          className="p-1 text-zinc-500 hover:text-red-500 transition-colors"
                          aria-label="Limpar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Profile options */}
          <div className="relative hidden xl:block" ref={profileRef}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center space-x-2 text-zinc-300 hover:text-white transition-colors focus:outline-none mt-0.5"
              aria-label="Perfil"
            >
              {activeProfile ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700/60 hover:border-zinc-300 transition-all select-none">
                  <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <UserCircle className="w-6 h-6 stroke-[2.2]" />
              )}
            </button>

            {profileOpen && (
              <div className="absolute top-10 right-0 w-52 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 backdrop-blur-md z-50">
                <button 
                  onClick={() => { setProfileOpen(false); onClearList(); }}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center transition-colors font-medium border-b border-zinc-900/40"
                >
                  <Trash2 className="w-4 h-4 mr-3 text-zinc-500" />
                  Limpar Minha Lista
                </button>
                <button 
                  onClick={() => { setProfileOpen(false); onClearHistory(); }}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center transition-colors font-medium border-b border-zinc-900/40"
                >
                  <History className="w-4 h-4 mr-3 text-zinc-500" />
                  Limpar Histórico
                </button>
                <button 
                  onClick={() => { setProfileOpen(false); setActiveTab('historico'); }}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center transition-colors font-medium border-b border-zinc-900/40"
                >
                  <History className="w-4 h-4 mr-3 text-[#E50914]" />
                  Meu Histórico
                </button>
                <button 
                  onClick={() => { setProfileOpen(false); onChangeProfile(); }}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900/60 hover:text-white flex items-center transition-colors font-medium border-b border-zinc-900/40"
                >
                  <Users className="w-4 h-4 mr-3 text-zinc-500" />
                  Trocar Perfil
                </button>
                <button 
                  onClick={() => { setProfileOpen(false); onLogout(); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 flex items-center transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Deslogar da Sessão
                </button>
              </div>
            )}
          </div>

          {/* Hamburger button for mobile */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="xl:hidden p-1 text-zinc-300 hover:text-white transition-colors focus:outline-none"
            aria-label="Menu"
          >
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Panel Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] xl:hidden flex">
          {/* Overlay backdrop */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          ></div>
          
          <div className="absolute top-0 right-0 h-full w-72 max-w-[80vw] bg-zinc-950 border-l border-zinc-800/80 shadow-2xl flex flex-col z-10 transition-transform">
            <div className="flex justify-between items-center p-4 border-b border-zinc-900">
              <h3 className="text-xl font-black text-white">Menu</h3>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-zinc-400 hover:text-white focus:outline-none"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left font-semibold text-lg p-3 rounded-xl flex items-center transition-all ${
                      isActive 
                        ? 'bg-white text-black font-extrabold shadow-md' 
                        : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className={item.icon ? 'ml-1' : ''}>{item.name}</span>
                  </button>
                );
              })}
              
              <hr className="border-zinc-900 my-4" />
              
              {activeProfile && (
                <div className="flex items-center px-3 py-4 border-b border-zinc-900/40 mb-2 select-none">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-700/60 mr-3 flex-shrink-0">
                    <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover animate-fade-in" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-white text-base leading-none truncate">{activeProfile.name}</h5>
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-1 block">Perfil Ativo</span>
                  </div>
                </div>
              )}

              <h4 className="text-zinc-500 text-xs font-bold px-3 pb-2 uppercase tracking-wider">Configurações</h4>
              <button 
                onClick={() => { setMobileMenuOpen(false); onClearList(); }}
                className="w-full text-left p-3 rounded-xl hover:bg-zinc-900/60 text-zinc-300 flex items-center text-base font-medium transition-colors"
              >
                <Trash2 className="w-5 h-5 mr-3 text-zinc-500" />
                Limpar Minha Lista
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onClearHistory(); }}
                className="w-full text-left p-3 rounded-xl hover:bg-zinc-900/60 text-zinc-300 flex items-center text-base font-medium transition-colors"
              >
                <History className="w-5 h-5 mr-3 text-zinc-500" />
                Limpar Histórico
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); setActiveTab('historico'); }}
                className="w-full text-left p-3 rounded-xl hover:bg-zinc-900/60 text-zinc-300 flex items-center text-base font-medium transition-colors"
              >
                <History className="w-5 h-5 mr-3 text-[#E50914]" />
                Meu Histórico
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onChangeProfile(); }}
                className="w-full text-left p-3 rounded-xl hover:bg-zinc-900/60 text-zinc-300 flex items-center text-base font-medium transition-colors"
              >
                <Users className="w-5 h-5 mr-3 text-zinc-500" />
                Trocar Perfil
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className="w-full text-left p-3 rounded-xl hover:bg-red-500/10 text-red-500 flex items-center text-base font-bold transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Deslogar da Sessão
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      <div 
        className={`fixed bottom-6 left-6 z-[100] w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl transition-all duration-300 transform ${
          showToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <div className="p-2.5 bg-red-500/15 rounded-xl mr-3 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-500 animate-bounce" />
            </div>
            <span className="text-sm font-medium text-zinc-200">{toastMessage}</span>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="p-1 text-zinc-500 hover:text-white transition-colors focus:outline-none"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
