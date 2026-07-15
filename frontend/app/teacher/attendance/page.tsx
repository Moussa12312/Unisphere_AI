'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Save } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface StudentRecord {
  student_id: number;
  student_name: string;
  matricule: string;
  current_status: 'present' | 'late' | 'absent' | 'excused';
}

export default function TeacherAttendancePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      // ✅ APPEL DU NOUVEL ENDPOINT FILTRÉ
      const res = await api.get('/api/v1/attendance/teacher/courses');
      setCourses(res.data);
    } catch (e) {
      console.error("Erreur chargement cours:", e);
      setCourses([]);
    }
  };

  const loadRoster = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/attendance/course/${selectedCourse}/roster?date=${date}`);
      setRoster(res.data.students);
    } catch (error) {
      toast.error('Erreur de chargement de la liste');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourse) loadRoster();
  }, [selectedCourse, date]);

  const updateStatus = (studentId: number, status: 'present' | 'late' | 'absent' | 'excused') => {
    setRoster(prev => prev.map(s => s.student_id === studentId ? { ...s, current_status: status } : s));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = roster.map(s => ({
        student_id: s.student_id,
        status: s.current_status,
        comment: ""
      }));
      
      await api.post('/api/v1/attendance/mark-bulk', {
        course_id: parseInt(selectedCourse),
        date: date,
        records: records
      });
      
      toast.success('Appel enregistré avec succès !');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBtn = (studentId: number, status: string, colorClass: string, Icon: any) => {
    const isActive = roster.find(s => s.student_id === studentId)?.current_status === status;
    return (
      <button
        onClick={() => updateStatus(studentId, status as any)}
        className={`p-2 rounded-lg border transition-all ${
          isActive 
            ? `${colorClass} border-transparent shadow-sm` 
            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
        }`}
      >
        <Icon size={18} />
      </button>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faire l'Appel</h1>
          <p className="text-slate-500 mt-1">Sélectionnez un cours et la date pour pointer les présences.</p>
        </div>
        <button
          onClick={saveAttendance}
          disabled={saving || roster.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Enregistrer l'appel
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4">
        <select 
          value={selectedCourse} 
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
        >
          <option value="">-- Sélectionner un cours --</option>
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>{c.title} ({c.filiere} {c.level})</option>
          ))}
        </select>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF6B00]" size={32} /></div>
      ) : roster.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-500">
          <Users size={48} className="mx-auto mb-4 text-slate-300" />
          Sélectionnez un cours pour afficher la liste des étudiants.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Étudiant</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Présent</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Retard</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Absent</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Excusé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((student) => (
                  <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{student.student_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{student.matricule}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBtn(student.student_id, 'present', 'bg-green-100 text-green-700', CheckCircle)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBtn(student.student_id, 'late', 'bg-orange-100 text-orange-700', Clock)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBtn(student.student_id, 'absent', 'bg-red-100 text-red-700', XCircle)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBtn(student.student_id, 'excused', 'bg-blue-100 text-blue-700', AlertCircle)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}