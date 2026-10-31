'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Loader2, Search, Users, Calendar,
  CheckCircle2, AlertCircle, GraduationCap, Award, Briefcase,
  Send, Stamp, ShieldCheck, Clock, UserCheck, BookOpen,
  Building, ChevronRight, FileSpreadsheet, Compass, FileCheck
} from 'lucide-react';
import { studentService } from '@/services/studentService';
import { examSessionService, ExamSession } from '@/services/examSessionService';
import { documentService } from '@/services/documentService';
import { reportCardService } from '@/services/reportCardService';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { universityService } from '@/services/universityService';
import { useToast } from '@/components/ToastProvider';

type DocumentCategory = 'scolarite' | 'stages' | 'examens' | 'direction';

export default function SecretaryGenerateDocumentsPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<DocumentCategory>('scolarite');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [university, setUniversity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Modal de personnalisation
  const [modalType, setModalType] = useState<string | null>(null);
  const [customParams, setCustomParams] = useState<Record<string, any>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [studentsData, sessionsData, teachersData, filieresData, univData] = await Promise.all([
        studentService.getAll().catch(() => []),
        examSessionService.getAll().catch(() => []),
        teacherService.getAll().catch(() => []),
        filiereService.getAll().catch(() => []),
        universityService.getInfo().catch(() => null)
      ]);

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setFilieres(Array.isArray(filieresData) ? filieresData : []);
      setUniversity(univData);

      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        setSelectedSessionId(sessionsData[0].id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des données initiales');
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // 1. Attestation de scolarité
  const handleGenerateEnrollment = async (student: any) => {
    setGenerating(`enrollment-${student.id}`);
    try {
      const blob = await documentService.generateEnrollmentCertificate(student.id);
      downloadBlob(blob, `attestation_scolarite_${student.matricule || student.id}.pdf`);
      toast.success(`Attestation de scolarité téléchargée pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de l’attestation');
    } finally {
      setGenerating(null);
    }
  };

  // 2. Certificat d'assiduité / présence
  const handleGenerateAttendance = async (student: any) => {
    setGenerating(`attendance-${student.id}`);
    try {
      const blob = await documentService.generateAttendanceCertificate(student.id);
      downloadBlob(blob, `certificat_assiduite_${student.matricule || student.id}.pdf`);
      toast.success(`Certificat d'assiduité généré pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du certificat d’assiduité');
    } finally {
      setGenerating(null);
    }
  };

  // 3. Attestation d'admission
  const handleGenerateAdmission = async (student: any) => {
    setGenerating(`admission-${student.id}`);
    try {
      const blob = await documentService.generateAdmissionLetter(student.id, {
        specialty: student.filiere
      });
      downloadBlob(blob, `attestation_admission_${student.matricule || student.id}.pdf`);
      toast.success(`Attestation d'admission générée pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de l’attestation d’admission');
    } finally {
      setGenerating(null);
    }
  };

  // 4. Certificat de transfert et de radiation
  const handleGenerateTransfer = async (student: any) => {
    setGenerating(`transfer-${student.id}`);
    try {
      const blob = await documentService.generateTransferCertificate(student.id, {
        target_institution: customParams.target_institution || 'Établissement Universitaire d’Accueil'
      });
      downloadBlob(blob, `certificat_transfert_${student.matricule || student.id}.pdf`);
      toast.success(`Certificat de transfert généré pour ${student.first_name} ${student.last_name}`);
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du certificat de transfert');
    } finally {
      setGenerating(null);
    }
  };

  // 5. Quitus financier / Attestation de paiement
  const handleGeneratePaymentCert = async (student: any) => {
    setGenerating(`payment-${student.id}`);
    try {
      const blob = await documentService.generatePaymentCertificate(student.id);
      downloadBlob(blob, `quitus_financier_${student.matricule || student.id}.pdf`);
      toast.success(`Quitus financier officiel généré pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du quitus financier');
    } finally {
      setGenerating(null);
    }
  };

  // 6. Relevé de notes officiel LMD
  const handleGenerateTranscript = async (student: any) => {
    setGenerating(`transcript-${student.id}`);
    try {
      const blob = await documentService.generateTranscript(student.id);
      downloadBlob(blob, `releve_notes_lmd_${student.matricule || student.id}.pdf`);
      toast.success(`Relevé de notes officiel LMD téléchargé pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du relevé de notes');
    } finally {
      setGenerating(null);
    }
  };

  // 7. Attestation de réussite
  const handleGenerateAchievement = async (student: any) => {
    setGenerating(`achievement-${student.id}`);
    try {
      const blob = await documentService.generateAchievementCertificate(student.id, selectedSessionId || undefined);
      downloadBlob(blob, `certificat_reussite_${student.matricule || student.id}.pdf`);
      toast.success(`Certificat de réussite téléchargé pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du certificat de réussite');
    } finally {
      setGenerating(null);
    }
  };

  // 8. Convention de stage tripartite
  const handleGenerateInternship = async (student: any) => {
    setGenerating(`internship-${student.id}`);
    try {
      const blob = await documentService.generateInternshipAgreement(student.id, {
        company_name: customParams.company_name || 'Société Partenaire',
        company_address: customParams.company_address || 'Bamako, République du Mali',
        company_tutor: customParams.company_tutor || 'Direction des Ressources Humaines',
        start_date: customParams.start_date || '01/06/2026',
        end_date: customParams.end_date || '31/08/2026',
        mission_description: customParams.mission_description || 'Application des compétences professionnelles'
      });
      downloadBlob(blob, `convention_stage_${student.matricule || student.id}.pdf`);
      toast.success(`Convention de stage générée pour ${student.first_name} ${student.last_name}`);
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de la convention de stage');
    } finally {
      setGenerating(null);
    }
  };

  // 9. Lettre de recommandation officielle
  const handleGenerateRecommendation = async (student: any) => {
    setGenerating(`recommendation-${student.id}`);
    try {
      const blob = await documentService.generateRecommendationLetter(student.id, {
        target_entity: customParams.target_entity || 'Aux Responsables des Recrutements & des Admissions',
        appreciation: customParams.appreciation || 'un(e) étudiant(e) exemplaire, assidu(e) et rigoureux(se)'
      });
      downloadBlob(blob, `lettre_recommandation_${student.matricule || student.id}.pdf`);
      toast.success(`Lettre de recommandation générée pour ${student.first_name} ${student.last_name}`);
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de la lettre de recommandation');
    } finally {
      setGenerating(null);
    }
  };

  // 10. Dépôt de mémoire & Autorisation de soutenance
  const handleGenerateThesis = async (student: any) => {
    setGenerating(`thesis-${student.id}`);
    try {
      const blob = await documentService.generateThesisSubmission(student.id, {
        thesis_title: customParams.thesis_title || 'Optimisation des processus et audit opérationnel',
        supervisor_name: customParams.supervisor_name || 'Dr. Encadreur Pédagogique'
      });
      downloadBlob(blob, `depot_memoire_${student.matricule || student.id}.pdf`);
      toast.success(`Autorisation de soutenance générée pour ${student.first_name} ${student.last_name}`);
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du dépôt de mémoire');
    } finally {
      setGenerating(null);
    }
  };

  // 11. Feuille d'émargement officielle d'examen
  const handleGenerateExamSheet = async () => {
    setGenerating('exam-sheet');
    try {
      const blob = await documentService.generateExamAttendanceSheet({
        filiere: selectedFiliere || 'Logistique et Transport',
        level: selectedLevel || 'Licence 3',
        course_name: customParams.course_name || 'Gestion des Opérations de Transport',
        room_name: customParams.room_name || 'Amphi A - Salle 102',
        session_title: customParams.session_title || 'Session Normale Semestre 5',
        exam_date: customParams.exam_date || new Date().toLocaleDateString('fr-FR')
      });
      downloadBlob(blob, `feuille_emargement_examen.pdf`);
      toast.success('Feuille d’émargement officielle générée');
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de la feuille d’émargement');
    } finally {
      setGenerating(null);
    }
  };

  // 12. Convocation individuelle aux examens
  const handleGenerateConvocation = async (student: any) => {
    setGenerating(`convocation-${student.id}`);
    try {
      const blob = await documentService.generateExamConvocation(student.id, {
        session_title: customParams.session_title || 'Session Normale Semestre 5'
      });
      downloadBlob(blob, `convocation_examen_${student.matricule || student.id}.pdf`);
      toast.success(`Convocation officielle générée pour ${student.first_name} ${student.last_name}`);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de la convocation');
    } finally {
      setGenerating(null);
    }
  };

  // 13. PV de délibération de jury
  const handleGenerateJuryPV = async () => {
    setGenerating('jury-pv');
    try {
      const blob = await documentService.generateJuryDeliberationPV({
        filiere: selectedFiliere || 'Logistique et Transport',
        level: selectedLevel || 'Licence 3',
        session_title: customParams.session_title || 'Session Normale Semestre 6'
      });
      downloadBlob(blob, `pv_deliberation_jury.pdf`);
      toast.success('PV officiel de délibération du jury généré');
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération du PV de délibération');
    } finally {
      setGenerating(null);
    }
  };

  // 14. Ordre de mission officiel du personnel
  const handleGenerateMissionOrder = async () => {
    setGenerating('mission-order');
    try {
      const blob = await documentService.generateMissionOrder({
        staff_name: customParams.staff_name || 'Dr. Moussa COULIBALY',
        staff_title: customParams.staff_title || 'Enseignant-Chercheur / Directeur de Département',
        staff_matricule: customParams.staff_matricule || 'ENS-2026-0012',
        mission_purpose: customParams.mission_purpose || 'Supervision et audit des épreuves d’examens',
        destination: customParams.destination || 'Ségou - République du Mali',
        start_date: customParams.start_date || '15/06/2026',
        end_date: customParams.end_date || '20/06/2026',
        transport_mode: customParams.transport_mode || 'Véhicule de service ou transport régulier',
        budget_charge: customParams.budget_charge || 'Budget de fonctionnement de l’établissement',
        teacher_id: customParams.teacher_id ? parseInt(customParams.teacher_id) : undefined
      });
      downloadBlob(blob, `ordre_de_mission_officiel.pdf`);
      toast.success('Ordre de mission officiel généré avec succès');
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de l’ordre de mission');
    } finally {
      setGenerating(null);
    }
  };

  // 15. Attestation de service fait enseignant
  const handleGenerateServiceCompletion = async (teacher: any) => {
    setGenerating(`service-${teacher.id}`);
    try {
      const blob = await documentService.generateServiceCompletion(teacher.id, {
        course_name: customParams.course_name || 'Systèmes d’Information & Gestion Opérationnelle',
        total_hours: customParams.total_hours ? parseInt(customParams.total_hours) : 45,
        level: customParams.level || 'Licence 3'
      });
      downloadBlob(blob, `attestation_service_fait_${teacher.last_name}.pdf`);
      toast.success(`Attestation de service fait générée pour ${teacher.first_name} ${teacher.last_name}`);
      setModalType(null);
    } catch (e: any) {
      toast.error('Erreur lors de la génération de l’attestation de service fait');
    } finally {
      setGenerating(null);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const matchSearch =
        fullName.includes(search.toLowerCase()) ||
        s.matricule?.toLowerCase().includes(search.toLowerCase());
      const matchFiliere = !selectedFiliere || s.filiere === selectedFiliere;
      const matchLevel = !selectedLevel || s.level === selectedLevel;
      return matchSearch && matchFiliere && matchLevel;
    });
  }, [students, search, selectedFiliere, selectedLevel]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
        <p className="text-sm text-slate-500 font-medium">Chargement du centre officiel de génération...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 🏛️ BANDEAU OFFICIEL INSTITUTIONNEL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-amber-500 flex items-center justify-center shadow-lg shadow-[#FF6B00]/20">
              <FileCheck size={32} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-amber-300 border border-white/10">
                  RÉPUBLIQUE DU MALI • MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
                Centre Officiel des Documents Administratifs
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1">
                Conforme aux normes gouvernementales : Logo officiel centré, QR Code de certification & Cachet officiel circulaire à l'encre bleue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400">Établissement</div>
              <div className="text-sm font-bold text-amber-300">{university?.name || 'ECOB Universitaire'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400">Année Académique</div>
              <div className="text-sm font-bold text-white">2025-2026 / 2026-2027</div>
            </div>
          </div>
        </div>

        {/* Badges de conformité */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck size={16} />
            <span>Logo Officiel au Milieu</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Stamp size={16} />
            <span>Cachet Bleu Circulaire Direction</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <CheckCircle2 size={16} />
            <span>QR Code Certifié SHA-256</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-300">
            <Compass size={16} />
            <span>Harmonisation Secrétaire & Directeur</span>
          </div>
        </div>
      </div>

      {/* 🧭 NAVIGATION PAR ONGLETS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('scolarite')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all ${
            activeTab === 'scolarite'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GraduationCap size={18} />
          <span>Scolarité & Cursus</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20">7</span>
        </button>

        <button
          onClick={() => setActiveTab('stages')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all ${
            activeTab === 'stages'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase size={18} />
          <span>Stages & Recommandations</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20">3</span>
        </button>

        <button
          onClick={() => setActiveTab('examens')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all ${
            activeTab === 'examens'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet size={18} />
          <span>Examens & Délibérations</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20">3</span>
        </button>

        <button
          onClick={() => setActiveTab('direction')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all ${
            activeTab === 'direction'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building size={18} />
          <span>Direction & Personnel</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20">2</span>
        </button>
      </div>

      {/* CONTENU SELON L'ONGLET */}
      {/* ========================================================================= */}
      {/* 🎓 ONGLET 1 : SCOLARITÉ & CURSUS */}
      {/* ========================================================================= */}
      {activeTab === 'scolarite' && (
        <div className="space-y-6">
          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="🔍 Rechercher par nom, prénom ou matricule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <select
              value={selectedFiliere}
              onChange={(e) => setSelectedFiliere(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f: any) => (
                <option key={f.id || f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            >
              <option value="">Tous les niveaux</option>
              <option value="L1">Licence 1 (L1)</option>
              <option value="L2">Licence 2 (L2)</option>
              <option value="L3">Licence 3 (L3)</option>
              <option value="M1">Master 1 (M1)</option>
              <option value="M2">Master 2 (M2)</option>
            </select>
          </div>

          {/* Tableau des étudiants avec actions documentaires directes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Étudiants Inscrits</h3>
                <p className="text-xs text-slate-400">{filteredStudents.length} étudiant(s) trouvé(s)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Étudiant</th>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Filière & Niveau</th>
                    <th className="px-4 py-3 text-center">Actions Documentaires Rapides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.slice(0, 30).map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {student.last_name.toUpperCase()} {student.first_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-amber-700 bg-amber-50/50 rounded inline-block my-2 px-2 py-0.5">
                        {student.matricule || 'NON ATTRIBUÉ'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-medium">{student.filiere || 'Générale'}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-700">
                          {student.level || 'L1'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Scolarité */}
                          <button
                            onClick={() => handleGenerateEnrollment(student)}
                            disabled={generating === `enrollment-${student.id}`}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Attestation de scolarité"
                          >
                            {generating === `enrollment-${student.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <GraduationCap size={13} />
                            )}
                            Scolarité
                          </button>

                          {/* Assiduité */}
                          <button
                            onClick={() => handleGenerateAttendance(student)}
                            disabled={generating === `attendance-${student.id}`}
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Certificat d'assiduité / présence"
                          >
                            {generating === `attendance-${student.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Clock size={13} />
                            )}
                            Assiduité
                          </button>

                          {/* Admission */}
                          <button
                            onClick={() => handleGenerateAdmission(student)}
                            disabled={generating === `admission-${student.id}`}
                            className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Attestation d'admission officielle"
                          >
                            {generating === `admission-${student.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <FileCheck size={13} />
                            )}
                            Admission
                          </button>

                          {/* Relevé LMD */}
                          <button
                            onClick={() => handleGenerateTranscript(student)}
                            disabled={generating === `transcript-${student.id}`}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Relevé de notes officiel LMD"
                          >
                            {generating === `transcript-${student.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Award size={13} />
                            )}
                            Relevé LMD
                          </button>

                          {/* Quitus Financier */}
                          <button
                            onClick={() => handleGeneratePaymentCert(student)}
                            disabled={generating === `payment-${student.id}`}
                            className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Quitus financier & Attestation de paiement"
                          >
                            {generating === `payment-${student.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            Quitus
                          </button>

                          {/* Transfert / Radiation */}
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setModalType('transfer');
                              setCustomParams({ target_institution: 'Université d’Accueil' });
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Certificat de transfert / radiation"
                          >
                            Transfert
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💼 ONGLET 2 : STAGES, MÉMOIRES & RECOMMANDATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'stages' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Convention de Stage */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Briefcase size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Convention de Stage Tripartite</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Document tripartite officiel liant l'établissement universitaire, l'entreprise d'accueil et l'étudiant avec clauses d'assurance et d'évaluation.
              </p>
              <button
                onClick={() => {
                  setModalType('internship');
                  setCustomParams({
                    company_name: 'Orange Mali / Société Partenaire',
                    company_address: 'Bamako, République du Mali',
                    company_tutor: 'Direction des Ressources Humaines',
                    start_date: '01/06/2026',
                    end_date: '31/08/2026',
                    mission_description: 'Mise en application opérationnelle des compétences académiques'
                  });
                }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <FileText size={16} /> Configurer & Générer
              </button>
            </div>

            {/* Card 2: Lettre de Recommandation */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Send size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Lettre de Recommandation Officielle</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Émise par la Direction Générale attestant des aptitudes académiques et du sérieux de l'étudiant pour des concours, bourses ou embauches.
              </p>
              <button
                onClick={() => {
                  setModalType('recommendation');
                  setCustomParams({
                    target_entity: 'Aux Responsables des Recrutements & des Admissions',
                    appreciation: 'un(e) étudiant(e) brillant(e), consciencieux(se) et d’une probité morale exemplaire'
                  });
                }}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Send size={16} /> Configurer & Générer
              </button>
            </div>

            {/* Card 3: Dépôt de Mémoire */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Dépôt de Mémoire & Soutenance</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Attestation officielle de conformité académique autorisant l'étudiant de Licence ou Master à soutenir son projet de fin de cycle devant le jury.
              </p>
              <button
                onClick={() => {
                  setModalType('thesis');
                  setCustomParams({
                    thesis_title: 'Optimisation de la logistique multimodale en Afrique de l’Ouest',
                    supervisor_name: 'Dr. Directeur de Mémoire'
                  });
                }}
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <BookOpen size={16} /> Configurer & Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📋 ONGLET 3 : EXAMENS & DÉLIBÉRATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'examens' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Feuille d'émargement */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Feuille d'Émargement d'Examen</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Grille officielle par salle et matière avec signatures, statut d'émargement et colonnes d'anonymat pour les surveillants de session.
              </p>
              <button
                onClick={() => {
                  setModalType('exam-sheet');
                  setCustomParams({
                    course_name: 'Gestion des Opérations de Transport',
                    room_name: 'Amphi A - Salle 102',
                    session_title: 'Session Normale Semestre 5',
                    exam_date: new Date().toLocaleDateString('fr-FR')
                  });
                }}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet size={16} /> Générer la Feuille
              </button>
            </div>

            {/* Card 2: PV de Délibération */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center mb-4">
                <Award size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">PV de Délibération du Jury</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Procès-verbal officiel constatant la validation des crédits ECTS/LMD, statistiques d'admission, ajournements et signatures du président du jury.
              </p>
              <button
                onClick={() => {
                  setModalType('jury-pv');
                  setCustomParams({
                    session_title: 'Session Normale Semestre 6'
                  });
                }}
                className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 flex items-center justify-center gap-2"
              >
                <Award size={16} /> Générer le PV Officiel
              </button>
            </div>

            {/* Card 3: Convocation Individuelle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Calendar size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Convocation Individuelle</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Convocation nominative avec planning des épreuves, consignes disciplinaires ministérielles et QR Code de contrôle d'accès en salle.
              </p>
              <button
                onClick={() => {
                  setModalType('convocation');
                  setCustomParams({
                    session_title: 'Session Normale Semestre 5'
                  });
                }}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Calendar size={16} /> Sélectionner & Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👨‍🏫 ONGLET 4 : DIRECTION & PERSONNEL */}
      {/* ========================================================================= */}
      {activeTab === 'direction' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Ordre de Mission Officiel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Compass size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Ordre de Mission Officiel du Personnel</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Titre de voyage et de déplacement légal pour missions administratives, jurys d'examens délocalisés, conférences et audits de l'établissement.
              </p>
              <button
                onClick={() => {
                  setModalType('mission-order');
                  setCustomParams({
                    staff_name: 'Dr. Moussa COULIBALY',
                    staff_title: 'Enseignant-Chercheur / Directeur de Département',
                    staff_matricule: 'ENS-2026-0012',
                    mission_purpose: 'Supervision et audit des épreuves d’examens décentralisées',
                    destination: 'Ségou - République du Mali',
                    start_date: '15/06/2026',
                    end_date: '20/06/2026',
                    transport_mode: 'Véhicule de service ou transport régulier',
                    budget_charge: 'Budget de fonctionnement de l’établissement'
                  });
                }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Compass size={16} /> Configurer l'Ordre de Mission
              </button>
            </div>

            {/* Card 2: Attestation de Service Fait Enseignant */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-[#FF6B00] transition-all">
              <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center mb-4">
                <UserCheck size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Attestation de Service Fait Enseignant</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Certification des volumes horaires de cours magistraux, travaux dirigés et encadrements effectivement réalisés par les professeurs.
              </p>
              <button
                onClick={() => {
                  setModalType('service-completion');
                  setCustomParams({
                    course_name: 'Systèmes d’Information & Gestion Opérationnelle',
                    total_hours: 45,
                    level: 'Licence 3',
                    teacher_id: teachers.length > 0 ? teachers[0].id : ''
                  });
                }}
                className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 flex items-center justify-center gap-2"
              >
                <UserCheck size={16} /> Certifier les Heures
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛠️ MODAL DE CONFIGURATION & DE GÉNÉRATION */}
      {/* ========================================================================= */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FileCheck size={20} className="text-[#FF6B00]" />
                {modalType === 'internship' && 'Convention de Stage Tripartite'}
                {modalType === 'recommendation' && 'Lettre de Recommandation'}
                {modalType === 'thesis' && 'Dépôt de Mémoire & Soutenance'}
                {modalType === 'transfer' && 'Certificat de Transfert / Radiation'}
                {modalType === 'exam-sheet' && 'Feuille d’Émargement d’Examen'}
                {modalType === 'jury-pv' && 'PV de Délibération du Jury'}
                {modalType === 'convocation' && 'Convocation aux Examens'}
                {modalType === 'mission-order' && 'Ordre de Mission Officiel'}
                {modalType === 'service-completion' && 'Attestation de Service Fait'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Sélecteur d'étudiant si requis */}
            {['internship', 'recommendation', 'thesis', 'convocation'].includes(modalType) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sélectionner l'Étudiant</label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const st = students.find((s) => s.id === parseInt(e.target.value));
                    setSelectedStudent(st || null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="">Sélectionner un étudiant...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.last_name.toUpperCase()} {s.first_name} ({s.matricule || 'Sans matricule'} - {s.filiere})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Champs spécifiques Convention de stage */}
            {modalType === 'internship' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Entreprise d'Accueil</label>
                  <input
                    type="text"
                    value={customParams.company_name || ''}
                    onChange={(e) => setCustomParams({ ...customParams, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Adresse Entreprise</label>
                  <input
                    type="text"
                    value={customParams.company_address || ''}
                    onChange={(e) => setCustomParams({ ...customParams, company_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tuteur / Contact</label>
                  <input
                    type="text"
                    value={customParams.company_tutor || ''}
                    onChange={(e) => setCustomParams({ ...customParams, company_tutor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date Début</label>
                    <input
                      type="text"
                      value={customParams.start_date || ''}
                      onChange={(e) => setCustomParams({ ...customParams, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date Fin</label>
                    <input
                      type="text"
                      value={customParams.end_date || ''}
                      onChange={(e) => setCustomParams({ ...customParams, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Champs spécifiques Lettre de recommandation */}
            {modalType === 'recommendation' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destinataire</label>
                  <input
                    type="text"
                    value={customParams.target_entity || ''}
                    onChange={(e) => setCustomParams({ ...customParams, target_entity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Appréciation Générale</label>
                  <textarea
                    rows={3}
                    value={customParams.appreciation || ''}
                    onChange={(e) => setCustomParams({ ...customParams, appreciation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {/* Champs spécifiques Dépôt de mémoire */}
            {modalType === 'thesis' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thème du Mémoire</label>
                  <textarea
                    rows={2}
                    value={customParams.thesis_title || ''}
                    onChange={(e) => setCustomParams({ ...customParams, thesis_title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Directeur de Mémoire / Encadreur</label>
                  <input
                    type="text"
                    value={customParams.supervisor_name || ''}
                    onChange={(e) => setCustomParams({ ...customParams, supervisor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {/* Champs spécifiques Transfert */}
            {modalType === 'transfer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Établissement d'Accueil</label>
                  <input
                    type="text"
                    value={customParams.target_institution || ''}
                    onChange={(e) => setCustomParams({ ...customParams, target_institution: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {/* Champs spécifiques Feuille d'émargement */}
            {modalType === 'exam-sheet' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filière</label>
                    <input
                      type="text"
                      value={selectedFiliere || 'Logistique et Transport'}
                      onChange={(e) => setSelectedFiliere(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Niveau</label>
                    <input
                      type="text"
                      value={selectedLevel || 'Licence 3'}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matière / Épreuve</label>
                  <input
                    type="text"
                    value={customParams.course_name || ''}
                    onChange={(e) => setCustomParams({ ...customParams, course_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Salle / Amphi</label>
                    <input
                      type="text"
                      value={customParams.room_name || ''}
                      onChange={(e) => setCustomParams({ ...customParams, room_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date d'Examen</label>
                    <input
                      type="text"
                      value={customParams.exam_date || ''}
                      onChange={(e) => setCustomParams({ ...customParams, exam_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Champs spécifiques Ordre de mission */}
            {modalType === 'mission-order' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom du Missionnaire</label>
                    <input
                      type="text"
                      value={customParams.staff_name || ''}
                      onChange={(e) => setCustomParams({ ...customParams, staff_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fonction / Titre</label>
                    <input
                      type="text"
                      value={customParams.staff_title || ''}
                      onChange={(e) => setCustomParams({ ...customParams, staff_title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Objet de la Mission</label>
                  <input
                    type="text"
                    value={customParams.mission_purpose || ''}
                    onChange={(e) => setCustomParams({ ...customParams, mission_purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lieu / Destination</label>
                  <input
                    type="text"
                    value={customParams.destination || ''}
                    onChange={(e) => setCustomParams({ ...customParams, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date Départ</label>
                    <input
                      type="text"
                      value={customParams.start_date || ''}
                      onChange={(e) => setCustomParams({ ...customParams, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date Retour</label>
                    <input
                      type="text"
                      value={customParams.end_date || ''}
                      onChange={(e) => setCustomParams({ ...customParams, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Champs spécifiques Attestation service fait */}
            {modalType === 'service-completion' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Enseignant</label>
                  <select
                    value={customParams.teacher_id || ''}
                    onChange={(e) => setCustomParams({ ...customParams, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="">Sélectionner un enseignant...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.last_name.toUpperCase()} {t.first_name} ({t.department || t.speciality || 'Enseignant'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matière Enseignée</label>
                  <input
                    type="text"
                    value={customParams.course_name || ''}
                    onChange={(e) => setCustomParams({ ...customParams, course_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Volume Horaire Effectué (H)</label>
                    <input
                      type="number"
                      value={customParams.total_hours || 45}
                      onChange={(e) => setCustomParams({ ...customParams, total_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Niveau d'Enseignement</label>
                    <input
                      type="text"
                      value={customParams.level || 'Licence 3'}
                      onChange={(e) => setCustomParams({ ...customParams, level: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (modalType === 'internship' && selectedStudent) handleGenerateInternship(selectedStudent);
                  else if (modalType === 'recommendation' && selectedStudent) handleGenerateRecommendation(selectedStudent);
                  else if (modalType === 'thesis' && selectedStudent) handleGenerateThesis(selectedStudent);
                  else if (modalType === 'transfer' && selectedStudent) handleGenerateTransfer(selectedStudent);
                  else if (modalType === 'exam-sheet') handleGenerateExamSheet();
                  else if (modalType === 'jury-pv') handleGenerateJuryPV();
                  else if (modalType === 'convocation' && selectedStudent) handleGenerateConvocation(selectedStudent);
                  else if (modalType === 'mission-order') handleGenerateMissionOrder();
                  else if (modalType === 'service-completion') {
                    const t = teachers.find((x) => x.id === parseInt(customParams.teacher_id));
                    if (t) handleGenerateServiceCompletion(t);
                    else toast.error('Veuillez sélectionner un enseignant valide');
                  } else {
                    toast.error('Veuillez sélectionner un bénéficiaire');
                  }
                }}
                disabled={generating !== null}
                className="px-5 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-bold hover:bg-[#e05e00] flex items-center gap-2 shadow-md shadow-[#FF6B00]/25 disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Générer & Télécharger le Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
