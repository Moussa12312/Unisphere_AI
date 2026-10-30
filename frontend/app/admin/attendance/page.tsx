"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import api from "@/lib/api";
import { exportToExcel } from "@/lib/exportExcel";
import { toast } from "react-hot-toast";

interface StudentAttendance {
  id: number;
  student_id: number;
  student_name: string;
  matricule: string;
  level: string;
  class_name: string;
  course: string;
  status: string;
  late_minutes: number;
  expected_start: string | null;
  effective_hours: number | null;
  scan_time: string | null;
  date: string | null;
  scanned_by: string | null;
}

interface TeacherStats {
  teacher_id: number;
  teacher_name: string;
  department: string;
  total_scans: number;
  on_time: number;
  late_count: number;
  total_late_minutes: number;
  total_effective_hours: number;
  total_expected_hours: number;
  hours_lost: number;
  punctuality_rate: number;
}

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<"students" | "teachers">("students");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Données étudiants
  const [attendances, setAttendances] = useState<StudentAttendance[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, attendance_rate: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  // Données enseignants
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Stats globales du jour
      const statsRes = await api.get("/api/v1/attendance/today/stats");
      setStats(statsRes.data || { total: 0, present: 0, absent: 0, late: 0, attendance_rate: 0 });

      // 2. Présences détaillées avec filtre de date
      const attRes = await api.get(`/api/v1/attendance/history`, {
        params: {
          start_date: dateFilter,
          end_date: dateFilter,
          limit: 200
        }
      });
      setAttendances(attRes.data || []);

      // 3. Suivi des enseignants
      const teacherRes = await api.get("/api/v1/attendance/teacher/stats");
      setTeacherStats(teacherRes.data || []);
    } catch (err: any) {
      console.error("Erreur chargement présences admin :", err);
      toast.error("Erreur lors du chargement des présences");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtrage étudiants
  const filteredStudents = attendances.filter((att) => {
    const matchesSearch = 
      (att.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (att.matricule || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (att.class_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || att.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtrage enseignants
  const filteredTeachers = teacherStats.filter((t) => {
    return (
      (t.teacher_name || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
      (t.department || "").toLowerCase().includes(teacherSearch.toLowerCase())
    );
  });

  // Export Excel Étudiants
  const exportStudentsExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const dataToExport = filteredStudents.map((att) => ({
      "Matricule": att.matricule || "N/A",
      "Étudiant": att.student_name || "N/A",
      "Niveau": att.level || "N/A",
      "Filière": att.class_name || "N/A",
      "Statut": att.status === "present" ? "Présent" : att.status === "late" ? `En retard (${att.late_minutes} min)` : att.status === "excused" ? "Excusé" : "Absent",
      "Heure d'entrée": att.scan_time ? new Date(att.scan_time).toLocaleTimeString("fr-FR") : "-",
      "Date": att.date || dateFilter,
      "Validé par": att.scanned_by || "Système"
    }));
    exportToExcel(dataToExport, `Presences_Etudiants_${dateFilter}`);
    toast.success("Export Excel des présences étudiants réussi");
  };

  // Export Excel Enseignants
  const exportTeachersExcel = () => {
    if (filteredTeachers.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const dataToExport = filteredTeachers.map((t) => ({
      "Enseignant": t.teacher_name,
      "Département": t.department || "Général",
      "Total Séances": t.total_scans,
      "À l'heure": t.on_time,
      "En retard": t.late_count,
      "Cumul retards (min)": t.total_late_minutes,
      "Heures prévues (h)": t.total_expected_hours,
      "Heures effectives (h)": t.total_effective_hours,
      "Heures perdues (h)": t.hours_lost,
      "Taux de ponctualité (%)": `${t.punctuality_rate}%`
    }));
    exportToExcel(dataToExport, `Suivi_Enseignants_${dateFilter}`);
    toast.success("Export Excel du suivi des enseignants réussi");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-[#031B63]" />
            Gestion des Présences & Suivi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervision en temps réel des présences étudiantes et de la ponctualité des enseignants
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            Actualiser
          </button>

          {activeTab === "students" ? (
            <button
              onClick={exportStudentsExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Exporter Excel (.xlsx)
            </button>
          ) : (
            <button
              onClick={exportTeachersExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Exporter Suivi (.xlsx)
            </button>
          )}
        </div>
      </div>

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Étudiants</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</div>
          <p className="text-xs text-slate-400 mt-1">Inscrits actifs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Présents</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{stats.present}</div>
          <p className="text-xs text-slate-400 mt-1">Taux : {Math.round(stats.attendance_rate)}%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">En Retard</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.late}</div>
          <p className="text-xs text-slate-400 mt-1">Arrivés après l'heure</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Absents</span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600">{stats.absent}</div>
          <p className="text-xs text-slate-400 mt-1">Non enregistrés</p>
        </div>
      </div>

      {/* Onglets Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "students"
              ? "border-[#031B63] text-[#031B63]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Présences Étudiants ({filteredStudents.length})
        </button>

        <button
          onClick={() => setActiveTab("teachers")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "teachers"
              ? "border-[#031B63] text-[#031B63]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Suivi des Enseignants ({filteredTeachers.length})
        </button>
      </div>

      {/* Contenu Onglet 1 : Étudiants */}
      {activeTab === "students" && (
        <div className="space-y-4">
          {/* Barre de filtres */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher étudiant, matricule, filière..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tous les statuts</option>
                <option value="present">Présent</option>
                <option value="late">En retard</option>
                <option value="absent">Absent</option>
                <option value="excused">Excusé</option>
              </select>
            </div>
          </div>

          {/* Table Étudiants Responsive */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-w-[700px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Étudiant</th>
                    <th className="py-3.5 px-4">Matricule</th>
                    <th className="py-3.5 px-4">Niveau / Filière</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4">Heure de scan</th>
                    <th className="py-3.5 px-4">Opérateur / Appel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Chargement des présences...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Aucun enregistrement de présence pour cette date.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {att.student_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                          {att.matricule}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800">{att.level}</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-xs text-slate-500">{att.class_name || "N/A"}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {att.status === "present" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Présent
                            </span>
                          )}
                          {att.status === "late" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Retard {att.late_minutes > 0 ? `(${att.late_minutes} min)` : ""}
                            </span>
                          )}
                          {att.status === "absent" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Absent
                            </span>
                          )}
                          {att.status === "excused" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              Excusé
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {att.scan_time ? new Date(att.scan_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {att.scanned_by || "Gardien / Appel"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenu Onglet 2 : Suivi Enseignants */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          {/* Recherche Enseignants */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un enseignant ou département..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-slate-500">
              Basé sur les scans QR Code à l'entrée des cours et le respect de l'emploi du temps
            </p>
          </div>

          {/* Table Suivi Enseignants Responsive */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-w-[750px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Enseignant</th>
                    <th className="py-3.5 px-4">Département</th>
                    <th className="py-3.5 px-4 text-center">Séances</th>
                    <th className="py-3.5 px-4 text-center">Ponctualité</th>
                    <th className="py-3.5 px-4 text-center">Heures Prévues</th>
                    <th className="py-3.5 px-4 text-center">Heures Effectives</th>
                    <th className="py-3.5 px-4 text-center">Heures Perdues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chargement des statistiques enseignants...
                      </td>
                    </tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Aucun enseignant enregistré pour le moment.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t) => (
                      <tr key={t.teacher_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {t.teacher_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {t.department || "Général"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-800">
                          {t.total_scans}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              t.punctuality_rate >= 90
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : t.punctuality_rate >= 75
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {t.punctuality_rate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                          {t.total_expected_hours}h
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                          {t.total_effective_hours}h
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-rose-600">
                          {t.hours_lost > 0 ? `-${t.hours_lost}h` : "0h"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}