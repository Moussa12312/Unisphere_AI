'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCircle2, Trash2, Search, Filter, RefreshCw,
  Mail, GraduationCap, CreditCard, Megaphone, AlertTriangle,
  ArrowRight, Shield, Clock, CheckCheck, Sparkles, Inbox
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  time?: string;
  extra_data?: any;
}

interface NotificationsHistoryPageProps {
  role: string;
  roleTitle?: string;
}

export default function NotificationsHistoryPage({ role, roleTitle }: NotificationsHistoryPageProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'announcement' | 'grades' | 'financial' | 'message' | 'security'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Chargement des notifications
  const loadNotifications = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await api.get('/api/v1/notifications/?limit=100');
      setNotifications(res.data || []);
      if (showToast) {
        toast.success('Notifications actualisées');
      }
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Polling dynamique toutes les 6 secondes
    const interval = setInterval(() => {
      loadNotifications();
    }, 6000);

    // Actualisation lors du focus sur l'onglet ou d'un événement en temps réel
    const onFocus = () => loadNotifications();
    window.addEventListener('focus', onFocus);
    window.addEventListener('unisphere:data_changed', onFocus);
    window.addEventListener('unisphere:refresh_notifications', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('unisphere:data_changed', onFocus);
      window.removeEventListener('unisphere:refresh_notifications', onFocus);
    };
  }, []);

  // 2. Marquer comme lu
  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/api/v1/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      // Notifier le Header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unisphere:refresh_notifications'));
      }
    } catch (err) {
      toast.error('Erreur lors du marquage');
    }
  };

  // 3. Tout marquer comme lu
  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/v1/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications sont marquées comme lues');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unisphere:refresh_notifications'));
      }
    } catch (err) {
      toast.error('Erreur lors du marquage global');
    }
  };

  // 4. Supprimer une notification
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/v1/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification supprimée');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unisphere:refresh_notifications'));
      }
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // 5. Calcul des compteurs
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  // 6. Filtrage
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Filtre d'onglet
      if (activeTab === 'unread' && n.is_read) return false;
      if (activeTab === 'announcement' && n.notification_type !== 'announcement') return false;
      if (activeTab === 'grades' && !['grade_published', 'grade_validated', 'grade_validation', 'grade_rejected', 'schedule', 'course_assigned'].includes(n.notification_type)) return false;
      if (activeTab === 'financial' && !['payment', 'payment_received', 'payment_overdue'].includes(n.notification_type)) return false;
      if (activeTab === 'message' && !['message', 'broadcast'].includes(n.notification_type)) return false;
      if (activeTab === 'security' && !['incident', 'system_alert'].includes(n.notification_type)) return false;

      // Filtre de recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const messageMatch = (n.message || '').toLowerCase().includes(q);
        return titleMatch || messageMatch;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // 7. Icône & Style par type
  const getVisualBadge = (notif: NotificationItem) => {
    const routeRole = (role === 'super_admin' || role === 'superadmin') ? 'superadmin' : role;
    switch (notif.notification_type) {
      case 'message':
      case 'broadcast':
        return {
          icon: <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
          label: 'Message',
          actionUrl: `/${routeRole}/messages`
        };
      case 'grade_published':
      case 'grade_validated':
      case 'grade_validation':
      case 'grade_rejected':
        return {
          icon: <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
          label: 'Pédagogie',
          actionUrl: routeRole === 'student' ? '/student/grades' : `/${routeRole}/grades`
        };
      case 'payment':
      case 'payment_received':
      case 'payment_overdue':
        return {
          icon: <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
          bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
          label: 'Finances',
          actionUrl: routeRole === 'student' ? '/student/payments' : `/${routeRole}/payments`
        };
      case 'announcement':
        return {
          icon: <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
          bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
          label: 'Annonce',
          actionUrl: routeRole === 'superadmin' ? null : `/${routeRole}/announcements`
        };
      case 'incident':
      case 'system_alert':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
          label: 'Sécurité',
          actionUrl: routeRole === 'guard' ? '/guard/incidents' : `/${routeRole}/incidents`
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
          bg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
          label: 'Information',
          actionUrl: null
        };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* BANNIÈRE SUPÉRIEURE HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-orange-400 border border-white/10 uppercase tracking-wider">
                {roleTitle || role.toUpperCase()}
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Synchronisation en direct
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Bell className="w-8 h-8 text-orange-400" />
              Centre des Notifications
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-1 max-w-xl">
              Consultez l'historique complet de toutes vos alertes académiques, financières, administratives et messages directs.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer lu ({unreadCount})
              </button>
            )}
            <button
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition-all border border-white/10 active:scale-95 disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE & ONGLETS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par mot-clé, cours, montant, expéditeur..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
          />
        </div>

        {/* Onglets tactiles horizontaux avec scroll fluide sur mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-sm font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Toutes
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-700/20 dark:bg-slate-200/20 font-bold">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'unread'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 hover:bg-orange-100'
            }`}
          >
            Non lues
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-white text-orange-700 font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('message')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'message'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Messages
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'grades'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Pédagogie & Notes
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'financial'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Finances
          </button>

          <button
            onClick={() => setActiveTab('announcement')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'announcement'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Annonces
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Sécurité
          </button>
        </div>
      </div>

      {/* LISTE DES NOTIFICATIONS */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Chargement de vos notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucune notification trouvée</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
              {searchQuery ? 'Aucun résultat ne correspond à votre recherche.' : 'Vous êtes totalement à jour ! Aucune alerte active pour le moment.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const visual = getVisualBadge(notif);
            return (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group shadow-sm hover:shadow-md ${
                  !notif.is_read
                    ? 'border-orange-300 dark:border-orange-900/60 bg-gradient-to-r from-orange-50/40 via-white to-white dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-900'
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                {/* Pastille non lue */}
                {!notif.is_read && (
                  <div className="absolute top-3 right-3 sm:static sm:mr-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block animate-pulse" title="Non lu" />
                  </div>
                )}

                {/* Corps de la notification */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${visual.bg}`}>
                    {visual.icon}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {visual.label}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(notif.created_at || notif.time)}
                      </span>
                    </div>

                    <h4 className={`text-base leading-snug break-words ${
                      !notif.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'
                    }`}>
                      {notif.title}
                    </h4>

                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line break-words">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Actions contextuelles */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex-shrink-0">
                  {visual.actionUrl && (
                    <Link
                      href={visual.actionUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Consulter
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <div className="flex items-center gap-1 ml-auto sm:ml-0">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Marquer comme lu"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notif.id);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
