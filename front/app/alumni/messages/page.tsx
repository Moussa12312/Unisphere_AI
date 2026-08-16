'use client';
import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Loader2, Users, Search, Check,
  CheckCheck, Clock, Paperclip
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

import MessagesPage from '@/components/messages/MessagesPage';
import { Mail, GraduationCap } from 'lucide-react';

interface Conversation {
  connection_id: number;
  user_id: number;
  name: string;
  avatar: string | null;
  type: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function AlumniMessagesPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'mentor'>('general');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    loadConversations();
    
    // Polling pour les nouveaux messages
    const interval = setInterval(() => {
      if (selectedConvo) loadMessages(selectedConvo.connection_id);
      loadConversations();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const res = await api.get('/api/v1/alumni/chat/conversations');
      setConversations(res.data || []);
    } catch (error) {
      console.error('Erreur conversations:', error);
    } finally {
      setLoadingConvos(false);
    }
  };

  const loadMessages = async (connectionId: number) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/api/v1/alumni/chat/${connectionId}`);
      setMessages(res.data || []);
    } catch (error) {
      console.error('Erreur messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const selectConversation = (convo: Conversation) => {
    setSelectedConvo(convo);
    loadMessages(convo.connection_id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo) return;
    
    setSending(true);
    try {
      await api.post('/api/v1/alumni/chat/send', {
        receiver_id: selectedConvo.user_id,
        content: newMessage.trim()
      });
      setNewMessage('');
      loadMessages(selectedConvo.connection_id);
      loadConversations();
    } catch (error: any) {
      toast.error('Erreur d\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConvos = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'general'
              ? 'bg-white text-[#FF6B00] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail size={16} />
          Messagerie Université
        </button>
        <button
          onClick={() => setActiveTab('mentor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'mentor'
              ? 'bg-white text-[#FF6B00] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap size={16} />
          Réseau Mentorat
        </button>
      </div>

      {activeTab === 'general' ? (
        <MessagesPage roleLabel="Alumni" />
      ) : (
        <div className="h-[calc(100vh-12rem)]">
          <div className="bg-white rounded-2xl border border-slate-200 h-full flex overflow-hidden">
            {/* Sidebar conversations */}
            <div className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <MessageSquare size={20} className="text-[#FF6B00]" />
              Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[#FF6B00]" />
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : (
              filteredConvos.map((convo) => (
                <button
                  key={convo.connection_id}
                  onClick={() => selectConversation(convo)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 ${
                    selectedConvo?.connection_id === convo.connection_id ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {convo.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 truncate">{convo.name}</p>
                      {convo.last_message_at && (
                        <span className="text-xs text-slate-400">
                          {formatTime(convo.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-slate-500 truncate">
                        {convo.last_message || 'Aucun message'}
                      </p>
                      {convo.unread_count > 0 && (
                        <span className="w-5 h-5 bg-[#FF6B00] text-white text-xs rounded-full flex items-center justify-center">
                          {convo.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Zone de messages */}
        <div className="flex-1 flex flex-col">
          {selectedConvo ? (
            <>
              {/* Header conversation */}
              <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                  {selectedConvo.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedConvo.name}</p>
                  <p className="text-xs text-slate-500">
                    {selectedConvo.type === 'mentor' ? '🎓 Mentoré' : 
                     selectedConvo.type === 'directeur_memoire' ? '📚 Étudiant mémoire' : '🤝 Ami'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={24} className="animate-spin text-[#FF6B00]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <p>Aucun message. Envoyez le premier !</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                            isMine
                              ? 'bg-[#FF6B00] text-white rounded-br-sm'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            isMine ? 'text-orange-100' : 'text-slate-400'
                          }`}>
                            <span className="text-[10px]">
                              {formatTime(msg.created_at)}
                            </span>
                            {isMine && (
                              msg.is_read 
                                ? <CheckCheck size={12} /> 
                                : <Check size={12} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input message */}
              <div className="p-4 border-t border-slate-200">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Écrivez votre message..."
                    rows={1}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="font-medium">Sélectionnez une conversation</p>
                <p className="text-sm mt-1">pour commencer à discuter</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  )}
</div>
);
}