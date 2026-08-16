'use client';

import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Loader2, Plus, Edit3, Trash2,
    ChevronLeft, ChevronRight, Clock, Users, BookOpen,
    CheckCircle, Eye
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CenseurExamsCalendarPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/exam-sessions/');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSessions(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Jours du mois précédent pour remplir la première semaine
    const firstDayOfWeek = firstDay.getDay() || 7; // Lundi = 1
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Jours du mois suivant
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(s => {
      if (!s.start_date || !s.end_date) return false;
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      return date >= start && date <= end;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700 border-green-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'En cours';
      case 'closed': return 'Terminée';
      case 'upcoming': return 'À venir';
      default: return status;
    }
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CalendarIcon size={24} className="text-white" />
            </div>
            Calendrier des examens
          </h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble des sessions d'examens</p>
        </div>
        <Link
          href="/censeur/exams/sessions"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Plus size={16} />
          Nouvelle session
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total sessions</p>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">En cours</p>
              <p className="text-2xl font-bold text-green-700">
                {sessions.filter(s => s.status === 'open').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Terminées</p>
              <p className="text-2xl font-bold text-slate-700">
                {sessions.filter(s => s.status === 'closed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">À venir</p>
              <p className="text-2xl font-bold text-blue-700">
                {sessions.filter(s => s.status === 'upcoming').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation mois */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-900">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-xs font-semibold text-slate-600 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Jours du mois */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const daySessions = getSessionsForDate(day.date);
            return (
              <div
                key={idx}
                className={`min-h-[100px] p-2 border-b border-r border-slate-100 ${
                  !day.isCurrentMonth ? 'bg-slate-50' : 'bg-white'
                } ${isToday(day.date) ? 'bg-orange-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  !day.isCurrentMonth ? 'text-slate-400' : 
                  isToday(day.date) ? 'text-[#FF6B00] font-bold' : 'text-slate-700'
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {daySessions.slice(0, 2).map(session => (
                    <div
                      key={session.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate ${getStatusColor(session.status)}`}
                      title={session.name}
                    >
                      {session.name}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <div className="text-[10px] text-slate-500">
                      +{daySessions.length - 2} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des sessions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CalendarIcon size={20} className="text-blue-500" />
          Toutes les sessions
        </h2>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune session créée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{session.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : '?'} 
                      {' → '}
                      {session.end_date ? new Date(session.end_date).toLocaleDateString('fr-FR') : '?'}
                    </p>
                    {session.session_type && (
                      <p className="text-xs text-slate-400 mt-1">Type : {session.session_type}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/censeur/exams/sessions/${session.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir"
                    >
                      <Eye size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}