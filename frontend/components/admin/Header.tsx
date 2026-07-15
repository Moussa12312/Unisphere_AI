'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Mail, LogOut, User, Settings, ChevronDown, Menu, X } from 'lucide-react';
import api from '@/lib/api';
import { messageService } from '@/services/messageService';
import MessageDropdown from '@/components/admin/MessageDropdown';

interface HeaderProps {
  user?: any;
  isDesktop?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ user: propUser, isDesktop = false, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(propUser);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMsgDropdown, setShowMsgDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

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
  }, []);

  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const data = await messageService.getUnreadCount();
        setUnreadMessages(data.unread_count || 0);
      } catch (error) {
        console.error(error);
      }
    };
    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Fermer les dropdowns en cliquant à l'extérieur
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

  // ✅ Marquer tout comme lu à l'ouverture
  useEffect(() => {
    if (showNotifDropdown && unreadNotifCount > 0) {
      markAllAsRead();
    }
  }, [showNotifDropdown]);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/api/v1/notifications/');
      setNotifications(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error('Erreur notifications:', error);
      }
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await api.put(`/api/v1/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      console.log('🔔 Appel API mark-all-read...');
      const response = await api.put('/api/v1/notifications/mark-all-read');
      console.log('✅ Réponse backend:', response.data);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error: any) {
      console.error('❌ Erreur:', error.response?.data);
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U';
  const displayName = user?.full_name || 'Utilisateur';
  const unreadNotifCount = notifications.filter((n: any) => !n.is_read && n.id > 0).length;

  return (
    <header className="flex-shrink-0">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        
        {!isDesktop && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
        )}

        {isDesktop && (
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
        )}

        {!isDesktop && <div className="flex-1"></div>}

        <div className="flex items-center gap-1 sm:gap-3">
          
          {/* ✅ NOTIFICATIONS - Avec stopPropagation pour éviter la fermeture auto */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={(e) => {
                e.stopPropagation(); // ✅ Empêche handleClickOutside de se déclencher
                setShowNotifDropdown(!showNotifDropdown);
                setShowMsgDropdown(false);
                setShowProfileMenu(false);
              }}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>
            
            {showNotifDropdown && (
              <>
                {/* ✅ OVERLAY MOBILE - Fixe le problème de clic et de débordement */}
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowNotifDropdown(false)}
                />
                
                {/* ✅ DROPDOWN - Fixed sur mobile, absolute sur desktop */}
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-auto sm:w-80 max-h-[70vh] bg-white sm:border border-slate-200 sm:rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col sm:rounded-xl rounded-xl">
                  <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between flex-shrink-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Bell size={16} />
                      Notifications
                      {unreadNotifCount > 0 && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {unreadNotifCount}
                        </span>
                      )}
                    </h3>
                    {/* ✅ Bouton fermer sur mobile */}
                    <button 
                      onClick={() => setShowNotifDropdown(false)}
                      className="sm:hidden p-1 hover:bg-slate-100 rounded"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      notifications.filter((n: any) => !n.is_read).slice(0, 10).map((notif: any, idx: number) => (
                        <div 
                          key={notif.id || idx} 
                          onClick={() => !notif.is_read && markAsRead(notif.id)}
                          className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            {!notif.is_read && (
                              <div className="w-2 h-2 bg-[#FF6B00] rounded-full mt-1.5 flex-shrink-0"></div>
                            )}
                            <div className="flex-1">
                              <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">{notif.message || notif.content}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {notif.time || (notif.created_at ? new Date(notif.created_at).toLocaleDateString('fr-FR') : '')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          {notifications.length === 0 ? 'Aucune notification' : 'Toutes les notifications ont été lues'}
                        </p>
                        {notifications.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ✅ MESSAGES - Avec stopPropagation */}
          <div className="relative" ref={msgRef}>
            <button
              onClick={(e) => {
                e.stopPropagation(); // ✅ AJOUTE CETTE LIGNE
                setShowMsgDropdown(!showMsgDropdown);
                setShowNotifDropdown(false);
                setShowProfileMenu(false);
              }}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Messagerie"
            >
              <Mail size={20} />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FF6B00] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </button>
            
            {showMsgDropdown && (
              <MessageDropdown onClose={() => setShowMsgDropdown(false)} />
            )}
          </div>

          {/* ✅ PROFIL - Même logique */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(!showProfileMenu);
                setShowNotifDropdown(false);
                setShowMsgDropdown(false);
              }}
              className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-md">
                {initial}
              </div>
              {isDesktop && (
                <>
                  <div className="text-sm text-left hidden sm:block">
                    <p className="font-medium text-slate-900">{displayName}</p>
                    <p className="text-slate-500 text-xs">
                      {user?.role === 'admin' ? 'Administrateur' :
                       user?.role === 'secretary' ? 'Secrétaire' :
                       user?.role === 'censeur' ? 'Censeur' :
                       user?.role === 'accountant' ? 'Comptable' :
                       user?.role === 'guard' ? 'Gardien' :
                       user?.role === 'teacher' ? 'Enseignant' :
                       user?.role === 'student' ? 'Étudiant' : 'Utilisateur'}
                    </p>
                  </div>
                  <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                </>
              )}
            </button>
            
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="fixed sm:absolute left-0 sm:left-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-full sm:w-56 bg-white sm:border border-slate-200 sm:rounded-xl shadow-2xl z-50 overflow-hidden rounded-none sm:rounded-xl">
                  <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button 
                      onClick={() => setShowProfileMenu(false)}
                      className="sm:hidden p-1 hover:bg-slate-100 rounded"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="py-1">
                    <Link 
                      href={`/${user?.role === 'admin' ? 'admin' : user?.role === 'accountant' ? 'accountant' : user?.role === 'secretary' ? 'secretary' : user?.role === 'teacher' ? 'teacher' : user?.role === 'student' ? 'student' : user?.role === 'censeur' ? 'censeur' : 'guard'}/profile`} 
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User size={16} />
                      Mon profil
                    </Link>
                    {user?.role === 'admin' && (
                      <Link 
                        href="/admin/settings" 
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings size={16} />
                        Paramètres
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 mx-4">
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