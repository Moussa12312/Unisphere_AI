'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GraduationCap, BookOpen, TrendingUp, Calendar,
  Award, MessageSquare, Loader2, FileText, Download,
  CheckCircle, AlertCircle, Clock, User
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AlumniStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id;

  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      const res = await api.get(`/api/v1/alumni/student/${studentId}`);
      setStudentData(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de chargement');
      router.push('/alumni/students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!studentData) return null;

  const { student, average, grades, attendance, connection_type } = studentData;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/alumni/students" className="text-slate-500 hover:text-[#FF6B00] flex items-center gap-1">
          <ArrowLeft size={16} />
          Mes étudiants
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">
          {student.first_name} {student.last_name}
        </span>
      </div>

      {/* Header étudiant */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {student.first_name} {student.last_name}
              </h1>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                {student.matricule}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <GraduationCap size={14} />
                {student.level} - {student.filiere}
              </span>
              <span className="flex items-center gap-1">
                <Award size={14} />
                {connection_type === 'mentor' ? '🎓 Mentoré' : '📚 Direction mémoire'}
              </span>
            </div>
          </div>
          <Link
            href={`/alumni/messages?to=${student.user_id}`}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-medium"
          >
            <MessageSquare size={16} />
            Discuter
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <TrendingUp size={16} />
            Moyenne générale
          </div>
          <p className={`text-3xl font-bold ${
            average >= 14 ? 'text-green-600' : average >= 10 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {average.toFixed(2)}/20
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <CheckCircle size={16} />
            Taux de présence
          </div>
          <p className={`text-3xl font-bold ${
            attendance.total > 0
              ? ((attendance.present + attendance.late) / attendance.total * 100) >= 75
                ? 'text-green-600'
                : 'text-orange-600'
              : 'text-slate-400'
          }`}>
            {attendance.total > 0 
              ? Math.round((attendance.present + attendance.late) / attendance.total * 100)
              : 0}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <BookOpen size={16} />
            Matières notées
          </div>
          <p className="text-3xl font-bold text-slate-900">{grades.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Calendar size={16} />
            Absences
          </div>
          <p className="text-3xl font-bold text-red-600">{attendance.absent || 0}</p>
        </div>
      </div>

      {/* Présences détaillées */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-[#FF6B00]" />
          Détails des présences
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{attendance.present || 0}</p>
            <p className="text-xs text-green-700 mt-1">Présents</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{attendance.late || 0}</p>
            <p className="text-xs text-orange-700 mt-1">Retards</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{attendance.absent || 0}</p>
            <p className="text-xs text-red-700 mt-1">Absents</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{attendance.excused || 0}</p>
            <p className="text-xs text-blue-700 mt-1">Excusés</p>
          </div>
        </div>
      </div>

      {/* Notes par matière */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-[#FF6B00]" />
            Notes par matière
          </h2>
        </div>
        {grades.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Aucune note disponible pour le moment
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Matière</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">CC</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Examen</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Note finale</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.map((grade: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {grade.course_name}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {grade.cc_note?.toFixed(1) || '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {grade.exam_note?.toFixed(1) || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${
                        grade.final_note >= 14 ? 'bg-green-100 text-green-700' :
                        grade.final_note >= 10 ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {grade.final_note?.toFixed(2) || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 text-sm">
                      {grade.session || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}