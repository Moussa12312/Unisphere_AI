'use client';
import { useState, useEffect } from 'react';
import {
  Save, GraduationCap, Calculator, Clock, CheckCircle,
  XCircle, BookOpen, Award, Info, DollarSign, Calendar,
  Lock, AlertTriangle, Layers, Plus, Trash2, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import academicFeeService from '@/services/academicFeeService';
import paymentTrancheService from '@/services/paymentTrancheService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

interface AcademicConfig {
  grading_system: string;
  min_passing_grade: number;
  max_grade: number;
  min_attendance_rate: number;
  default_cc_coefficient: number;
  default_exam_coefficient: number;
  allow_compensation: boolean;
  allow_makeup_exam: boolean;
  min_gpa_to_pass: number;
  current_academic_year: string;
  semester_system: string;
}

interface AcademicFee {
  id: number;
  level: string;
  payment_type: string;
  amount: number;
  academic_year: string;
  is_locked: boolean;
  locked_count: number;
}

interface PaymentDeadline {
  id: number;
  deadline_type: string;
  deadline_date: string;
  academic_year: string;
  description: string;
}

interface Tranche {
  id: number;
  level: string;
  payment_type: string;
  academic_year: string;
  tranche_number: number;
  tranche_name: string;
  percentage: number;
  amount: number;
  due_date: string | null;
}

export default function AcademicConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('frais');
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [config, setConfig] = useState<AcademicConfig>({
    grading_system: 'sur_20',
    min_passing_grade: 10.0,
    max_grade: 20.0,
    min_attendance_rate: 75.0,
    default_cc_coefficient: 0.3,
    default_exam_coefficient: 0.7,
    allow_compensation: true,
    allow_makeup_exam: true,
    min_gpa_to_pass: 10.0,
    current_academic_year: '2025-2026',
    semester_system: 'semestriel'
  });

  const [fees, setFees] = useState<AcademicFee[]>([]);
  const [editingFee, setEditingFee] = useState<{level: string, type: string, amount: string} | null>(null);
  const [deadlines, setDeadlines] = useState<PaymentDeadline[]>([]);
  const [editingDeadline, setEditingDeadline] = useState<{type: string, date: string, description: string} | null>(null);
  
  // ✅ États pour les présences
  const [lateThreshold, setLateThreshold] = useState('08:30');
  const [savingPresences, setSavingPresences] = useState(false);

  // ✅ Pénalités
  const [penalties, setPenalties] = useState({
    amount: 5000,
    auto_apply: true
  });

  // ✅ Tranches
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [trancheForm, setTrancheForm] = useState({
    level: 'L1',
    payment_type: 'scolarite',
    tranche_number: 1,
    tranche_name: '1ère tranche',
    percentage: 30,
    due_date: ''
  });
  const [addingTranche, setAddingTranche] = useState(false);

  // ✅✅✅ HOOKS AU NIVEAU SUPÉRIEUR (CRITIQUE !)
  useEffect(() => {
    loadAll();
    loadAttendanceConfig();
  }, []);

  // ✅ Charger la config des présences
  const loadAttendanceConfig = async () => {
    try {
      const response = await api.get('/api/v1/attendance/config');
      setLateThreshold(response.data.late_threshold || '08:30');
    } catch (error) {
      console.log('Config présences non chargée (valeur par défaut utilisée)');
    }
  };

  // ✅ Sauvegarder la config des présences
  const handleSavePresences = async () => {
    setSavingPresences(true);
    try {
      await api.put('/api/v1/attendance/config', {
        late_threshold: lateThreshold
      });
      toast.success('✅ Configuration des présences sauvegardée !');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSavingPresences(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const configRes = await api.get('/api/v1/settings/academic/config');
      const loadedConfig = configRes.data;
      setConfig(loadedConfig);
      
      const academicYear = loadedConfig.current_academic_year || '2025-2026';
      
      const [feesRes, deadlinesRes, tranchesRes] = await Promise.all([
        academicFeeService.getFees(academicYear).catch(() => []),
        academicFeeService.getDeadlines(academicYear).catch(() => []),
        paymentTrancheService.getAll({ academic_year: academicYear }).catch(() => [])
      ]);
      
      const normalizedFees = Array.isArray(feesRes) ? feesRes : (feesRes?.data || []);
      const normalizedDeadlines = Array.isArray(deadlinesRes) ? deadlinesRes : (deadlinesRes?.data || []);
      const normalizedTranches = Array.isArray(tranchesRes) ? tranchesRes : [];
      
      setFees(normalizedFees);
      setDeadlines(normalizedDeadlines);
      setTranches(normalizedTranches);
      
      console.log('📊 Config chargée:', { academicYear });
      console.log('💰 Frais chargés:', normalizedFees.length, 'entrées');
      console.log('📅 Deadlines chargées:', normalizedDeadlines.length, 'entrées');
      console.log('📦 Tranches chargées:', normalizedTranches.length, 'entrées');
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
      setFees([]);
      setDeadlines([]);
      setTranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings/academic/config', config);
      
      if (editingDeadline && editingDeadline.date && editingDeadline.date.trim() !== '') {
        await academicFeeService.createOrUpdateDeadline({
          deadline_type: editingDeadline.type,
          deadline_date: editingDeadline.date,
          academic_year: config.current_academic_year,
          description: editingDeadline.description
        });
        setEditingDeadline(null);
      }
      
      await loadAll();
      toast.success('✅ Configuration globale sauvegardée !');
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFee = async () => {
    if (!editingFee) return;
    try {
      await academicFeeService.createOrUpdateFee({
        level: editingFee.level,
        payment_type: editingFee.type,
        amount: parseFloat(editingFee.amount),
        academic_year: config.current_academic_year
      });
      toast.success('Frais mis à jour');
      setEditingFee(null);
      loadAll();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    }
  };

  const handleSaveDeadline = async () => {
    if (!editingDeadline) return;
    
    if (!editingDeadline.date || editingDeadline.date.trim() === '') {
      toast.error('⚠️ Veuillez sélectionner une date valide');
      setEditingDeadline(null);
      return;
    }
    
    const selectedDate = new Date(editingDeadline.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('⚠️ La date doit être dans le futur');
      setEditingDeadline(null);
      return;
    }
    
    try {
      await academicFeeService.createOrUpdateDeadline({
        deadline_type: editingDeadline.type,
        deadline_date: editingDeadline.date,
        academic_year: config.current_academic_year,
        description: editingDeadline.description
      });
      
      const deadlineLabel = deadlineTypes.find(d => d.value === editingDeadline.type)?.label || 'Date limite';
      toast.success(`✅ "${deadlineLabel}" enregistrée avec succès !`);
      
      setEditingDeadline(null);
      await loadAll();
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde deadline:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  // ✅✅✅ handleAddTranche PROPRE (sans useEffect ni fonctions imbriquées)
  const handleAddTranche = async () => {
    if (trancheForm.percentage <= 0 || trancheForm.percentage > 100) {
      toast.error('Le pourcentage doit être entre 1 et 100');
      return;
    }
  
    const totalAmount = getFeeAmount(trancheForm.level, trancheForm.payment_type);
    
    if (!totalAmount || totalAmount === 0) {
      const typeName = paymentTypes.find(t => t.value === trancheForm.payment_type)?.label;
      toast.error(
        `⚠️ Veuillez d'abord configurer le montant de "${typeName}" pour ${trancheForm.level} dans le tableau ci-dessus, ` +
        `puis cliquez sur le bouton 💾 (disquette) pour sauvegarder.`
      );
      return;
    }
  
    setAddingTranche(true);
    try {
      await paymentTrancheService.create({
        level: trancheForm.level,
        payment_type: trancheForm.payment_type,
        academic_year: config.current_academic_year,
        tranche_number: trancheForm.tranche_number,
        tranche_name: trancheForm.tranche_name,
        percentage: trancheForm.percentage,
        amount: (totalAmount * trancheForm.percentage) / 100,
        due_date: trancheForm.due_date || undefined
      });
      toast.success(`✅ Tranche ajoutée ! Montant calculé : ${((totalAmount * trancheForm.percentage) / 100).toLocaleString('fr-FR')} FCFA`);
      loadAll();
      setTrancheForm({
        ...trancheForm,
        tranche_number: trancheForm.tranche_number + 1,
        tranche_name: `${trancheForm.tranche_number + 1}ème tranche`,
        percentage: 30,
        due_date: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setAddingTranche(false);
    }
  };

  // ✅ handleDeleteTranche avec useConfirm
  const handleDeleteTranche = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Supprimer cette tranche ?',
      message: `Voulez-vous vraiment supprimer "${name}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
  
    if (ok) {
      try {
        await paymentTrancheService.delete(id);
        toast.success('Tranche supprimée');
        loadAll();
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  const handleChange = <K extends keyof AcademicConfig>(field: K, value: AcademicConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCCChange = (value: number) => {
    const cc = Math.max(0, Math.min(1, value));
    const exam = parseFloat((1 - cc).toFixed(2));
    setConfig(prev => ({ ...prev, default_cc_coefficient: cc, default_exam_coefficient: exam }));
  };

  const handleExamChange = (value: number) => {
    const exam = Math.max(0, Math.min(1, value));
    const cc = parseFloat((1 - exam).toFixed(2));
    setConfig(prev => ({ ...prev, default_exam_coefficient: exam, default_cc_coefficient: cc }));
  };

  const getFeeAmount = (level: string, type: string): number | null => {
    if (!fees || !Array.isArray(fees)) return null;
    const fee = fees.find(f => f.level === level && f.payment_type === type && f.academic_year === config.current_academic_year);
    return fee ? fee.amount : null;
  };

  const isFeeLocked = (level: string, type: string): boolean => {
    if (!fees || !Array.isArray(fees)) return false;
    const fee = fees.find(f => f.level === level && f.payment_type === type && f.academic_year === config.current_academic_year);
    return fee ? fee.is_locked : false;
  };

  const getDeadline = (type: string): PaymentDeadline | undefined => {
    if (!deadlines || !Array.isArray(deadlines)) return undefined;
    const deadline = deadlines.find(d => 
      d.deadline_type === type && d.academic_year === config.current_academic_year
    );
    
    if (deadline && deadline.deadline_date) {
      return {
        ...deadline,
        deadline_date: deadline.deadline_date.split('T')[0]
      };
    }
    
    return deadline;
  };

  const filteredTranches = tranches.filter(t => 
    t.level === trancheForm.level && 
    t.payment_type === trancheForm.payment_type
  );
  const totalPercentage = filteredTranches.reduce((sum, t) => sum + t.percentage, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const paymentTypes = [
    { value: 'scolarite', label: 'Scolarité', icon: BookOpen },
    { value: 'inscription', label: 'Inscription', icon: GraduationCap },
    { value: 'autre', label: 'Autre', icon: DollarSign }
  ];
  const deadlineTypes = [
    { value: 'inscription_start', label: 'Début des inscriptions', icon: Calendar },
    { value: 'inscription_end', label: 'Fin des inscriptions', icon: Calendar },
    { value: 'semester1_start', label: 'Début Semestre 1', icon: Calendar },
    { value: 'semester1_end', label: 'Fin Semestre 1', icon: Calendar },
    { value: 'semester2_start', label: 'Début Semestre 2', icon: Calendar },
    { value: 'semester2_end', label: 'Fin Semestre 2', icon: Calendar },
    { value: 'exams_s2', label: 'Examens Semestre 2 (Date limite reliquats)', icon: AlertTriangle }
  ];

  const tabs = [
    { id: 'frais', label: 'Frais & Tranches', icon: DollarSign },
    { id: 'calendrier', label: 'Calendrier', icon: Calendar },
    { id: 'notation', label: 'Notation', icon: Calculator },
    { id: 'assiduite', label: 'Assiduité', icon: Clock },
    { id: 'presences', label: 'Présences', icon: CheckCircle },
    { id: 'deliberation', label: 'Délibération', icon: Award }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuration Académique & Financière</h1>
          <p className="text-slate-500 mt-1">Gérez tous les paramètres de votre université</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] transition-all shadow-md disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#FF6B00] border-b-2 border-[#FF6B00] bg-orange-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* TAB: FRAIS & TRANCHES */}
          {activeTab === 'frais' && (
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Frais académiques par niveau</h2>
                    <p className="text-sm text-slate-500">Configurez les montants détaillés pour chaque niveau et type de paiement</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                        {paymentTypes.map(type => (
                          <th key={type.value} className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                            {type.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {levels.map(level => (
                        <tr key={level} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4">
                            <span className="font-semibold text-slate-900">{level}</span>
                          </td>
                          {paymentTypes.map(type => {
                            const amount = getFeeAmount(level, type.value);
                            const locked = isFeeLocked(level, type.value);
                            const isEditing = editingFee?.level === level && editingFee?.type === type.value;
                            return (
                              <td key={type.value} className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {locked && (
                                    <span title="Verrouillé" className="cursor-help">
                                      <Lock size={14} className="text-orange-500" />
                                    </span>
                                  )}
                                  <input
                                    type="number"
                                    value={isEditing ? editingFee.amount : (amount || '')}
                                    onChange={(e) => setEditingFee({ level, type: type.value, amount: e.target.value })}
                                    onFocus={() => {
                                      if (!isEditing) {
                                        setEditingFee({ level, type: type.value, amount: amount?.toString() || '' });
                                      }
                                    }}
                                    className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                                    placeholder="0 FCFA"
                                  />
                                  {isEditing && (
                                    <button
                                      onClick={handleSaveFee}
                                      className="px-3 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-xs font-medium"
                                    >
                                      <Save size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tranches de paiement */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Layers className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Tranches de paiement</h2>
                    <p className="text-sm text-slate-500">Définissez les échéances pour chaque niveau</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Ajouter une tranche</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={trancheForm.level}
                      onChange={(e) => setTrancheForm({ ...trancheForm, level: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      {levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select
                      value={trancheForm.payment_type}
                      onChange={(e) => setTrancheForm({ ...trancheForm, payment_type: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      {paymentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                      type="text"
                      value={trancheForm.tranche_name}
                      onChange={(e) => setTrancheForm({ ...trancheForm, tranche_name: e.target.value })}
                      placeholder="Nom de la tranche"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={trancheForm.percentage}
                      onChange={(e) => setTrancheForm({ ...trancheForm, percentage: parseFloat(e.target.value) || 0 })}
                      placeholder="%"
                      min="1"
                      max="100"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={trancheForm.due_date}
                      onChange={(e) => setTrancheForm({ ...trancheForm, due_date: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleAddTranche}
                      disabled={addingTranche}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {addingTranche ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Tranches pour {trancheForm.level} - {paymentTypes.find(t => t.value === trancheForm.payment_type)?.label}
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    totalPercentage === 100 
                      ? 'bg-green-100 text-green-700' 
                      : totalPercentage > 100
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    Total : {totalPercentage}%
                  </div>
                </div>

                {filteredTranches.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-sm">Aucune tranche configurée</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Tranche</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">%</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Montant</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Date limite</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTranches.map((tranche) => (
                          <tr key={tranche.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 text-sm font-medium text-slate-900">{tranche.tranche_name}</td>
                            <td className="py-2 px-3 text-sm text-slate-600">{tranche.percentage}%</td>
                            <td className="py-2 px-3 text-sm font-semibold text-slate-900">{tranche.amount.toLocaleString('fr-FR')} FCFA</td>
                            <td className="py-2 px-3 text-sm text-slate-600">
                              {tranche.due_date ? new Date(tranche.due_date).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleDeleteTranche(tranche.id, tranche.tranche_name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pénalités */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertTriangle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Pénalités de retard</h2>
                    <p className="text-sm text-slate-500">Configurez les pénalités pour paiement en retard</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Montant de la pénalité (FCFA)</label>
                    <input
                      type="number"
                      value={penalties.amount}
                      onChange={(e) => setPenalties({ ...penalties, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl w-full cursor-pointer">
                      <input
                        type="checkbox"
                        checked={penalties.auto_apply}
                        onChange={(e) => setPenalties({ ...penalties, auto_apply: e.target.checked })}
                        className="w-5 h-5 text-[#FF6B00] rounded focus:ring-[#FF6B00]"
                      />
                      <span className="text-sm font-medium text-slate-700">Appliquer automatiquement après la date limite</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CALENDRIER */}
          {activeTab === 'calendrier' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Calendrier universitaire</h2>
                  <p className="text-sm text-slate-500">Configurez les dates importantes</p>
                </div>
              </div>

              <div className="space-y-4">
                {deadlineTypes.map(deadlineType => {
                  const deadline = getDeadline(deadlineType.value);
                  const Icon = deadlineType.icon;
                  const isEditing = editingDeadline?.type === deadlineType.value;
                  const currentValue = isEditing ? editingDeadline.date : (deadline?.deadline_date || '');
                  const originalValue = deadline?.deadline_date || '';
                  const hasChanged = isEditing && editingDeadline.date !== originalValue;
                  
                  return (
                    <div key={deadlineType.value} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                            <Icon className="text-slate-600" size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{deadlineType.label}</p>
                            {deadlineType.value === 'exams_s2' && (
                              <p className="text-xs text-red-600 mt-1">
                                ⚠️ Date limite pour payer les reliquats avant les examens
                              </p>
                            )}
                          </div>
                        </div>
                        {deadline?.deadline_date && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            ✓ Configurée
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={currentValue}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setEditingDeadline({
                              type: deadlineType.value,
                              date: newDate,
                              description: deadline?.description || ''
                            });
                          }}
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
                        />
                        
                        {hasChanged && (
                          <button
                            onClick={handleSaveDeadline}
                            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <Save size={14} />
                            Enregistrer
                          </button>
                        )}
                        
                        {isEditing && hasChanged && (
                          <button
                            onClick={() => setEditingDeadline(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <XCircle size={14} />
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Année académique</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Année en cours</label>
                    <input
                      type="text"
                      value={config.current_academic_year}
                      onChange={(e) => handleChange('current_academic_year', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      placeholder="2025-2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Système</label>
                    <select
                      value={config.semester_system}
                      onChange={(e) => handleChange('semester_system', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    >
                      <option value="semestriel">Semestriel (2 semestres)</option>
                      <option value="trimestriel">Trimestriel (3 trimestres)</option>
                      <option value="annuel">Annuel (1 année)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTATION */}
          {activeTab === 'notation' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calculator className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Système de notation</h2>
                  <p className="text-sm text-slate-500">Configurez la barre de notation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Système de notation</label>
                  <select
                    value={config.grading_system}
                    onChange={(e) => handleChange('grading_system', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="sur_20">Sur 20 (France/Afrique)</option>
                    <option value="sur_100">Sur 100 (USA/International)</option>
                    <option value="gpa_4">GPA 4.0 (Système américain)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note minimale</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={config.min_passing_grade}
                      onChange={(e) => handleChange('min_passing_grade', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium bg-slate-100 px-2 py-1 rounded">
                      / {config.max_grade}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note maximale</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.max_grade}
                      onChange={(e) => handleChange('max_grade', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium bg-slate-100 px-2 py-1 rounded">
                      points
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Coefficients CC/Examen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contrôle Continu (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.default_cc_coefficient}
                      onChange={(e) => handleCCChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Examen Final (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.default_exam_coefficient}
                      onChange={(e) => handleExamChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${config.default_cc_coefficient * 100}%` }}
                    >
                      CC
                    </div>
                    <div
                      className="h-full bg-orange-500 transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${config.default_exam_coefficient * 100}%` }}
                    >
                      EXAMEN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSIDUITÉ */}
          {activeTab === 'assiduite' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assiduité</h2>
                  <p className="text-sm text-slate-500">Règles de présence aux cours</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Taux de présence minimum</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.min_attendance_rate}
                      onChange={(e) => handleChange('min_attendance_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium bg-slate-100 px-2 py-1 rounded">
                      %
                    </span>
                  </div>
                  <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 rounded-lg">
                    <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-blue-700">
                      Les étudiants avec un taux inférieur ne pourront pas passer l'examen final
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="64" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                      <circle
                        cx="80"
                        cy="80"
                        r="64"
                        stroke="#10B981"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(config.min_attendance_rate / 100) * 402} 402`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{config.min_attendance_rate}%</span>
                      <span className="text-xs text-slate-500 mt-1">minimum requis</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ TAB: PRÉSENCES (NOUVEAU) */}
          {activeTab === 'presences' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Configuration des présences</h2>
                  <p className="text-sm text-slate-500">Définissez les règles de pointage</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Heure limite de présence</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Les étudiants arrivant après cette heure seront marqués comme <strong className="text-orange-600">"En retard"</strong>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Heure limite
                    </label>
                    <input
                      type="time"
                      value={lateThreshold}
                      onChange={(e) => setLateThreshold(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={handleSavePresences}
                      disabled={savingPresences}
                      className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] transition-all shadow-md disabled:opacity-50"
                    >
                      <Save size={16} />
                      {savingPresences ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Comment ça fonctionne ?</p>
                      <ul className="text-xs text-blue-700 mt-2 space-y-1">
                        <li>• Si un étudiant scanne <strong>avant {lateThreshold}</strong> → Statut : <span className="font-bold text-green-700">Présent</span></li>
                        <li>• Si un étudiant scanne <strong>après {lateThreshold}</strong> → Statut : <span className="font-bold text-orange-700">En retard</span></li>
                        <li>• Le gardien ne peut pas modifier cette heure (réservé admin/secrétaire/censeur)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Statuts de présence</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                    <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-900">Présent</p>
                    <p className="text-xs text-green-700 mt-1">Arrivée à l'heure</p>
                  </div>
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
                    <Clock size={32} className="text-orange-600 mx-auto mb-2" />
                    <p className="font-bold text-orange-900">En retard</p>
                    <p className="text-xs text-orange-700 mt-1">Après {lateThreshold}</p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <XCircle size={32} className="text-red-600 mx-auto mb-2" />
                    <p className="font-bold text-red-900">Absent</p>
                    <p className="text-xs text-red-700 mt-1">Non scanné</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <AlertTriangle size={32} className="text-blue-600 mx-auto mb-2" />
                    <p className="font-bold text-blue-900">Excusé</p>
                    <p className="text-xs text-blue-700 mt-1">Absence justifiée</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DÉLIBÉRATION */}
          {activeTab === 'deliberation' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Award className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Règles de délibération</h2>
                  <p className="text-sm text-slate-500">Options de validation des résultats</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        config.allow_compensation ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {config.allow_compensation ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <XCircle className="text-red-600" size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Compensation entre matières</p>
                        <p className="text-sm text-slate-500 mt-1">Autoriser la compensation des notes faibles par des notes fortes</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13">
                    <button
                      onClick={() => handleChange('allow_compensation', true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        config.allow_compensation
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle size={16} />
                      Actif
                    </button>
                    <button
                      onClick={() => handleChange('allow_compensation', false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        !config.allow_compensation
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle size={16} />
                      Inactif
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        config.allow_makeup_exam ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {config.allow_makeup_exam ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <XCircle className="text-red-600" size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Session de rattrapage</p>
                        <p className="text-sm text-slate-500 mt-1">Permettre aux étudiants échoués de repasser l'examen</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13">
                    <button
                      onClick={() => handleChange('allow_makeup_exam', true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        config.allow_makeup_exam
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle size={16} />
                      Actif
                    </button>
                    <button
                      onClick={() => handleChange('allow_makeup_exam', false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        !config.allow_makeup_exam
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle size={16} />
                      Inactif
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-semibold text-slate-900 mb-3">
                    GPA minimum pour valider l'année
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="0.1"
                      value={config.min_gpa_to_pass}
                      onChange={(e) => handleChange('min_gpa_to_pass', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 pr-16 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium bg-slate-100 px-2 py-1 rounded">
                      / {config.max_grade}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}