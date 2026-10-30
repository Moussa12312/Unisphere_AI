'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, Mail, LogOut, User, Settings, ChevronDown, 
  Menu, X, CheckCircle, Trash2, History, Sun, Moon, Shield,
  GraduationCap, BookOpen, AlertTriangle, CheckCircle2, XCircle, FileText, Sparkles, CreditCard
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import api, { getMediaUrl } from '@/lib/api';
import { messageService } from '@/services/messageService';
import MessageDropdown from '@/components/admin/MessageDropdown';
import { getPageTitle, getBreadcrumb } from '@/lib/pageTitles';
import GlobalSearch from '@/components/admin/GlobalSearch';
import { useMinWidth, useMaxWidth } from '@/hooks/useMediaQuery';

import { useToast } from '@/components/ToastProvider';
import { useUniversityLogo } from '@/hooks/useUniversityLogo';

interface HeaderProps {
  user?: any;
  isDesktop?: boolean;
  onToggleSidebar?: () => void;
}

// ✅ Helper : son discret d'alerte Web Audio (respecte les préférences sonores de l'utilisateur)
const playAlertSound = () => {
  try {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('app_settings');
    let soundEnabled = true;
    let volume = 70;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.sound_enabled !== undefined) soundEnabled = Boolean(parsed.sound_enabled);
        if (parsed.sound_volume !== undefined) volume = Number(parsed.sound_volume);
      } catch {}
    }
    if (!soundEnabled || volume <= 0) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
    const baseGain = (volume / 100) * 0.22;
    gain.gain.setValueAtTime(baseGain, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Silencieux si bloqué par la politique du navigateur
  }
};

// ✅ Helper : vérifier si l'utilisateur est authentifié
const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
};

export default function Header({ user: propUser, isDesktop = false, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const isLargeDesktop = useMinWidth(960); 
  const isMobile = useMaxWidth(600); 
  const { logoUrl, universityName, slogan } = useUniversityLogo();
  
  const [user, setUser] = useState<any>(propUser);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMsgDropdown, setShowMsgDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const { settings, updateSetting, isDarkMode } = useSettings();

  const handleToggleTheme = () => {
    if (isDarkMode) {
      const baseTheme = (settings.theme || 'dark-orange').replace('dark-', '');
      updateSetting('theme', `light-${baseTheme}`);
    } else {
      const baseTheme = (settings.theme || 'light-orange').replace('light-', '');
      updateSetting('theme', `dark-${baseTheme}`);
    }
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const knownNotifIdsRef = useRef<Set<number>>(new Set());
  const isInitialNotifRef = useRef<boolean>(true);
  const prevUnreadMsgRef = useRef<number | null>(null);
  const isInitialMsgRef = useRef<boolean>(true);
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
  // Chargement des notifications + alerte pop-up écran + actualisation sans recharger
  // ==========================================
  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated()) {
        setNotifications([]);
        return;
      }
      
      try {
        const response = await api.get('/api/v1/notifications/?limit=50');
        const notifList = response.data || [];
        setNotifications(notifList);

        if (isInitialNotifRef.current) {
          knownNotifIdsRef.current = new Set(notifList.map((n: any) => n.id));
          isInitialNotifRef.current = false;
        } else {
          // Détection en direct des nouvelles alertes (ex: notes enseignant, validation censeur)
          const newUnreads = notifList.filter(
            (n: any) => !n.is_read && !knownNotifIdsRef.current.has(n.id)
          );

          if (newUnreads.length > 0) {
            newUnreads.forEach((n: any) => knownNotifIdsRef.current.add(n.id));
            playAlertSound();

            newUnreads.slice(0, 3).forEach((n: any) => {
              const preview = n.message ? (n.message.length > 90 ? n.message.slice(0, 90) + '...' : n.message) : '';
              if (n.type === 'error') {
                toast.error(`${n.title} : ${preview}`);
              } else if (n.type === 'warning') {
                toast.warning(`${n.title} : ${preview}`);
              } else {
                toast.info(`🔔 ${n.title} : ${preview}`);
              }
            });

            // Signal de synchronisation pour rafraîchir les pages sans F5
            window.dispatchEvent(new CustomEvent('unisphere:data_changed', {
              detail: { type: 'notification', items: newUnreads }
            }));
          }
        }
      } catch (error: any) {
        setNotifications([]);
      }
    };

    load();
    const interval = setInterval(load, 4000);
    const onFocus = () => load();
    const onCustomRefresh = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener('unisphere:refresh_notifications', onCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('unisphere:refresh_notifications', onCustomRefresh);
    };
  }, []);

  // ==========================================
  // Chargement des messages non lus + notification pop-up en direct
  // ==========================================
  useEffect(() => {
    const loadUnreadMessages = async () => {
      if (!isAuthenticated()) {
        setUnreadMessages(0);
        return;
      }
      
      try {
        const data = await messageService.getUnreadCount();
        const count = data.unread_count || 0;

        if (isInitialMsgRef.current) {
          prevUnreadMsgRef.current = count;
          isInitialMsgRef.current = false;
        } else if (prevUnreadMsgRef.current !== null && count > prevUnreadMsgRef.current) {
          const diff = count - prevUnreadMsgRef.current;
          playAlertSound();
          toast.info(`📬 ${diff > 1 ? `${diff} nouveaux messages reçus` : 'Nouveau message reçu'} !`);
          
          window.dispatchEvent(new CustomEvent('unisphere:data_changed', {
            detail: { type: 'message', unreadCount: count }
          }));
          window.dispatchEvent(new CustomEvent('unisphere:refresh_messages'));
          prevUnreadMsgRef.current = count;
        } else {
          prevUnreadMsgRef.current = count;
        }

        setUnreadMessages(count);
      } catch (error: any) {
        setUnreadMessages(0);
      }
    };

    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 4000);
    const onFocus = () => loadUnreadMessages();
    const onCustomRefresh = () => loadUnreadMessages();
    window.addEventListener('focus', onFocus);
    window.addEventListener('unisphere:refresh_messages', onCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('unisphere:refresh_messages', onCustomRefresh);
    };
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
      window.dispatchEvent(new CustomEvent('unisphere:refresh_notifications'));
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await api.put('/api/v1/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new CustomEvent('unisphere:refresh_notifications'));
    } catch (error: any) {
      console.error('❌ Erreur mark-all-read:', error.response?.data);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/api/v1/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      window.dispatchEvent(new CustomEvent('unisphere:refresh_notifications'));
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
  const rolePath = user?.role === 'super_admin' ? 'superadmin' : (user?.role || 'admin');
  const unreadNotifCount = notifications.filter((n: any) => !n.is_read).length;
  const pageInfo = getPageTitle(pathname);
  const breadcrumb = getBreadcrumb(pathname);
  const PageIcon = pageInfo.icon;

  // ==========================================
  // Fonction utilitaire pour l'icône de notification
  // ==========================================
  const renderNotifGraphicIcon = (notif: any) => {
    const title = notif.title || '';
    const type = notif.notification_type || notif.type || '';
    if (type === 'payment' || title.includes('Paiement') || title.includes('Frais') || title.includes('💰')) {
      return <CreditCard size={15} className="text-emerald-600" />;
    }
    if (type === 'grade' || title.includes('Note') || title.includes('Bulletin') || title.includes('🎓') || title.includes('📚')) {
      return <GraduationCap size={15} className="text-blue-600" />;
    }
    if (type === 'incident' || title.includes('Alerte') || title.includes('Incident') || title.includes('⚠️')) {
      return <AlertTriangle size={15} className="text-amber-600" />;
    }
    if (title.includes('Rejet') || title.includes('❌') || type === 'error') {
      return <XCircle size={15} className="text-red-500" />;
    }
    if (title.includes('Validé') || title.includes('Accepté') || title.includes('✅') || type === 'success') {
      return <CheckCircle size={15} className="text-emerald-500" />;
    }
    if (type === 'document' || type === 'certificate' || title.includes('Document') || title.includes('📄') || title.includes('📝')) {
      return <FileText size={15} className="text-purple-600" />;
    }
    if (type === 'message' || title.includes('Message') || title.includes('💬')) {
      return <Mail size={15} className="text-[#FF6B00]" />;
    }
    return <Bell size={15} className="text-slate-500" />;
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

        {/* IDENTITÉ SUR MOBILE (LOGO) VS TITRE DE LA PAGE SUR TABLETTE & PC (Audio 2) */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          {/* VERSION MOBILE UNIQUEMENT (< md) : On affiche le logo officiel de l'établissement ou UniSphere AI */}
          <div className="flex items-center gap-2 md:hidden">
            {user?.role === 'super_admin' || user?.role === 'superadmin' ? (
              <>
                <div className="w-8 h-8 bg-[#0a1628] border border-[#FF6B00]/40 rounded-lg flex items-center justify-center text-[#FF6B00] shadow-sm flex-shrink-0">
                  <Shield size={16} />
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate max-w-[130px]">
                  UniSphere AI
                </span>
              </>
            ) : logoUrl ? (
              <>
                <img 
                  src={logoUrl} 
                  alt={universityName} 
                  className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0" 
                />
                <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate max-w-[130px]">
                  {universityName || 'UniSphere AI'}
                </span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0">
                  {universityName ? universityName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate max-w-[130px]">
                  {universityName || 'UniSphere AI'}
                </span>
              </>
            )}
          </div>

          {/* VERSION TABLETTE ET PC (>= md) : On affiche le NOM DE LA PAGE actuelle */}
          <div className="hidden md:flex items-center gap-3 min-w-0">
            {PageIcon && (
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-slate-800 text-[#FF6B00] flex items-center justify-center shadow-xs flex-shrink-0">
                <PageIcon size={20} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-900 dark:text-white text-base lg:text-lg leading-tight truncate">
                {pageInfo?.title || 'UniSphere AI'}
              </h1>
              {pageInfo?.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight truncate">
                  {pageInfo.subtitle}
                </p>
              )}
            </div>
          </div>

          {isDesktop && showSearch && (
            <div className="ml-auto pr-4 hidden lg:block">
              <GlobalSearch />
            </div>
          )}
        </div>

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
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden"
                  onClick={() => setShowNotifDropdown(false)}
                />
                
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-auto sm:w-96 max-h-[82vh] sm:max-h-[72vh] bg-white border border-slate-200/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Bell size={15} className="text-[#FF6B00]" />
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                      {unreadNotifCount > 0 && (
                        <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {unreadNotifCount}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/${rolePath}/notifications`}
                        onClick={() => setShowNotifDropdown(false)}
                        className="text-xs text-[#FF6B00] hover:text-[#e55f00] font-semibold px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1"
                      >
                        <History size={13} />
                        <span>Historique</span>
                      </Link>
                      <button 
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                        aria-label="Fermer"
                      >
                        <X size={18} />
                      </button>
                    </div>
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
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  !notif.is_read ? 'bg-orange-100/80 border border-orange-200' : 'bg-slate-100 border border-slate-200'
                                }`}>
                                  {renderNotifGraphicIcon(notif)}
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
                    <div className="border-t border-slate-200 p-3 bg-slate-50/90">
                      <Link 
                        href={`/${rolePath}/notifications`}
                        onClick={() => setShowNotifDropdown(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white hover:opacity-95 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-orange-500/20"
                      >
                        <History size={14} />
                        Voir tout l'historique complet ({notifications.length})
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

          {/* SÉLECTEUR RAPIDE THÈME : CLAIR / SOMBRE */}
          <button
            onClick={handleToggleTheme}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all dark:text-slate-300 dark:hover:bg-slate-800 flex items-center justify-center"
            title={isDarkMode ? "Passer en Mode Clair (Blanc)" : "Passer en Mode Sombre (Noir & Niveaux profonds)"}
            aria-label="Basculer Mode Clair / Sombre"
          >
            {isDarkMode ? (
              <Sun size={20} className="text-amber-400 hover:scale-110 transition-transform" />
            ) : (
              <Moon size={20} className="text-slate-600 hover:text-slate-900 hover:scale-110 transition-transform" />
            )}
          </button>

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
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-md overflow-hidden relative">
                <span className="select-none">{initial}</span>
                {user?.photo && (
                  <img
                    src={getMediaUrl(user.photo)}
                    alt={displayName}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
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