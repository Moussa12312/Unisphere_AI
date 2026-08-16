'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send, BrainCircuit, User, Sparkles, Lightbulb, TrendingUp,
  DollarSign, Users, GraduationCap, FileText, HelpCircle,
  Award, Target, BookOpen, Calculator, Shield, Calendar,
  Trash2, Download, Copy, Check, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  source?: string;
}

interface Suggestion {
  icon: any;
  text: string;
  category: string;
  color: string;
}

// ✅ NOUVELLE FONCTION : Convertir Markdown en HTML simple
const renderMarkdown = (text: string): string => {
  if (!text) return '';
  
  let html = text
    // Échapper les caractères HTML dangereux
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Titres (### Titre)
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
    
    // Gras (**texte** ou __texte__)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>')
    
    // Italique (*texte* ou _texte_)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em class="italic">$1</em>')
    
    // Code inline (`code`)
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    
    // Listes à puces (- item ou * item)
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    
    // Listes numérotées (1. item)
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    
    // Lignes vides → saut de ligne
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  
  // ✅ Wraper les listes dans <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>(\s*<br\/?>)?)+/g, (match) => {
    return '<ul class="my-2 space-y-1">' + match.replace(/<br\/?>/g, '') + '</ul>';
  });
  
  return html;
};

export default function AIAssistantPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Bonjour ! 👋 Je suis **UniSphere AI**, votre assistant intelligent.\n\nJe peux vous aider à analyser vos données, répondre à vos questions, et vous proposer des recommandations personnalisées.\n\nQue souhaitez-vous savoir ?",
      sender: 'ai',
      timestamp: new Date(),
      source: 'system'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Erreur parsing user:', e);
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ SUGGESTIONS ADAPTÉES AU RÔLE
  const getSuggestions = (): Suggestion[] => {
    const role = user?.role;

    switch (role) {
      case 'admin':
        return [
          { icon: Users, text: "Combien d'étudiants avons-nous ?", category: "Étudiants", color: "from-blue-500 to-indigo-600" },
          { icon: TrendingUp, text: "Quel est le taux d'assiduité global ?", category: "Assiduité", color: "from-green-500 to-emerald-600" },
          { icon: DollarSign, text: "Quels sont nos revenus totaux ?", category: "Finances", color: "from-orange-500 to-red-600" },
          { icon: GraduationCap, text: "Répartition par filière ?", category: "Filières", color: "from-purple-500 to-pink-600" },
          { icon: Award, text: "Quelles recommandations stratégiques ?", category: "Conseils", color: "from-cyan-500 to-blue-600" },
          { icon: Shield, text: "Analyse de sécurité ?", category: "Sécurité", color: "from-slate-600 to-slate-800" }
        ];

      case 'teacher':
        return [
          { icon: FileText, text: "Génère un examen de 1h30 sur [SUJET]", category: "Examen", color: "from-blue-500 to-indigo-600" },
          { icon: HelpCircle, text: "Crée 20 questions QCM sur [SUJET]", category: "QCM", color: "from-orange-500 to-red-600" },
          { icon: BookOpen, text: "Crée un syllabus pour mon cours", category: "Syllabus", color: "from-purple-500 to-pink-600" },
          { icon: Award, text: "Analyse les résultats de mes cours", category: "Analyse", color: "from-green-500 to-emerald-600" },
          { icon: Target, text: "Crée des exercices pratiques", category: "Exercices", color: "from-cyan-500 to-blue-600" },
          { icon: Lightbulb, text: "Explique un concept difficile", category: "Pédagogie", color: "from-yellow-500 to-orange-600" }
        ];

      case 'student':
        return [
          { icon: Award, text: "Analyse mes résultats scolaires", category: "Résultats", color: "from-blue-500 to-indigo-600" },
          { icon: BookOpen, text: "Crée-moi un plan d'étude", category: "Organisation", color: "from-purple-500 to-pink-600" },
          { icon: TrendingUp, text: "Comment améliorer ma moyenne ?", category: "Conseils", color: "from-green-500 to-emerald-600" },
          { icon: Calendar, text: "Quel est mon taux de présence ?", category: "Présence", color: "from-orange-500 to-red-600" },
          { icon: Sparkles, text: "Donne-moi des conseils de motivation", category: "Motivation", color: "from-yellow-500 to-orange-600" },
          { icon: HelpCircle, text: "Que peux-tu faire pour moi ?", category: "Aide", color: "from-slate-600 to-slate-800" }
        ];

      case 'secretary':
        return [
          { icon: Users, text: "Vue d'ensemble des étudiants", category: "Étudiants", color: "from-blue-500 to-indigo-600" },
          { icon: GraduationCap, text: "Répartition par filière et niveau", category: "Organisation", color: "from-purple-500 to-pink-600" },
          { icon: Lightbulb, text: "Conseils d'organisation", category: "Conseils", color: "from-green-500 to-emerald-600" },
          { icon: FileText, text: "Rapport des inscriptions", category: "Rapports", color: "from-orange-500 to-red-600" },
          { icon: Calendar, text: "Sessions d'examens à venir", category: "Calendrier", color: "from-cyan-500 to-blue-600" },
          { icon: HelpCircle, text: "Que peux-tu faire pour moi ?", category: "Aide", color: "from-slate-600 to-slate-800" }
        ];

      case 'censeur':
        return [
          { icon: FileText, text: "Combien de notes à valider ?", category: "Validation", color: "from-orange-500 to-red-600" },
          { icon: TrendingUp, text: "Quelles anomalies détecter ?", category: "Anomalies", color: "from-red-500 to-pink-600" },
          { icon: Users, text: "Statistiques des notes", category: "Stats", color: "from-blue-500 to-indigo-600" },
          { icon: Award, text: "Analyse de la performance", category: "Analyse", color: "from-green-500 to-emerald-600" },
          { icon: Shield, text: "Recommandations de validation", category: "Conseils", color: "from-purple-500 to-pink-600" },
          { icon: HelpCircle, text: "Que peux-tu faire pour moi ?", category: "Aide", color: "from-slate-600 to-slate-800" }
        ];

      case 'accountant':
        return [
          { icon: DollarSign, text: "Analyse financière complète", category: "Finances", color: "from-green-500 to-emerald-600" },
          { icon: TrendingUp, text: "Quels sont les impayés ?", category: "Impayés", color: "from-orange-500 to-red-600" },
          { icon: Calculator, text: "Taux de recouvrement", category: "Stats", color: "from-blue-500 to-indigo-600" },
          { icon: Award, text: "Stratégies de relance", category: "Conseils", color: "from-purple-500 to-pink-600" },
          { icon: Calendar, text: "Échéances à venir", category: "Calendrier", color: "from-cyan-500 to-blue-600" },
          { icon: HelpCircle, text: "Que peux-tu faire pour moi ?", category: "Aide", color: "from-slate-600 to-slate-800" }
        ];

      case 'guard':
        return [
          { icon: Users, text: "Bilan des présences du jour", category: "Présences", color: "from-blue-500 to-indigo-600" },
          { icon: Shield, text: "Conseils de sécurité", category: "Sécurité", color: "from-purple-500 to-pink-600" },
          { icon: TrendingUp, text: "Statistiques d'assiduité", category: "Stats", color: "from-green-500 to-emerald-600" },
          { icon: Calendar, text: "Événements à surveiller", category: "Calendrier", color: "from-orange-500 to-red-600" },
          { icon: Award, text: "Rapport d'incidents", category: "Rapports", color: "from-red-500 to-pink-600" },
          { icon: HelpCircle, text: "Que peux-tu faire pour moi ?", category: "Aide", color: "from-slate-600 to-slate-800" }
        ];

      default:
        return [
          { icon: HelpCircle, text: "Que peux-tu faire pour moi ?", category: "Aide", color: "from-slate-600 to-slate-800" },
          { icon: Users, text: "Combien d'étudiants ?", category: "Étudiants", color: "from-blue-500 to-indigo-600" },
          { icon: TrendingUp, text: "Statistiques globales", category: "Stats", color: "from-green-500 to-emerald-600" },
          { icon: DollarSign, text: "Situation financière", category: "Finances", color: "from-orange-500 to-red-600" }
        ];
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/v1/ai-assistant/chat', {
        message: text.trim(),
        history: conversationHistory
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response || "Désolé, je n'ai pas pu répondre.",
        sender: 'ai',
        timestamp: new Date(),
        source: response.data.source || 'Llama 3 (Groq)'
      };

      setMessages(prev => [...prev, aiMessage]);
      
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: response.data.response }
      ]);
    } catch (error) {
      console.error('Erreur IA:', error);
      toast.error('Erreur lors de la communication avec l\'IA');

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, une erreur est survenue. Vérifiez que la clé GROQ_API_KEY est configurée dans le fichier .env du backend.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.text);
    setCopiedId(message.id);
    toast.success('Message copié !');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearConversation = () => {
    setMessages([{
      id: '1',
      text: "Bonjour ! 👋 Je suis **UniSphere AI**, votre assistant intelligent.\n\nJe peux vous aider à analyser vos données, répondre à vos questions, et vous proposer des recommandations personnalisées.\n\nQue souhaitez-vous savoir ?",
      sender: 'ai',
      timestamp: new Date(),
      source: 'system'
    }]);
    setConversationHistory([]);
    toast.success('Conversation effacée');
  };

  const exportConversation = () => {
    if (messages.length <= 1) {
      toast.error('Aucun message à exporter');
      return;
    }

    const content = messages
      .map(m => `[${m.sender === 'user' ? 'Vous' : 'Assistant IA'}] ${m.timestamp.toLocaleString('fr-FR')}\n${m.text}`)
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `conversation_ia_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast.success('Conversation exportée');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Administrateur';
      case 'teacher': return 'Enseignant';
      case 'student': return 'Étudiant';
      case 'secretary': return 'Secrétaire';
      case 'censeur': return 'Censeur';
      case 'accountant': return 'Comptable';
      case 'guard': return 'Gardien';
      default: return 'Utilisateur';
    }
  };

  const suggestions = getSuggestions();

  return (
    // ✅ PLEINE HAUTEUR : Utilise tout l'espace disponible
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* ✅ HEADER */}
      <div className="bg-[#FF6B00] p-4 sm:p-6 text-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <BrainCircuit className="text-white" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">Assistant IA</h1>
              <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full font-medium">
                {getRoleLabel()}
              </span>
              {conversationHistory.length > 0 && (
                <span className="text-xs bg-green-500/30 backdrop-blur-sm px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
                  Mémoire active
                </span>
              )}
            </div>
            <p className="text-white/90 text-sm mt-1 truncate">
              Bonjour {user?.full_name?.split(' ')[0] || ''} ! Posez vos questions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={exportConversation}
              disabled={messages.length <= 1}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors disabled:opacity-50"
              title="Exporter"
            >
              <Download size={18} />
            </button>
            <button
              onClick={clearConversation}
              disabled={messages.length <= 1}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors disabled:opacity-50"
              title="Effacer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ✅ MESSAGES - Prend tout l'espace restant */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.sender === 'user'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-slate-700 text-white'
            }`}>
              {message.sender === 'user' ? <User size={20} /> : <BrainCircuit size={20} />}
            </div>

            {/* Message */}
            <div className={`flex flex-col max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-[#FF6B00] text-white rounded-tr-sm'
                  : 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm shadow-sm'
              }`}>
                {/* ✅ RENDU MARKDOWN pour l'IA */}
                {message.sender === 'ai' ? (
                  <div 
                    className="text-sm prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-li:my-0.5 prose-ul:my-1"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
              <div className={`flex items-center gap-2 mt-1 px-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
                {message.source && message.sender === 'ai' && (
                  <span className="text-xs text-slate-500 font-medium">• {message.source}</span>
                )}
                {message.sender === 'ai' && (
                  <button
                    onClick={() => copyMessage(message)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Copier"
                  >
                    {copiedId === message.id ? (
                      <Check size={12} className="text-green-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              <BrainCircuit size={20} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-purple-600" />
                <span className="text-sm text-slate-600">L'IA réfléchit...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ✅ SUGGESTIONS - Cartes en bas avec icônes colorées */}
      {messages.length <= 1 && (
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="text-[#FF6B00]" size={16} />
            <span className="text-sm font-medium text-slate-700">Suggestions adaptées à votre rôle</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.map((suggestion, idx) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-left group"
                >
                  <div className={`w-8 h-8 bg-gradient-to-br ${suggestion.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0`}>
                    <Icon className="text-white" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{suggestion.text}</p>
                    <p className="text-xs text-slate-500">{suggestion.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ INPUT */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-white border-t border-slate-200 flex-shrink-0">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-medium hover:bg-[#e55f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          💡 Entrée pour envoyer • Shift+Entrée pour retour à la ligne
        </p>
      </form>
    </div>
  );
}