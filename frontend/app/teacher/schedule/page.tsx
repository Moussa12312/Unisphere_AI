'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, BookOpen, Loader2, Users
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function TeacherSchedulePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/teacher/schedule');
      setSchedule(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  
  const scheduleByDay = days.map(day => ({
    day,
    slots: schedule
      .filter(s => s.day_of_week === day)
      .sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return a.start_time.localeCompare(b.start_time);
      })
  }));

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
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Calendar size={24} className="text-white" />
          </div>
          Emploi du temps
        </h1>
        <p className="text-slate-500 mt-1">Votre planning hebdomadaire</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total créneaux</p>
          <p className="text-2xl font-bold text-slate-900">{schedule.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Jours occupés</p>
          <p className="text-2xl font-bold text-purple-600">
            {scheduleByDay.filter(d => d.slots.length > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Cours uniques</p>
          <p className="text-2xl font-bold text-blue-600">
            {new Set(schedule.map(s => s.course_id)).size}
          </p>
        </div>
      </div>

      {/* Planning */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scheduleByDay.map(({ day, slots }) => (
          <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className={`px-4 py-3 font-bold text-white ${
              day === 'Samedi' ? 'bg-slate-500' : 'bg-gradient-to-r from-[#FF6B00] to-orange-500'
            }`}>
              {day}
              <span className="ml-2 text-xs opacity-80">({slots.length} cours)</span>
            </div>
            
            {slots.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                Aucun cours
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {slots.map((slot, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock size={16} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {slot.course_title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="font-mono">
                            {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                          </span>
                        </div>
                        {slot.class_name && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <Users size={10} />
                            {slot.class_name}
                          </div>
                        )}
                        {slot.room && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <MapPin size={10} />
                            {slot.room}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {schedule.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Calendar size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun cours dans votre emploi du temps</p>
          <p className="text-xs text-slate-400 mt-2">
            Contactez l'administration pour être assigné à des créneaux
          </p>
        </div>
      )}
    </div>
  );
}