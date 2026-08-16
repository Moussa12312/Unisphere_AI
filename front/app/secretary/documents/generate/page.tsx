'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Download, Loader2, Search, Users, Calendar,
  CheckCircle2, AlertCircle, GraduationCap, Award
} from 'lucide-react';
import { studentService } from '@/services/studentService';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { documentService } from '@/services/documentService';
import { reportCardService } from '@/services/reportCardService';
import { useToast } from '@/components/ToastProvider';

export default function SecretaryGenerateDocumentsPage() {
  const toast = useToast();
  
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [studentsData, sessionsData] = await Promise.all([
        studentService.getAll(),
        examSessionService.getAll()
      ]);
      
      setStudents(studentsData);
      setSessions(sessionsData);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEnrollmentCertificate = async (studentId: number) => {
    setGenerating(studentId);
    try {
      const pdfBlob = await documentService.generateEnrollmentCertificate(studentId);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attestation_${studentId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attestation téléchargée');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateTranscript = async (studentId: number) => {
    if (!selectedSessionId) {
      toast.error('Veuillez sélectionner une session');
      return;
    }
    
    setGenerating(studentId);
    try {
      const pdfBlob = await reportCardService.generatePDF(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `releve_${studentId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Relevé de notes téléchargé');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAchievement = async (studentId: number) => {
    if (!selectedSessionId) {
      toast.error('Veuillez sélectionner une session pour la réussite');
      return;
    }
    setGenerating(studentId);
    try {
      const pdfBlob = await documentService.generateAchievementCertificate(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reussite_${studentId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attestation de réussite téléchargée');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAttendance = async (studentId: number) => {
    setGenerating(studentId);
    try {
      const pdfBlob = await documentService.generateAttendanceCertificate(studentId);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presence_${studentId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attestation de présence téléchargée');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  const filteredStudents = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) ||
           s.matricule?.toLowerCase().includes(search.toLowerCase());
  });

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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-white" />
          </div>
          Générer des documents
        </h1>
        <p className="text-slate-500 mt-1">Créez des attestations et relevés de notes</p>
      </div>

      {/* Sélecteur de session */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <Calendar size={16} className="inline mr-2" />
          Session d'examen (pour les relevés de notes)
        </label>
        <select
          value={selectedSessionId || ''}
          onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full md:w-96 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
        >
          <option value="">Sélectionner une session...</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Rechercher un étudiant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Liste des étudiants */}
      <div className="space-y-3">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {student.first_name} {student.last_name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {student.matricule} • {student.filiere} • {student.level}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => handleGenerateEnrollmentCertificate(student.id)}
                  disabled={generating === student.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {generating === student.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <GraduationCap size={16} />
                  )}
                  Attestation
                </button>
                
                <button
                  onClick={() => handleGenerateTranscript(student.id)}
                  disabled={generating === student.id || !selectedSessionId}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {generating === student.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Award size={16} />
                  )}
                  Relevé de notes
                </button>

                <button
                  onClick={() => handleGenerateAchievement(student.id)}
                  disabled={generating === student.id || !selectedSessionId}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {generating === student.id ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                  Réussite
                </button>

                <button
                  onClick={() => handleGenerateAttendance(student.id)}
                  disabled={generating === student.id}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {generating === student.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Présence
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}