'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CourseStats {
  course_id: number;
  course_name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number;
}

export default function StudentAttendancePage() {
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const res = await api.get('/api/v1/attendance/me/courses');
      setCourses(res.data);
    } catch (error) {
      toast.error('Erreur de chargement des présences');
    } finally {
      setLoading(false);
    }
  };

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-700 bg-green-100 border-green-200';
    if (rate >= 50) return 'text-orange-700 bg-orange-100 border-orange-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const getRateBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon Assiduité par Matière</h1>
        <p className="text-slate-500 mt-1">Résumé de vos présences en cours (hors entrée campus).</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <TrendingUp size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucune présence en cours enregistrée pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div key={course.course_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-900 text-lg line-clamp-2">{course.course_name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1 ${getRateColor(course.rate)}`}>
                  {course.rate >= 80 ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                  {course.rate}%
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getRateBarColor(course.rate)}`} 
                  style={{ width: `${course.rate}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-bold text-slate-900 text-lg">{course.total}</p>
                  <p className="text-slate-500">Séances</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="font-bold text-green-700 text-lg">{course.present}</p>
                  <p className="text-green-600">Présents</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <p className="font-bold text-orange-700 text-lg">{course.late}</p>
                  <p className="text-orange-600">Retards</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="font-bold text-red-700 text-lg">{course.absent}</p>
                  <p className="text-red-600">Absents</p>
                </div>
              </div>
              
              {course.excused > 0 && (
                <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
                  <AlertCircle size={12} /> {course.excused} absence(s) justifiée(s)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}