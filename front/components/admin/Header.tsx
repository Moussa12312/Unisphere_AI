'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, Mail, LogOut, User, Settings, ChevronDown, 
  Menu, X, CheckCircle, Trash2, History
} from 'lucide-react';
import api from '@/lib/api';
import { messageService } from '@/services/messageService';
import MessageDropdown from '@/components/admin/MessageDropdown';
import { getPageTitle, getBreadcrumb } from '@/lib/pageTitles';
import GlobalSearch from '@/components/admin/GlobalSearch';
import { useMinWidth, useMaxWidth } from '@/hooks/useMediaQuery';

interface HeaderProps {
  user?: any;
  isDesktop?: boolean;
  onToggleSidebar?: () => void;
}

// ✅ Helper : vérifier si l'utilisateur est authentifié
const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
};

export default function Header({ user: propUser, isDesktop = false, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isLargeDesktop = useMinWidth(960); 
  const isMobile = useMaxWidth(600); 
  const isCompactHeader = useMaxWidth(840);   
  
  const [user, setUser] = useState<any>(propUser);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMsgDropdown, setShowMsgDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const showSearch = isLargeDesktop || isMobile;

  // ==========================================
  // Chargement de l'utilisateur
  // ==========================================
  useEffect(() => {
    if (!user && !propUser) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          console.error('Erreur parsing user:', e);
        }
      }
    }
  }, [propUser]);

  // ==========================================
  // Chargement des notifications + polling
  // ==========================================
  useEffect(() => {
    const load = async () => {
      // ✅ Arrêter si pas connecté
      if (!isAuthenticated()) {
        setNotifications([]);
        return;
      }
      
      try {
        const response = await api.get('/api/v1/notifications/?limit=50');
        setNotifications(response.data || []);
      } catch (error: any) {
        // ✅ Silencieux sur erreurs réseau, 401 ou 403
        setNotifications([]);
      }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // Chargement des messages non lus + polling
  // ==========================================
  useEffect(() => {
    const loadUnreadMessages = async () => {
      // ✅ Arrêter si pas connecté
      if (!isAuthenticated()) {
        setUnreadMessages(0);
        return;
      }
      
      try {
        const data = await messageService.getUnreadCount();
        setUnreadMessages(data.unread_count || 0);
      } catch (error: any) {
        // ✅ Silencieux sur erreurs réseau, 401 ou 403
        setUnreadMessages(0);
      }
    };

    
    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // Fermer les dropdowns en cliquant à l'extérieur
  // ==========================================
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

  // ==========================================
  // Fonctions de notifications
  // ==========================================
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
      await api.put('/api/v1/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error: any) {
      console.error('❌ Erreur mark-all-read:', error.response?.data);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/api/v1/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // ==========================================
  // Fonctions de déconnexion
  // ==========================================
  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // ==========================================
  // Variables dérivées
  // ==========================================
  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U';
  const displayName = user?.full_name || 'Utilisateur';
  const unreadNotifCount = notifications.filter((n: any) => !n.is_read).length;
  const pageInfo = getPageTitle(pathname);
  const breadcrumb = getBreadcrumb(pathname);
  const PageIcon = pageInfo.icon;

  // ==========================================
  // Fonction utilitaire pour l'icône de notification
  // ==========================================
  const getNotifIcon = (notif: any) => {
    if (notif.title?.includes('🎓')) return '🎓';
    if (notif.title?.includes('📚')) return '📚';
    if (notif.title?.includes('⚠️')) return '⚠️';
    if (notif.title?.includes('✅')) return '✅';
    if (notif.title?.includes('❌')) return '❌';
    if (notif.title?.includes('📄')) return '📄';
    if (notif.title?.includes('🎉')) return '🎉';
    if (notif.title?.includes('📝')) return '📝';
    if (notif.title?.includes('💰')) return '💰';
    return '🔔';
  };

  return (
    <header className="flex-shrink-0 ">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        
        {/* Bouton menu mobile */}
        {!isDesktop && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
        )}

        {/* TITRE DE PAGE + BARRE DE RECHERCHE */}
        {isDesktop ? (
          <div className="flex-1 flex items-center gap-4 min-w-0">
            <div className={`flex items-center gap-3 min-w-0 ${
              showSearch ? 'pr-4 border-r border-slate-200' : ''
            }`}>
              <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B00]/10 to-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <PageIcon size={18} className="text-[#FF6B00]" />
              </div>
              
              <div className="min-w-0">
                {breadcrumb.length > 1 && (
                  <nav className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    {breadcrumb.slice(0, -1).map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        {idx > 0 && <span>/</span>}
                        <Link 
                          href={item.href} 
                          className="hover:text-[#FF6B00] transition-colors"
                        >
                          {item.label}
                        </Link>
                      </span>
                    ))}
                  </nav>
                )}
                
                <h1 className="font-bold text-slate-900 text-base truncate leading-tight">
                  {pageInfo.title}
                </h1>
                {pageInfo.subtitle && (
                  <p className="text-xs text-slate-500 truncate leading-tight">
                    {pageInfo.subtitle}
                  </p>
                )}
              </div>
            </div>
            
            {showSearch && <GlobalSearch />}
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B00]/10 to-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <PageIcon size={16} className="text-[#FF6B00]" />
            </div>
            <h1 className="font-bold text-slate-900 text-sm truncate flex-1">
              {pageInfo.title}
            </h1>
            {isMobile && <GlobalSearch compact />}
          </div>
        )}

        {/* ACTIONS (Notifications, Messages, Profil) */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* NOTIFICATIONS */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifDropdown(!showNotifDropdown);
                setShowMsgDropdown(false);
                setShowProfileMenu(false);
              }}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>
            
            {showNotifDropdown && (
              <>
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowNotifDropdown(false)}
                />
                
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-auto sm:w-96 max-h-[70vh] bg-white sm:border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between flex-shrink-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Bell size={16} />
                      Notifications
                      {unreadNotifCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {unreadNotifCount}
                        </span>
                      )}
                    </h3>
                    <button 
                      onClick={() => setShowNotifDropdown(false)}
                      className="sm:hidden p-1 hover:bg-slate-100 rounded"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      <>
                        {unreadNotifCount > 0 && (
                          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 sticky top-0 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllAsRead();
                              }}
                              className="text-xs text-[#FF6B00] hover:text-[#e55f00] font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle size={13} />
                              Tout marquer comme lu ({unreadNotifCount})
                            </button>
                          </div>
                        )}
                        
                        {notifications
                          .sort((a, b) => {
                            if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
                            const dateA = new Date(a.created_at || a.time || 0).getTime();
                            const dateB = new Date(b.created_at || b.time || 0).getTime();
                            return dateB - dateA;
                          })
                          .slice(0, 15)
                          .map((notif: any, idx: number) => (
                            <div 
                              key={notif.id || idx} 
                              onClick={(e) => {
                                e.stopPropagation();
                                !notif.is_read && markAsRead(notif.id);
                              }}
                              className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all cursor-pointer group relative ${
                                !notif.is_read 
                                  ? 'bg-gradient-to-r from-orange-50/50 to-transparent' 
                                  : 'bg-white opacity-70'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                                  !notif.is_read ? 'bg-orange-100' : 'bg-slate-100'
                                }`}>
                                  {getNotifIcon(notif)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm leading-tight ${
                                      !notif.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'
                                    }`}>
                                      {notif.title}
                                    </p>
                                    {!notif.is_read && (
                                      <div className="w-2 h-2 bg-[#FF6B00] rounded-full flex-shrink-0 mt-1.5 animate-pulse" />
                                    )}
                                  </div>
                                  
                                  <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                                    !notif.is_read ? 'text-slate-700' : 'text-slate-400'
                                  }`}>
                                    {notif.message || notif.content}
                                  </p>
                                  
                                  <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {notif.time || (notif.created_at ? new Date(notif.created_at).toLocaleString('fr-FR', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : '')}
                                    </p>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notif.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all text-xs"
                                      title="Supprimer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </>
                    ) : (
                      <div className="px-4 py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell size={28} className="text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">Aucune notification</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Vous serez notifié des événements importants
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="border-t border-slate-200 p-3 bg-slate-50">
                      <Link 
                        href={`/${user?.role}/notifications`}
                        onClick={() => setShowNotifDropdown(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <History size={14} />
                        Voir tout l'historique ({notifications.length})
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* MESSAGES */}
          <div className="relative" ref={msgRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
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

          {/* PROFIL */}
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
              
              {isDesktop && !isCompactHeader && (
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
                       user?.role === 'student' ? 'Étudiant' : 
                       user?.role === 'alumni' ? 'Alumni' : 'Utilisateur'} 
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
                <div className="fixed sm:absolute left-0 sm:left-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-full sm:w-56 bg-white sm:border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
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
                      href={`/${user?.role}/profile`} 
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User size={16} />
                      Mon profil
                    </Link>
                    <Link 
                      href={`/${user?.role}/settings`} 
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Settings size={16} />
                      Paramètres
                    </Link>
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
      
      {/* Modal de confirmation de déconnexion */}
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