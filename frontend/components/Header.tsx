'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Mail, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface HeaderProps {
  user?: any;
}

export default function Header({ user: propUser }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(propUser);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMsgDropdown, setShowMsgDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user && !propUser) {
      const userStr = localStorage.getItem('user');
      if (userStr) setUser(JSON.parse(userStr));
    }
  }, [propUser]);

  useEffect(() => {
    loadNotifications();
    loadMessages();
  }, []);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (msgRef.current && !msgRef.current.contains(event.target as Node)) {
        setShowMsgDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/api/v1/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Erreur notifications:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get('/api/v1/messages/unread');
      setMessages(response.data);
    } catch (error) {
      console.error('Erreur messages:', error);
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);  // Ferme le menu profil
    setShowLogoutConfirm(true); // Affiche la confirmation
  };
  
  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U';
  const displayName = user?.full_name || 'Utilisateur';
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;
  const unreadMsgCount = messages.length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Barre de recherche */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif: any, idx: number) => (
                      <div key={idx} className={`px-4 py-3 border-b border-slate-100 last:border-0 ${!notif.is_read ? 'bg-blue-50' : ''}`}>
                        <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative" ref={msgRef}>
            <button
              onClick={() => setShowMsgDropdown(!showMsgDropdown)}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Mail size={20} />
              {unreadMsgCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {showMsgDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Messages</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {messages.length > 0 ? (
                    messages.map((msg: any, idx: number) => (
                      <div key={idx} className="px-4 py-3 border-b border-slate-100 last:border-0">
                        <p className="text-sm font-medium text-slate-900">{msg.sender_name}</p>
                        <p className="text-sm text-slate-600">{msg.subject}</p>
                        <p className="text-xs text-slate-500 mt-1">{msg.time}</p>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-slate-500">Aucun message</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profil utilisateur */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="w-9 h-9 bg-[#0a1628] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {initial}
              </div>
              <div className="text-sm text-left hidden md:block">
                <p className="font-medium text-slate-900">{displayName}</p>
                <p className="text-slate-500 text-xs">Administrateur</p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <User size={16} />
                    Mon profil
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <Settings size={16} />
                    Paramètres
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Se déconnecter ?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Vous devrez vous reconnecter pour accéder à votre espace.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Oui, se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}