'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit, Send, Loader2, Sparkles, BookOpen,
  FileText, HelpCircle, Lightbulb, Users, Award,
  Trash2, Plus, Copy, Check, RotateCcw, Download,
  MessageSquare, GraduationCap, Target, Zap
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  prompt_type?: string;
}

interface PromptTemplate {
  id: string;
  icon: any;
  title: string;
  description: string;
  prompt: string;
  color: string;
}

export default function TeacherAIAssistantPage() {
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ✅ TEMPLATES DE PROMPTS PRÉDÉFINIS
  const promptTemplates: PromptTemplate[] = [
    {
      id: 'exam',
      icon: FileText,
      title: 'Générer un examen',
      description: 'Créer un sujet d\'examen complet',
      prompt: 'Génère un examen de 1h30 sur le thème [SUJET] pour des étudiants de niveau [NIVEAU]. Inclus 3 parties : questions de cours (5 pts), exercices d\'application (10 pts), et problème de réflexion (5 pts). Fournis aussi le corrigé type.',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'syllabus',
      icon: BookOpen,
      title: 'Créer un syllabus',
      description: 'Plan de cours détaillé',
      prompt: 'Crée un syllabus complet pour un cours de [MATIÈRE] de niveau [NIVEAU] sur un semestre de 15 semaines. Inclus : objectifs pédagogiques, plan détaillé semaine par semaine, bibliographie, modalités d\'évaluation.',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'qcm',
      icon: HelpCircle,
      title: 'Questions QCM',
      description: 'Générer un questionnaire',
      prompt: 'Génère 20 questions QCM sur [SUJET] avec 4 choix de réponses chacune. Indique la bonne réponse et une explication courte pour chaque question. Niveau : [NIVEAU].',
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'exercises',
      icon: Target,
      title: 'Exercices pratiques',
      description: 'Exercices d\'application',
      prompt: 'Crée 5 exercices pratiques de difficulté progressive sur [SUJET]. Pour chaque exercice : énoncé, données, questions, et solution détaillée. Niveau : [NIVEAU].',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'analyze',
      icon: Award,
      title: 'Analyser les résultats',
      description: 'Interpréter les notes',
      prompt: 'Voici les notes de mes étudiants sur 20 : [NOTES]. Analyse les résultats : moyenne, distribution, points faibles, recommandations pédagogiques pour améliorer la compréhension.',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'explain',
      icon: Lightbulb,
      title: 'Expliquer un concept',
      description: 'Explication simple et claire',
      prompt: 'Explique le concept de [CONCEPT] de manière simple et pédagogique pour des étudiants de niveau [NIVEAU]. Utilise des analogies, des exemples concrets et un schéma mental.',
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/v1/ai-assistant/history').catch(() => ({ data: [] }));
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  };

  const sendMessage = async (content?: string) => {
    const messageContent = content || input.trim();
    if (!messageContent || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/v1/ai-assistant/chat', {
        message: messageContent,
        context: 'teacher'
      });

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.response || response.data.message || 'Désolé, je n\'ai pas pu répondre.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '⚠️ Erreur de connexion avec l\'IA. Veuillez réessayer dans quelques instants.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erreur de communication avec l\'IA');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTemplateClick = (template: PromptTemplate) => {
    setInput(template.prompt);
    inputRef.current?.focus();
  };

  const copyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    toast.success('Message copié !');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearConversation = () => {
    setMessages([]);
    toast.success('Conversation effacée');
  };

  const exportConversation = () => {
    if (messages.length === 0) {
      toast.error('Aucun message à exporter');
      return;
    }

    const content = messages
      .map(m => `[${m.role === 'user' ? 'Vous' : 'Assistant IA'}] ${m.timestamp}\n${m.content}`)
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `conversation_ia_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast.success('Conversation exportée');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <BrainCircuit size={24} className="text-white" />
            </div>
            Assistant IA Pédagogique
          </h1>
          <p className="text-slate-500 mt-1">
            Votre assistant intelligent pour préparer vos cours et évaluations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportConversation}
            disabled={messages.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Download size={16} />
            Exporter
          </button>
          <button
            onClick={clearConversation}
            disabled={messages.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Trash2 size={16} />
            Effacer
          </button>
        </div>
      </div>

      {/* Templates de prompts */}
      {messages.length === 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles size={20} className="text-[#FF6B00]" />
            Suggestions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {promptTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-[#FF6B00]/30 transition-all text-left"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${template.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{template.title}</h3>
                  <p className="text-xs text-slate-500">{template.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Zone de conversation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '600px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <BrainCircuit size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Bonjour ! Je suis votre assistant pédagogique 🎓
              </h3>
              <p className="text-slate-500 max-w-md mb-6">
                Je peux vous aider à préparer vos cours, créer des examens, analyser les résultats, 
                et bien plus encore. Choisissez une suggestion ci-dessus ou posez votre question.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Zap size={14} />
                <span>Appuyez sur Entrée pour envoyer, Shift+Entrée pour un retour à la ligne</span>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <BrainCircuit size={18} className="text-white" />
                    </div>
                  )}

                  <div className={`max-w-[75%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-[#FF6B00] to-orange-500 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-xs text-slate-400">
                        {new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.role === 'assistant' && (
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

                  {message.role === 'user' && (
                    <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      V
                    </div>
                  )}
                </div>
              ))}

              {/* Indicateur de chargement */}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <BrainCircuit size={18} className="text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-purple-600" />
                    <span className="text-sm text-slate-600">L'IA réfléchit...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Zone de saisie */}
        <div className="border-t border-slate-200 p-4 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question à l'assistant IA..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                style={{ minHeight: '48px', maxHeight: '150px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            💡 L'IA peut faire des erreurs. Vérifiez toujours les informations importantes.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Lightbulb size={16} />
          Astuces pour de meilleurs résultats
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>Soyez précis</strong> : Indiquez le niveau (L1, L2, M1...) et le contexte</li>
          <li>• <strong>Donnez des détails</strong> : Durée, nombre de questions, type d'exercices</li>
          <li>• <strong>Itérez</strong> : Demandez des modifications si le résultat ne convient pas</li>
          <li>• <strong>Utilisez les templates</strong> : Les suggestions sont optimisées pour l'enseignement</li>
        </ul>
      </div>
    </div>
  );
}