'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, CheckCircle, AlertCircle, Calendar, 
  BookOpen, Clock, MapPin, FileText, Award, ArrowUpRight, ArrowDownRight, Loader2,
  Megaphone, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface DashboardData {
  student_name: string;
  matricule: string;
  filiere: string;
  average_grade: number;
  attendance_rate: number;
  recent_grades: {
    subject: string;
    score: number;
    coefficient: number;
    date: string;
    comment: string;
  }[];
  upcoming_events: {
    title: string;
    type: 'exam' | 'assignment' | 'course';
    date: string;
    time: string;
    location: string;
  }[];
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [resDash, resAnn] = await Promise.all([
        api.get('/api/v1/students/me/dashboard'),
        api.get('/api/v1/announcements/').catch(() => ({ data: [] }))
      ]);
      setData(resDash.data);
      const annList = Array.isArray(resAnn.data) ? resAnn.data : (Array.isArray(resAnn.data?.data) ? resAnn.data.data : []);
      setAnnouncements(annList.slice(0, 3));
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      toast.error('Impossible de charger vos données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 text-center text-slate-500">
        <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
        <p>Aucune donnée disponible pour votre profil.</p>
      </div>
    );
  }

  // Fonction pour la couleur des notes
  const getGradeColor = (score: number) => {
    if (score >= 14) return 'text-green-700 bg-green-100 border-green-200';
    if (score >= 10) return 'text-orange-700 bg-orange-100 border-orange-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  // Fonction pour l'icône des événements
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam': return <FileText className="text-red-500" size={18} />;
      case 'assignment': return <Clock className="text-orange-500" size={18} />;
      default: return <BookOpen className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Bonjour, {data.student_name} 👋</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {data.filiere} • Matricule : <span className="font-mono text-slate-700">{data.matricule}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/student/grades" className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
            <FileText size={15} /> Relevé
          </a>
          <a href="/student/schedule" className="flex-1 sm:flex-none px-3 py-2 bg-[#FF6B00] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#e55f00] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
            <Calendar size={15} /> Emploi du temps
          </a>
        </div>
      </div>

      {/* SECTION ANNONCES OFFICIELLES (Audio Moussa) */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FF6B00] text-white">
                <Megaphone size={16} />
              </span>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Annonces Générales & Examens</h2>
            </div>
            <Link
              href="/student/announcements"
              className="text-xs font-bold text-[#FF6B00] hover:text-[#e55f00] flex items-center gap-1 transition-colors"
            >
              Voir tout <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {announcements.map((a: any) => (
              <Link
                key={a.id}
                href="/student/announcements"
                className="bg-white/90 backdrop-blur-sm p-3.5 rounded-xl border border-orange-100 hover:border-orange-300 transition-all hover:shadow-xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-bold text-orange-600 uppercase tracking-wider text-[10px]">
                      {a.category || 'Annonce'}
                    </span>
                    <span>{a.published_at ? new Date(a.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-[#FF6B00] transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-slate-600 text-xs line-clamp-2 mt-1">
                    {a.content}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Moyenne Générale */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Award className="text-blue-600" size={20} />
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${data.average_grade >= 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {data.average_grade >= 10 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              {data.average_grade >= 10 ? 'Validé' : 'À améliorer'}
            </span>
          </div>
          <p className="text-sm text-slate-500">Moyenne générale</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-3xl font-bold text-slate-900">{data.average_grade}/20</p>
          </div>
          {/* Barre de progression visuelle */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${data.average_grade >= 14 ? 'bg-green-500' : data.average_grade >= 10 ? 'bg-orange-500' : 'bg-red-500'}`} 
              style={{ width: `${(data.average_grade / 20) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Taux de présence */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-sm text-slate-500">Taux de présence</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data.attendance_rate}%</p>
          <p className="text-xs text-slate-400 mt-2">
            {data.attendance_rate >= 80 ? '✅ Excellente assiduité' : '⚠️ Attention aux absences'}
          </p>
        </div>

        {/* Prochaine échéance (Mis en avant) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl shadow-sm text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Clock className="text-[#FF6B00]" size={20} />
            </div>
          </div>
          <p className="text-sm text-slate-300">Prochaine échéance</p>
          {data.upcoming_events.length > 0 ? (
            <>
              <p className="text-lg font-bold mt-1 line-clamp-1">{data.upcoming_events[0].title}</p>
              <p className="text-sm text-[#FF6B00] font-medium mt-1">
                {data.upcoming_events[0].date} à {data.upcoming_events[0].time}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold mt-1">Aucun événement prévu</p>
          )}
        </div>
      </div>

      {/* Section Principale : Notes et Événements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dernières Notes (2/3 de la largeur) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#FF6B00]" />
              Dernières évaluations
            </h3>
            <a href="/student/grades" className="text-sm text-[#FF6B00] hover:underline font-medium">Voir tout</a>
          </div>
          
          <div className="divide-y divide-slate-100">
            {data.recent_grades.length > 0 ? (
              data.recent_grades.map((grade, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border ${getGradeColor(grade.score)}`}>
                      {grade.score}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{grade.subject}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Coef. {grade.coefficient}</span>
                        <span>•</span>
                        <span>{grade.date}</span>
                      </p>
                    </div>
                  </div>
                  {grade.comment && (
                    <span className="hidden sm:block text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full max-w-[200px] truncate">
                      {grade.comment}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-5 sm:p-8 text-center text-slate-500">
                <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                <p>Aucune note enregistrée pour le moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Prochains Événements (1/3 de la largeur) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#FF6B00]" />
              À venir
            </h3>
          </div>
          
          <div className="p-4 space-y-4">
            {data.upcoming_events.length > 0 ? (
              data.upcoming_events.map((event, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="mt-1">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {event.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {event.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <MapPin size={12} /> {event.location}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 py-4">Aucun événement à venir.</p>
            )}
            
            <a href="/student/schedule" className="block w-full text-center py-2.5 mt-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Voir l'emploi du temps complet
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}