'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Lightbulb, TrendingUp, DollarSign, Users, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  source?: string;
}

const SUGGESTIONS = [
  { icon: Users, text: "Combien d'étudiants avons-nous?", category: "Étudiants" },
  { icon: TrendingUp, text: "Quel est le taux d'assiduité?", category: "Assiduité" },
  { icon: DollarSign, text: "Quels sont nos revenus totaux?", category: "Finances" },
  { icon: GraduationCap, text: "Répartition par filière?", category: "Filières" },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Bonjour ! Je suis l'assistant IA de votre université. Je peux vous aider à analyser les données académiques et financières. Que souhaitez-vous savoir?",
      sender: 'ai',
      timestamp: new Date(),
      source: 'system'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const response = await api.post('/api/v1/ai/chat', {
        message: text.trim()
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date(),
        source: response.data.source === 'openai' ? 'GPT-3.5' : 'Analyse locale'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erreur IA:', error);
      toast.error('Erreur lors de la communication avec l\'IA');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, une erreur est survenue. Veuillez réessayer.",
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="bg-[#FF6B00] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Assistant IA</h1>
            <p className="text-white/90 text-sm mt-1">
              Posez vos questions sur les données de l'université
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Sparkles size={14} />
            <span className="text-xs font-medium">Smart Assistant</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
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
              {message.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>

            {/* Message */}
            <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                message.sender === 'user'
                  ? 'bg-[#FF6B00] text-white rounded-tr-sm'
                  : 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm shadow-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
                {message.source && (
                  <span className="text-xs text-slate-500 font-medium">• {message.source}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              <Bot size={20} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-6 py-4 bg-white border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="text-[#FF6B00]" size={16} />
            <span className="text-sm font-medium text-slate-700">Suggestions rapides</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTIONS.map((suggestion, idx) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-left group"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Icon className="text-[#FF6B00]" size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{suggestion.text}</p>
                    <p className="text-xs text-slate-500">{suggestion.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-medium hover:bg-[#e55f00] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Send size={18} />
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </div>
      </form>
    </div>
  );
}