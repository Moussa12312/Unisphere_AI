'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ScheduleItem {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room: string;
}

// Mapping des jours pour affichage propre
const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_MAP: Record<string, string> = {
  '1': 'Lundi', 'Monday': 'Lundi', 'Lundi': 'Lundi',
  '2': 'Mardi', 'Tuesday': 'Mardi', 'Mardi': 'Mardi',
  '3': 'Mercredi', 'Wednesday': 'Mercredi', 'Mercredi': 'Mercredi',
  '4': 'Jeudi', 'Thursday': 'Jeudi', 'Jeudi': 'Jeudi',
  '5': 'Vendredi', 'Friday': 'Vendredi', 'Vendredi': 'Vendredi',
  '6': 'Samedi', 'Saturday': 'Samedi', 'Samedi': 'Samedi',
  '0': 'Dimanche', 'Sunday': 'Dimanche', 'Dimanche': 'Dimanche'
};

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const res = await api.get('/api/v1/students/me/schedule');
      setSchedule(res.data);
    } catch (error) {
      toast.error('Erreur de chargement de l\'emploi du temps');
    } finally {
      setLoading(false);
    }
  };

  // Grouper par jour
  const groupedSchedule = schedule.reduce((acc: any, item: ScheduleItem) => {
    const dayName = DAY_MAP[item.day_of_week] || item.day_of_week;
    if (!acc[dayName]) acc[dayName] = [];
    acc[dayName].push(item);
    return acc;
  }, {});

  // Trier les cours par heure dans chaque jour
  Object.keys(groupedSchedule).forEach(day => {
    groupedSchedule[day].sort((a: ScheduleItem, b: ScheduleItem) => a.start_time.localeCompare(b.start_time));
  });

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon Emploi du Temps</h1>
        <p className="text-slate-500 mt-1">Planning hebdomadaire de vos cours.</p>
      </div>

      {Object.keys(groupedSchedule).length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun cours n'est planifié pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAYS_ORDER.map(day => {
            if (!groupedSchedule[day]) return null;
            return (
              <div key={day} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Calendar size={18} className="text-[#FF6B00]" />
                  <h2 className="font-bold text-slate-900">{day}</h2>
                  <span className="text-xs text-slate-500 ml-auto">
                    {groupedSchedule[day].length} cours
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSchedule[day].map((item: ScheduleItem) => (
                    <div key={item.id} className="border border-slate-100 rounded-lg p-4 hover:border-[#FF6B00]/30 transition-colors bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900 text-lg">{item.subject}</h3>
                        <div className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-1 rounded">
                          <Clock size={12} />
                          {item.start_time} - {item.end_time}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <span>{item.teacher}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          <span>{item.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}