'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mail, Send, Search, Loader2, Plus, X,
  ArrowLeft, Paperclip, Smile, MoreVertical, Phone, Video,
  Check, CheckCheck, Circle, Trash2, Star,
  Bell, BellOff, Info, Image, FileText, Upload
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  recipient_name: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string;
  attachment_name?: string;
}

interface Conversation {
  user_id: number;
  user_name: string;
  user_role: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
}

interface MessagesPageProps {
  roleLabel?: string;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '❤️', '🔥', '⭐',
  '🎉', '🎊', '💯', '✅', '❌', '⚠️', '💡', '📚', '🎓', '📝'
];

export default function MessagesPage({ roleLabel = 'utilisateur' }: MessagesPageProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showCallModal, setShowCallModal] = useState<'phone' | 'video' | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [newMessageIds, setNewMessageIds] = useState<Set<number>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    content: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousMessagesCountRef = useRef<number>(0);

  // ✅ INITIALISATION
  useEffect(() => {
    initPage();
  }, []);

  // ✅ POLLING MESSAGES (toutes les 3 secondes)
  useEffect(() => {
    if (currentUserId === 0) return;
    const interval = setInterval(() => {
      silentRefresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUserId, selectedConversation]);

  // ✅ HEARTBEAT (toutes les 30 secondes)
  useEffect(() => {
    if (currentUserId === 0) return;

    const sendHeartbeat = async () => {
      try {
        await api.post('/api/v1/auth/heartbeat');
      } catch (error) {
        // Silent fail
      }
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeatInterval);
  }, [currentUserId]);

  // ✅ FETCH ONLINE USERS (toutes les 10 secondes)
  useEffect(() => {
    if (currentUserId === 0) return;

    const fetchOnlineUsers = async () => {
      try {
        const response = await api.get('/api/v1/auth/online-users');
        const ids = new Set<number>(
          (response.data.online_users || []).map((u: any) => Number(u.id))
        );
        setOnlineUsers(ids);
      } catch (error) {
        // Silent fail
      }
    };

    fetchOnlineUsers();
    const onlineInterval = setInterval(fetchOnlineUsers, 10000);
    return () => clearInterval(onlineInterval);
  }, [currentUserId]);

  // ✅ SCROLL AUTO
  useEffect(() => {
    if (selectedConversation && selectedConversation.messages.length > previousMessagesCountRef.current) {
      scrollToBottom();
    }
    previousMessagesCountRef.current = selectedConversation?.messages.length || 0;
  }, [selectedConversation?.messages.length]);

  // ✅ FERMER MENUS AU CLIC EXTÉRIEUR
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-picker') && !target.closest('.emoji-button')) {
        setShowEmojiPicker(false);
      }
      if (!target.closest('.attachment-menu') && !target.closest('.attachment-button')) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // FONCTIONS
  // ==========================================

  const initPage = async () => {
    const userId = await getCurrentUserId();
    setCurrentUserId(userId);

    if (userId === 0) {
      toast.error('Impossible de récupérer votre ID');
      setLoading(false);
      return;
    }

    await loadConversations(userId);
    await loadUsers();
  };

  const getCurrentUserId = async (): Promise<number> => {
    try {
      const response = await api.get('/api/v1/auth/me');
      return response.data.id;
    } catch (error) {
      console.error('❌ Erreur récupération user:', error);
      return 0;
    }
  };

  const buildConversationsFromMessages = (allMessages: any[], userId: number) => {
    const conversationsMap = new Map<number, Conversation>();

    allMessages.forEach((msg: any) => {
      if (msg.sender_id !== userId && msg.recipient_id !== userId) return;

      const isSender = msg.sender_id === userId;
      const otherUserId = isSender ? msg.recipient_id : msg.sender_id;
      const otherUserName = isSender
        ? (msg.recipient_name || 'Destinataire inconnu')
        : (msg.sender_name || 'Expéditeur inconnu');

      if (!otherUserId) return;

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          user_id: otherUserId,
          user_name: otherUserName,
          user_role: msg.sender_role || msg.recipient_role || 'user',
          last_message: msg.content || '',
          last_message_time: msg.created_at || new Date().toISOString(),
          unread_count: 0,
          messages: []
        });
      }

      const conv = conversationsMap.get(otherUserId)!;
      conv.messages.push(msg);

      if (!msg.is_read && msg.recipient_id === userId) {
        conv.unread_count++;
      }

      if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
        conv.last_message = msg.content || '';
        conv.last_message_time = msg.created_at;
      }
    });

    conversationsMap.forEach(conv => {
      conv.messages.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const list = Array.from(conversationsMap.values());
    list.sort((a, b) =>
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );

    return list;
  };

  const loadConversations = async (userId: number = currentUserId) => {
    if (userId === 0) return;
    setLoading(true);
    try {
      const [inboxRes, sentRes] = await Promise.all([
        api.get('/api/v1/messages/inbox').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/messages/sent').catch(() => ({ data: { data: [] } }))
      ]);

      const allMessages = [
        ...(inboxRes.data?.data || []),
        ...(sentRes.data?.data || [])
      ];

      setConversations(buildConversationsFromMessages(allMessages, userId));
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      const [inboxRes, sentRes] = await Promise.all([
        api.get('/api/v1/messages/inbox').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/messages/sent').catch(() => ({ data: { data: [] } }))
      ]);

      const allMessages = [
        ...(inboxRes.data?.data || []),
        ...(sentRes.data?.data || [])
      ];

      const list = buildConversationsFromMessages(allMessages, currentUserId);

      if (selectedConversation) {
        const updatedConv = list.find(c => c.user_id === selectedConversation.user_id);
        if (updatedConv && updatedConv.messages.length > selectedConversation.messages.length) {
          const newMsgs = updatedConv.messages.slice(selectedConversation.messages.length);
          const newIds = new Set(newMsgs.map(m => m.id));
          setNewMessageIds(newIds);

          if (soundEnabled) playNotificationSound();
          setTimeout(() => setNewMessageIds(new Set()), 2000);

          setSelectedConversation(updatedConv);
        }
      }

      setConversations(list);
    } catch (error) {
      // Silent fail pour le polling
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYmFbF1fdJivrJBhNjVgodDbm2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DwvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LdjHAU2j9XzznksBQB');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/v1/messages/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMenu(false);

    const unreadMessages = conv.messages.filter(
      m => !m.is_read && m.recipient_id === currentUserId
    );

    for (const msg of unreadMessages) {
      try {
        await api.put(`/api/v1/messages/${msg.id}/read`);
      } catch (error) {}
    }

    setTimeout(() => loadConversations(), 500);
  };

  const handleSendMessage = async (attachmentFile?: File) => {
    if ((!newMessage.trim() && !attachmentFile) || !selectedConversation) return;

    setSending(true);
    try {
      let attachmentUrl = null;
      let attachmentName = null;

      if (attachmentFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', attachmentFile);

        const uploadRes = await api.post('/api/v1/messages/upload', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        attachmentUrl = uploadRes.data.url;
        attachmentName = uploadRes.data.filename;
      }

      await api.post('/api/v1/messages/', {
        recipient_id: selectedConversation.user_id,
        subject: 'Message',
        content: newMessage || (attachmentName ? `📎 ${attachmentName}` : ''),
        attachment_url: attachmentUrl,
        attachment_name: attachmentName
      });

      setNewMessage('');

      setTimeout(async () => {
        const [inboxRes, sentRes] = await Promise.all([
          api.get('/api/v1/messages/inbox').catch(() => ({ data: { data: [] } })),
          api.get('/api/v1/messages/sent').catch(() => ({ data: { data: [] } }))
        ]);

        const allMessages = [
          ...(inboxRes.data?.data || []),
          ...(sentRes.data?.data || [])
        ];

        const list = buildConversationsFromMessages(allMessages, currentUserId);
        setConversations(list);

        const updatedConv = list.find(c => c.user_id === selectedConversation.user_id);
        if (updatedConv) {
          setSelectedConversation(updatedConv);
        }

        setTimeout(() => scrollToBottom(), 100);
      }, 300);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 Mo)');
      return;
    }

    setShowAttachmentMenu(false);
    setUploading(true);

    try {
      await handleSendMessage(file);
      toast.success('Fichier envoyé !');
    } catch (error) {
      toast.error("Erreur d'envoi du fichier");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNewConversation = async () => {
    if (!formData.recipient_id || !formData.subject || !formData.content) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSending(true);
    try {
      await api.post('/api/v1/messages/', {
        recipient_id: parseInt(formData.recipient_id),
        subject: formData.subject,
        content: formData.content
      });

      toast.success('Message envoyé !');
      setShowCompose(false);
      setFormData({ recipient_id: '', subject: '', content: '' });
      loadConversations();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (conv: Conversation) => {
    if (!confirm(`Supprimer la conversation avec ${conv.user_name} ?`)) return;

    try {
      for (const msg of conv.messages) {
        await api.delete(`/api/v1/messages/${msg.id}`).catch(() => {});
      }
      toast.success('Conversation supprimée');
      if (selectedConversation?.user_id === conv.user_id) {
        setSelectedConversation(null);
      }
      loadConversations();
    } catch (error) {
      toast.error('Erreur de suppression');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const filteredConversations = conversations.filter(conv => {
    const userName = (conv.user_name || '').toLowerCase();
    const lastMessage = (conv.last_message || '').toLowerCase();
    const searchTerm = search.toLowerCase();
    return userName.includes(searchTerm) || lastMessage.includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mail size={24} className="text-white" />
            </div>
            Messages
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <Circle size={8} fill="currentColor" className="animate-pulse" />
              En direct
            </span>
          </h1>
          <p className="text-slate-500 mt-1">
            Conversations en temps réel • {onlineUsers.size} utilisateur{onlineUsers.size > 1 ? 's' : ''} en ligne
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl transition-colors ${
              soundEnabled
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            {soundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] text-white rounded-xl text-sm font-medium shadow-md"
          >
            <Plus size={16} />
            Nouvelle conversation
          </button>
        </div>
      </div>

      {/* Interface de chat */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex">
        {/* Sidebar */}
        <div className={`w-full md:w-96 border-r border-slate-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="🔍 Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <Mail size={48} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Aucune conversation</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredConversations.map((conv) => {
                  const isOnline = onlineUsers.has(conv.user_id);
                  return (
                    <div
                      key={conv.user_id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-all ${
                        selectedConversation?.user_id === conv.user_id
                          ? 'bg-orange-50 border-l-4 border-[#FF6B00]'
                          : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                            {getInitials(conv.user_name)}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                          )}
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {conv.user_name || 'Utilisateur'}
                            </p>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {formatTime(conv.last_message_time)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {conv.last_message || 'Aucun message'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Zone de chat */}
        <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Header conversation */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {getInitials(selectedConversation.user_name)}
                    </div>
                    {onlineUsers.has(selectedConversation.user_id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedConversation.user_name}</p>
                    <p className={`text-xs flex items-center gap-1 ${
                      onlineUsers.has(selectedConversation.user_id) ? 'text-green-600' : 'text-slate-500'
                    }`}>
                      <Circle size={8} fill="currentColor" />
                      {onlineUsers.has(selectedConversation.user_id) ? 'En ligne' : 'Hors ligne'}
                      {' • '}{selectedConversation.user_role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 relative">
                  <button
                    onClick={() => setShowCallModal('phone')}
                    className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    onClick={() => setShowCallModal('video')}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                  >
                    <Video size={18} />
                  </button>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {showMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                      <button
                        onClick={() => {
                          toast.info(`Profil de ${selectedConversation.user_name}`);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Info size={16} />
                        Voir le profil
                      </button>
                      <button
                        onClick={() => {
                          toast.info('Fonctionnalité à venir');
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Star size={16} />
                        Favoris
                      </button>
                      <hr className="my-1 border-slate-200" />
                      <button
                        onClick={() => {
                          handleDeleteConversation(selectedConversation);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
                {selectedConversation.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Mail size={64} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">Démarrez la conversation !</p>
                    </div>
                  </div>
                ) : (
                  selectedConversation.messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    const isNew = newMessageIds.has(msg.id);

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isNew ? 'animate-bounce' : ''}`}
                      >
                        <div className="max-w-[70%]">
                          <div
                            className={`px-4 py-2 rounded-2xl shadow-sm ${
                              isMe
                                ? 'bg-gradient-to-br from-[#FF6B00] to-orange-500 text-white rounded-br-sm'
                                : 'bg-white text-slate-900 rounded-bl-sm border border-slate-200'
                            }`}
                          >
                            {msg.attachment_url && (
                              <div className={`mb-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {msg.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={msg.attachment_url}
                                    alt={msg.attachment_name}
                                    className="max-w-full rounded-lg max-h-48"
                                  />
                                ) : (
                                  <a
                                    href={msg.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-sm ${isMe ? 'text-white' : 'text-blue-600'} hover:underline`}
                                  >
                                    <FileText size={16} />
                                    {msg.attachment_name || 'Fichier'}
                                  </a>
                                )}
                              </div>
                            )}

                            {msg.content && (
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <p className="text-xs text-slate-400">
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </p>
                            {isMe && (
                              <span className="text-blue-500">
                                {msg.is_read ? <CheckCheck size={12} /> : <Check size={12} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Zone de saisie */}
              <div className="p-4 border-t border-slate-200 bg-white relative">
                {showEmojiPicker && (
                  <div className="emoji-picker absolute bottom-full left-4 mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 w-72 max-h-64 overflow-y-auto z-40">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-2xl hover:bg-slate-100 rounded-lg p-1 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showAttachmentMenu && (
                  <div className="attachment-menu absolute bottom-full left-12 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 w-48 z-40">
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute('accept', 'image/*');
                          fileInputRef.current.click();
                        }
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Image size={16} className="text-blue-600" />
                      Photo
                    </button>
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute('accept', '.pdf,.doc,.docx,.txt');
                          fileInputRef.current.click();
                        }
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileText size={16} className="text-green-600" />
                      Document
                    </button>
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute('accept');
                          fileInputRef.current.click();
                        }
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Upload size={16} className="text-purple-600" />
                      Tout fichier
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="attachment-button p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                  >
                    <Paperclip size={20} />
                  </button>

                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="emoji-button p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                  >
                    <Smile size={20} />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Écrivez votre message..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={sending || uploading || (!newMessage.trim())}
                    className="p-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-full disabled:opacity-50 transition-all"
                  >
                    {sending || uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-[#FF6B00]/10 to-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={48} className="text-[#FF6B00]" />
                </div>
                <p className="text-slate-700 text-xl font-semibold">Vos messages</p>
                <p className="text-slate-400 text-sm mt-2">
                  Sélectionnez une conversation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal appel */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              showCallModal === 'phone' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {showCallModal === 'phone' ? (
                <Phone size={32} className="text-green-600" />
              ) : (
                <Video size={32} className="text-blue-600" />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {showCallModal === 'phone' ? 'Appel vocal' : 'Appel vidéo'}
            </h2>
            <p className="text-slate-500 mb-4">
              Vers {selectedConversation?.user_name}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-yellow-800">
                ⚠️ Fonctionnalité WebRTC à venir
              </p>
            </div>
            <button
              onClick={() => setShowCallModal(null)}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal nouvelle conversation */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle conversation</h2>
              <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Destinataire *</label>
                <select
                  value={formData.recipient_id}
                  onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">Sélectionner un destinataire</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sujet *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Sujet de la conversation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Premier message *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  placeholder="Votre message..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCompose(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleNewConversation}
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}