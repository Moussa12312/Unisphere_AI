'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Clock, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { toast } from 'react-hot-toast';

interface HistoryEntry {
  id: number;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  user_name: string;
  created_at: string;
}

export default function CourseHistoryPage() {
  const params = useParams();
  const courseId = Number(params.id);
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseCode, setCourseCode] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const [courseData, historyData] = await Promise.all([
          courseService.getById(courseId),
          courseService.getHistory(courseId)
        ]);
        
        setCourseCode(courseData.code);
        setHistory(historyData);
      } catch (error) {
        toast.error('Erreur lors du chargement de l\'historique');
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, [courseId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldLabel = (field: string | null) => {
    const labels: Record<string, string> = {
      'title': 'Titre',
      'level': 'Niveau',
      'teacher_id': 'Enseignant',
      'hours': 'Volume horaire',
      'credits': 'Crédits'
    };
    return field ? labels[field] || field : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  return (
    <div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Historique des modifications</h1>
        <p className="text-slate-500 mt-1">
          Cours : <span className="font-mono font-semibold text-[#FF6B00]">{courseCode}</span>
        </p>
      </div>

      {/* Timeline */}
      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Clock className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-500">Aucune modification enregistrée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="divide-y divide-slate-100">
            {history.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entry.action === 'created' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {entry.action === 'created' ? (
                        <span className="text-xl">✨</span>
                      ) : (
                        <span className="text-xl">✏️</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {entry.user_name}
                        </span>
                      </div>
                      <time className="text-xs text-slate-500">
                        {formatDate(entry.created_at)}
                      </time>
                    </div>

                    {entry.action === 'created' ? (
                      <p className="text-sm text-slate-700">
                        {entry.new_value}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">{getFieldLabel(entry.field_changed)}</span> modifié
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                            {entry.old_value}
                          </span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                            {entry.new_value}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}