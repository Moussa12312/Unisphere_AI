'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {MessageSquare, Mail, MailOpen, Star, Trash2, CheckCircle2, X, Loader2, Eye, Send, Users} from 'lucide-react';
import { messageService, Message } from '@/services/messageService';
import { useToast } from '@/components/ToastProvider';
import api from '@/lib/api';
import Link from 'next/link';

interface MessageDropdownProps {
  user?: any;
  onClose: () => void;
}

export default function MessageDropdown({ user: propUser, onClose }: MessageDropdownProps) {
  const toast = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(propUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [view, setView] = useState<'inbox' | 'detail'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!user && !propUser) {
      const userStr = localStorage.getItem('user');
      if (userStr) setUser(JSON.parse(userStr));
    }
  }, [propUser]);
  
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const [inboxData, statsData] = await Promise.all([
        messageService.getInbox(1, false),
        messageService.getStats()
      ]);
      setMessages(inboxData.data?.slice(0, 10) || []);
      setUnreadCount(statsData.inbox_unread || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessage = async (msg: Message) => {
    setSelectedMessage(msg);
    setView('detail');
    
    if (!msg.is_read) {
      try {
        await messageService.markAsRead(msg.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDelete = async (messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await messageService.delete(messageId);
      toast.success('Message supprimé');
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setView('inbox');
        setSelectedMessage(null);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await messageService.markAllAsRead();
      toast.success('Tous les messages marqués comme lus');
      setUnreadCount(0);
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getRoleBadge = (role: string | undefined) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'secretary': return 'bg-blue-100 text-blue-700';
      case 'teacher': return 'bg-green-100 text-green-700';
      case 'student': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <>
      {/* ✅ OVERLAY MOBILE - Fond sombre cliquable */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
        onClick={onClose}
      />

      {/* ✅ DROPDOWN RESPONSIVE - Fixed sur mobile, absolute sur desktop */}
      <div
        ref={dropdownRef}
        className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-auto sm:w-[420px] max-h-[80vh] sm:max-h-[600px] bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col"
      >
        {/* Header du dropdown */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} />
              <h3 className="font-bold text-lg">Messagerie</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              <CheckCircle2 size={12} />
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Contenu - scrollable */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#FF6B00]" size={24} />
            </div>
          ) : view === 'detail' && selectedMessage ? (
            <div className="p-4">
              <button
                onClick={() => { setView('inbox'); setSelectedMessage(null); }}
                className="text-xs text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1"
              >
                ← Retour à la liste
              </button>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedMessage.subject}</h4>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">De :</span>
                    <span>{selectedMessage.sender_name}</span>
                    {selectedMessage.sender_role && (
                      <span className={`px-2 py-0.5 rounded ${getRoleBadge(selectedMessage.sender_role)}`}>
                        {selectedMessage.sender_role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <Mail size={10} />
                    {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.content}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={(e) => handleDelete(selectedMessage.id, e)}
                    className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : messages.filter(m => !m.is_read).length === 0 ? (
            <div className="text-center py-12 px-4">
              <MailOpen size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {messages.length === 0 ? 'Aucun message' : 'Tous les messages ont été lus'}
              </p>
              {messages.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {messages.length} message{messages.length > 1 ? 's' : ''} au total
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {messages.filter(m => !m.is_read).slice(0, 10).map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`p-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                    !msg.is_read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!msg.is_read && (
                      <div className="w-2 h-2 bg-[#FF6B00] rounded-full mt-1.5 flex-shrink-0"></div>
                    )}
                    <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {msg.sender_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm truncate ${!msg.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {msg.sender_name}
                        </p>
                        {msg.sender_role && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoleBadge(msg.sender_role)}`}>
                            {msg.sender_role}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${!msg.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {msg.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{msg.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(msg.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(msg.id, e)}
                      className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex-shrink-0">
          <Link
            href={`/${user?.role === 'admin' ? 'admin' : user?.role === 'accountant' ? 'accountant' : user?.role === 'secretary' ? 'secretary' : user?.role === 'teacher' ? 'teacher' : user?.role === 'student' ? 'student' : user?.role === 'censeur' ? 'censeur' : 'guard'}/messages`}
            onClick={onClose}
            className="block w-full text-center px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors"
          >
            Ouvrir la messagerie complète
          </Link>
        </div>
      </div>
    </>
  );
}