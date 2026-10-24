'use client';
import { useState, useEffect } from 'react';
import {
  Save, GraduationCap, Calculator, Clock, CheckCircle,
  XCircle, BookOpen, Award, Info, DollarSign, Calendar,
  Lock, AlertTriangle, Layers, Plus, Trash2, Loader2,
  Check, ShieldCheck, Sparkles, RefreshCw, ArrowRight, Edit3, Share2
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
  penalty_amount?: number;
  penalty_auto_apply?: boolean;
}

interface AcademicFee {
  id: number;
  level: string;
  domain?: string | null;
  payment_type: string;
  amount: number;
  currency?: string;
  academic_year: string;
  is_locked: boolean;
  locked_count: number;
  has_monthly_option?: boolean;
  monthly_deposit?: number | null;
  monthly_installment?: number | null;
  monthly_months_count?: number;
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
  domain?: string | null;
  payment_type: string;
  academic_year: string;
  tranche_number: number;
  tranche_name: string;
  percentage: number;
  amount: number;
  due_date: string | null;
}

// ✅ Pôles / Domaines associés partageant les mêmes frais académiques
const ASSOCIATED_DOMAINS = [
  'Gestion & Economie',
  'Communication & Medias',
  'Informatique & Technologies'
];

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
  const [domaines, setDomaines] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [deadlines, setDeadlines] = useState<PaymentDeadline[]>([]);
  const [editingDeadline, setEditingDeadline] = useState<{type: string, date: string, description: string} | null>(null);

  // ✅ Synchronisation groupée des 3 pôles associés
  const [autoSyncGroup, setAutoSyncGroup] = useState<boolean>(true);
  const [syncingDomains, setSyncingDomains] = useState<boolean>(false);
  
  // ✅ États pour les présences
  const [lateThreshold, setLateThreshold] = useState('08:30');
  const [savingPresences, setSavingPresences] = useState(false);

  // ✅ Pénalités
  const [penalties, setPenalties] = useState({
    amount: 5000,
    auto_apply: true
  });

  // ✅ Configuration stricte des 3 Tranches (P1, P2, P3 = 100%)
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [selectedTrancheLevel, setSelectedTrancheLevel] = useState<string>('L1');
  const [savingThreeTranches, setSavingThreeTranches] = useState(false);
  const [threeTranches, setThreeTranches] = useState<[
    { tranche_number: number; tranche_name: string; percentage: number; due_date: string },
    { tranche_number: number; tranche_name: string; percentage: number; due_date: string },
    { tranche_number: number; tranche_name: string; percentage: number; due_date: string }
  ]>([
    { tranche_number: 1, tranche_name: '1ère tranche (P1 - Rentrée / Inscription)', percentage: 40, due_date: '' },
    { tranche_number: 2, tranche_name: '2ème tranche (P2 - Semestre 1)', percentage: 30, due_date: '' },
    { tranche_number: 3, tranche_name: '3ème tranche (P3 - Solde Semestre 2)', percentage: 30, due_date: '' }
  ]);

  // ✅✅✅ HOOKS AU NIVEAU SUPÉRIEUR (CRITIQUE !)
  useEffect(() => {
    loadAll();
    loadAttendanceConfig();
  }, []);

  // ✅ Synchronisation automatique des 3 tranches quand le niveau, le domaine ou les tranches changent
  useEffect(() => {
    const matching = tranches.filter(t => 
      t.level === selectedTrancheLevel && 
      t.payment_type === 'scolarite' &&
      ((!selectedDomain && (!t.domain || t.domain === '')) || t.domain === selectedDomain)
    );

    const t1 = matching.find(t => t.tranche_number === 1);
    const t2 = matching.find(t => t.tranche_number === 2);
    const t3 = matching.find(t => t.tranche_number === 3);

    if (t1 && t2 && t3) {
      setThreeTranches([
        {
          tranche_number: 1,
          tranche_name: t1.tranche_name || '1ère tranche (P1 - Rentrée / Inscription)',
          percentage: t1.percentage,
          due_date: t1.due_date ? t1.due_date.split('T')[0] : ''
        },
        {
          tranche_number: 2,
          tranche_name: t2.tranche_name || '2ème tranche (P2 - Semestre 1)',
          percentage: t2.percentage,
          due_date: t2.due_date ? t2.due_date.split('T')[0] : ''
        },
        {
          tranche_number: 3,
          tranche_name: t3.tranche_name || '3ème tranche (P3 - Solde Semestre 2)',
          percentage: t3.percentage,
          due_date: t3.due_date ? t3.due_date.split('T')[0] : ''
        }
      ]);
    } else {
      setThreeTranches([
        { tranche_number: 1, tranche_name: '1ère tranche (P1 - Rentrée / Inscription)', percentage: 40, due_date: '' },
        { tranche_number: 2, tranche_name: '2ème tranche (P2 - Semestre 1)', percentage: 30, due_date: '' },
        { tranche_number: 3, tranche_name: '3ème tranche (P3 - Solde Semestre 2)', percentage: 30, due_date: '' }
      ]);
    }
  }, [selectedTrancheLevel, selectedDomain, tranches]);

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
      
      if (loadedConfig.penalty_amount !== undefined) {
        setPenalties({
          amount: loadedConfig.penalty_amount ?? 5000,
          auto_apply: loadedConfig.penalty_auto_apply ?? true
        });
      }
      
      const academicYear = loadedConfig.current_academic_year || '2025-2026';
      
      const [feesRes, deadlinesRes, tranchesRes, filieresRes] = await Promise.all([
        academicFeeService.getFees(academicYear).catch(() => []),
        academicFeeService.getDeadlines(academicYear).catch(() => []),
        paymentTrancheService.getAll({ academic_year: academicYear }).catch(() => []),
        api.get('/api/v1/filieres/').then(r => r.data).catch(() => [])
      ]);
      
      const normalizedFees = Array.isArray(feesRes) ? feesRes : (feesRes?.data || []);
      const normalizedDeadlines = Array.isArray(deadlinesRes) ? deadlinesRes : (deadlinesRes?.data || []);
      const normalizedTranches = Array.isArray(tranchesRes) ? tranchesRes : [];
      const uniqueDomaines = Array.from(new Set((filieresRes || []).map((f: any) => f.domain).filter(Boolean))) as string[];
      
      setFees(normalizedFees);
      setDeadlines(normalizedDeadlines);
      setTranches(normalizedTranches);
      setDomaines(uniqueDomaines);
      
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
      await api.put('/api/v1/settings/academic/config', {
        ...config,
        penalty_amount: penalties.amount,
        penalty_auto_apply: penalties.auto_apply
      });
      
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

  const handleSavePenalties = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings/academic/config', {
        penalty_amount: penalties.amount,
        penalty_auto_apply: penalties.auto_apply
      });
      toast.success('✅ Pénalités de retard enregistrées avec succès !');
      await loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde des pénalités');
    } finally {
      setSaving(false);
    }
  };

  // ✅ Synchroniser les 3 pôles associés (Gestion, Communication, Informatique)
  const handleSyncAssociatedDomains = async () => {
    setSyncingDomains(true);
    try {
      const src = selectedDomain && ASSOCIATED_DOMAINS.includes(selectedDomain) ? selectedDomain : 'Gestion & Economie';
      const res = await academicFeeService.syncDomainGroup({
        source_domain: src,
        target_domains: ASSOCIATED_DOMAINS,
        academic_year: config.current_academic_year
      });
      toast.success(res.message || '✅ Les 3 pôles associés ont été synchronisés avec succès !');
      await loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la synchronisation des 3 pôles');
    } finally {
      setSyncingDomains(false);
    }
  };

  const handleSaveFee = async () => {
    if (!editingFee) return;
    try {
      const isAssociated = Boolean(selectedDomain && ASSOCIATED_DOMAINS.includes(selectedDomain));
      await academicFeeService.createOrUpdateFee({
        level: editingFee.level,
        domain: selectedDomain || null,
        payment_type: editingFee.type,
        amount: parseFloat(editingFee.amount),
        academic_year: config.current_academic_year,
        sync_associated_domains: isAssociated && autoSyncGroup
      });
      toast.success(
        isAssociated && autoSyncGroup
          ? `Tarif enregistré et synchronisé pour les 3 pôles associés !`
          : (selectedDomain ? `Tarif enregistré pour le pôle ${selectedDomain}` : 'Tarif standard global enregistré')
      );
      setEditingFee(null);
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde du tarif');
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

  // ✅ AUTO-CALCUL DYNAMIQUE DES 3 TRANCHES (GARANTIT STRICTEMENT 100% SANS DÉPASSEMENT)
  const handleUpdateTranche1 = (val: number) => {
    const raw = isNaN(val) ? 1 : val;
    // P1 plafonné entre 1% et 98%
    const p1 = Math.max(1, Math.min(98, Math.round(raw * 10) / 10));
    let p2 = threeTranches[1].percentage;
    if (p1 + p2 >= 99) {
      p2 = Math.max(1, Math.round((99 - p1) * 10) / 10);
    }
    const p3 = Math.max(1, Math.round((100 - p1 - p2) * 10) / 10);
    setThreeTranches(prev => [
      { ...prev[0], percentage: p1 },
      { ...prev[1], percentage: p2 },
      { ...prev[2], percentage: p3 }
    ]);
  };

  const handleUpdateTranche2 = (val: number) => {
    const raw = isNaN(val) ? 1 : val;
    const p1 = threeTranches[0].percentage;
    const maxP2 = Math.max(1, Math.round((99 - p1) * 10) / 10);
    const p2 = Math.max(1, Math.min(maxP2, Math.round(raw * 10) / 10));
    const p3 = Math.max(1, Math.round((100 - p1 - p2) * 10) / 10);
    setThreeTranches(prev => [
      prev[0],
      { ...prev[1], percentage: p2 },
      { ...prev[2], percentage: p3 }
    ]);
  };

  const handleUpdateTranche3 = (val: number) => {
    const raw = isNaN(val) ? 1 : val;
    const p1 = threeTranches[0].percentage;
    const maxP3 = Math.max(1, Math.round((99 - p1) * 10) / 10);
    const p3 = Math.max(1, Math.min(maxP3, Math.round(raw * 10) / 10));
    const p2 = Math.max(1, Math.round((100 - p1 - p3) * 10) / 10);
    setThreeTranches(prev => [
      prev[0],
      { ...prev[1], percentage: p2 },
      { ...prev[2], percentage: p3 }
    ]);
  };

  const applyTranchePreset = (p1: number, p2: number, p3: number) => {
    setThreeTranches(prev => [
      { ...prev[0], percentage: p1 },
      { ...prev[1], percentage: p2 },
      { ...prev[2], percentage: p3 }
    ]);
  };

  const handleUpdateTrancheName = (idx: 0 | 1 | 2, name: string) => {
    setThreeTranches(prev => {
      const copy = [...prev] as typeof prev;
      copy[idx] = { ...copy[idx], tranche_name: name };
      return copy;
    });
  };

  const handleUpdateTrancheDueDate = (idx: 0 | 1 | 2, date: string) => {
    setThreeTranches(prev => {
      const copy = [...prev] as typeof prev;
      copy[idx] = { ...copy[idx], due_date: date };
      return copy;
    });
  };

  // Sauvegarder les 3 tranches (100% atomique)
  const handleSaveThreeTranches = async () => {
    const totalAmount = getFeeAmount(selectedTrancheLevel, 'scolarite');
    if (!totalAmount || totalAmount <= 0) {
      toast.error(
        `⚠️ Veuillez d'abord configurer le montant de la Scolarité pour le niveau ${selectedTrancheLevel} ` +
        `dans le tableau des frais académiques ci-dessus, puis enregistrez avec le bouton 💾 (disquette).`
      );
      return;
    }

    const sumPct = Math.round((threeTranches[0].percentage + threeTranches[1].percentage + threeTranches[2].percentage) * 100) / 100;
    if (Math.abs(sumPct - 100) > 0.2) {
      toast.error(`Le total des pourcentages doit être exactement de 100% (actuel: ${sumPct}%).`);
      return;
    }

    const amt1 = Math.round((totalAmount * threeTranches[0].percentage) / 100);
    const amt2 = Math.round((totalAmount * threeTranches[1].percentage) / 100);
    const amt3 = Math.max(0, totalAmount - amt1 - amt2);

    const isAssociated = Boolean(selectedDomain && ASSOCIATED_DOMAINS.includes(selectedDomain));
    setSavingThreeTranches(true);
    try {
      await paymentTrancheService.configureThreeTranches({
        level: selectedTrancheLevel,
        domain: selectedDomain || null,
        payment_type: 'scolarite',
        academic_year: config.current_academic_year,
        sync_associated_domains: isAssociated && autoSyncGroup,
        tranches: [
          {
            tranche_number: 1,
            tranche_name: threeTranches[0].tranche_name || '1ère tranche (P1)',
            percentage: threeTranches[0].percentage,
            amount: amt1,
            due_date: threeTranches[0].due_date || null
          },
          {
            tranche_number: 2,
            tranche_name: threeTranches[1].tranche_name || '2ème tranche (P2)',
            percentage: threeTranches[1].percentage,
            amount: amt2,
            due_date: threeTranches[1].due_date || null
          },
          {
            tranche_number: 3,
            tranche_name: threeTranches[2].tranche_name || '3ème tranche (P3)',
            percentage: threeTranches[2].percentage,
            amount: amt3,
            due_date: threeTranches[2].due_date || null
          }
        ]
      });

      toast.success(
        isAssociated && autoSyncGroup
          ? `✅ 3 Tranches enregistrées et synchronisées pour les 3 pôles associés !`
          : `✅ Configuration des 3 tranches enregistrée pour ${selectedTrancheLevel} (Total 100% : ${totalAmount.toLocaleString('fr-FR')} FCFA)`
      );
      await loadAll();
    } catch (error: any) {
      console.error('❌ Erreur configuration 3 tranches:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la configuration des tranches');
    } finally {
      setSavingThreeTranches(false);
    }
  };

  // Réinitialiser les tranches d'un niveau
  const handleResetLevelTranches = async (level: string) => {
    const toDelete = tranches.filter(t => 
      t.level === level && 
      t.payment_type === 'scolarite' &&
      ((!selectedDomain && (!t.domain || t.domain === '')) || t.domain === selectedDomain)
    );

    if (toDelete.length === 0) return;

    const ok = await confirm({
      title: `Réinitialiser les tranches de ${level} ?`,
      message: `Voulez-vous supprimer la configuration des 3 tranches pour ${level} ?`,
      confirmText: 'Réinitialiser',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });

    if (ok) {
      try {
        await Promise.all(toDelete.map(t => paymentTrancheService.delete(t.id)));
        toast.success(`Tranches de ${level} réinitialisées`);
        await loadAll();
      } catch (error) {
        toast.error('Erreur lors de la suppression des tranches');
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
    if (selectedDomain) {
      const specificFee = fees.find(f => f.level === level && f.payment_type === type && f.domain === selectedDomain && f.academic_year === config.current_academic_year);
      if (specificFee) return specificFee.amount;
    }
    const globalFee = fees.find(f => f.level === level && f.payment_type === type && (!f.domain || f.domain === '') && f.academic_year === config.current_academic_year);
    return globalFee ? globalFee.amount : null;
  };

  const isFeeLocked = (level: string, type: string): boolean => {
    if (!fees || !Array.isArray(fees)) return false;
    if (selectedDomain) {
      const specificFee = fees.find(f => f.level === level && f.payment_type === type && f.domain === selectedDomain && f.academic_year === config.current_academic_year);
      if (specificFee) return specificFee.is_locked;
    }
    const globalFee = fees.find(f => f.level === level && f.payment_type === type && (!f.domain || f.domain === '') && f.academic_year === config.current_academic_year);
    return globalFee ? globalFee.is_locked : false;
  };

  const getScolariteFeeObj = (level: string): AcademicFee | undefined => {
    if (!fees || !Array.isArray(fees)) return undefined;
    if (selectedDomain) {
      const specificFee = fees.find(f => f.level === level && f.payment_type === 'scolarite' && f.domain === selectedDomain && f.academic_year === config.current_academic_year);
      if (specificFee) return specificFee;
    }
    return fees.find(f => f.level === level && f.payment_type === 'scolarite' && (!f.domain || f.domain === '') && f.academic_year === config.current_academic_year);
  };

  const [monthlyModal, setMonthlyModal] = useState<{
    level: string;
    amount: number;
    deposit: number;
    installment: number;
    monthsCount: number;
  } | null>(null);

  const openMonthlyModal = (level: string, feeObj?: AcademicFee) => {
    const amount = feeObj?.amount || getFeeAmount(level, 'scolarite') || 0;
    const defaultInstallment = feeObj?.monthly_installment != null ? feeObj.monthly_installment : 100000;
    const defaultMonths = feeObj?.monthly_months_count != null ? feeObj.monthly_months_count : 5;
    const defaultDeposit = feeObj?.monthly_deposit != null
      ? feeObj.monthly_deposit
      : Math.max(0, amount - (defaultMonths * defaultInstallment));

    setMonthlyModal({
      level,
      amount,
      deposit: defaultDeposit,
      installment: defaultInstallment,
      monthsCount: defaultMonths
    });
  };

  const handleSaveMonthlyConfig = async () => {
    if (!monthlyModal) return;
    const isAssociated = Boolean(selectedDomain && ASSOCIATED_DOMAINS.includes(selectedDomain));
    try {
      await academicFeeService.createOrUpdateFee({
        level: monthlyModal.level,
        domain: selectedDomain || null,
        payment_type: 'scolarite',
        amount: monthlyModal.amount,
        has_monthly_option: true,
        monthly_deposit: monthlyModal.deposit,
        monthly_installment: monthlyModal.installment,
        monthly_months_count: monthlyModal.monthsCount,
        academic_year: config.current_academic_year,
        sync_associated_domains: isAssociated && autoSyncGroup
      });
      toast.success(
        isAssociated && autoSyncGroup
          ? `✅ Modalité mensuelle enregistrée et synchronisée pour les 3 pôles associés !`
          : `Modalité mensuelle enregistrée pour ${monthlyModal.level}`
      );
      setMonthlyModal(null);
      await loadAll();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
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

  // ✅ Calculs en temps réel pour l'éditeur des 3 tranches (P1, P2, P3)
  const currentScolariteFee = getFeeAmount(selectedTrancheLevel, 'scolarite') || 0;
  const currentAmountT1 = Math.round((currentScolariteFee * threeTranches[0].percentage) / 100);
  const currentAmountT2 = Math.round((currentScolariteFee * threeTranches[1].percentage) / 100);
  const currentAmountT3 = Math.max(0, currentScolariteFee - currentAmountT1 - currentAmountT2);
  const currentTotalPercentage = Math.round((threeTranches[0].percentage + threeTranches[1].percentage + threeTranches[2].percentage) * 10) / 10;

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
                    <h2 className="text-lg font-bold text-slate-900">Grille tarifaire annuelle</h2>
                    <p className="text-sm text-slate-500">Configurez les frais par niveau et pôle d'études</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      🏫 Pôle / Domaine universitaire :
                    </label>
                    <p className="text-xs text-slate-500">
                      Configurez un tarif sur-mesure pour chaque domaine (ex: Gestion vs Technologies).
                    </p>
                  </div>
                  <select
                    value={selectedDomain}
                    onChange={(e) => {
                      setSelectedDomain(e.target.value);
                      setEditingFee(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">Tous les domaines (Tarif Standard Global)</option>
                    {domaines.map(d => (
                      <option key={d} value={d}>Pôle / Domaine : {d}</option>
                    ))}
                  </select>
                </div>

                {selectedDomain && ASSOCIATED_DOMAINS.includes(selectedDomain) && (
                  <div className="mb-6 p-4 bg-orange-50/70 border border-orange-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Share2 className="text-[#FF6B00]" size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00]">Pôle Associé Synchronisé</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B00] font-semibold">Grille Commune</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Ce pôle est synchronisé avec : <strong>Gestion & Économie</strong>, <strong>Communication & Médias</strong> et <strong>Informatique & Technologies</strong>.
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoSyncGroup}
                            onChange={(e) => setAutoSyncGroup(e.target.checked)}
                            className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] h-4 w-4"
                          />
                          <span className="text-xs font-medium text-slate-700">
                            Auto-propager les modifications de tarifs et tranches aux 3 pôles associés
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleSyncAssociatedDomains}
                        disabled={syncingDomains}
                        className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                      >
                        <RefreshCw size={14} className={syncingDomains ? 'animate-spin' : ''} />
                        {syncingDomains ? 'Synchronisation...' : 'Synchroniser les 3 pôles'}
                      </button>
                    </div>
                  </div>
                )}
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
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                          Modalité Mensuelle (Échelonnement)
                        </th>
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
                          {/* Colonne Modalité Mensuelle */}
                          {(() => {
                            const scolariteFee = getScolariteFeeObj(level);
                            const amount = scolariteFee?.amount || getFeeAmount(level, 'scolarite') || 0;
                            const inst = scolariteFee?.monthly_installment != null ? scolariteFee.monthly_installment : 100000;
                            const months = scolariteFee?.monthly_months_count != null ? scolariteFee.monthly_months_count : 5;
                            const deposit = scolariteFee?.monthly_deposit != null
                              ? scolariteFee.monthly_deposit
                              : Math.max(0, amount - (months * inst));

                            return (
                              <td className="py-4 px-4 text-center">
                                {amount > 0 ? (
                                  <div className="flex flex-col items-center justify-center gap-1.5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <Calendar size={13} className="text-emerald-600" />
                                      {deposit.toLocaleString('fr-FR')} F à l'inscription, puis {inst.toLocaleString('fr-FR')} F × {months} mois
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openMonthlyModal(level, scolariteFee)}
                                      className="text-[11px] font-semibold text-[#FF6B00] hover:text-[#e55f00] hover:underline"
                                    >
                                      Ajuster la formule
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Saisir la scolarité d'abord</span>
                                )}
                              </td>
                            );
                          })()}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">Option de Paiement Mensuel (Modalité Mensuelle)</h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      Conformément aux pratiques des universités et instituts supérieurs, UniSphere permet d'offrir le paiement mensuel échelonné :
                      un <strong>acompte initial à l'inscription</strong>, suivi de <strong>mensualités fixes</strong> (ex: 100 000 FCFA pendant 5 mois).
                      Le système calcule et synchronise automatiquement l'échéancier des étudiants ayant choisi cette formule sans perturber la comptabilité générale.
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuration Stricte des 3 Tranches de Paiement (P1, P2, P3 = 100%) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <Layers className="text-white" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">Tranches de Paiement Académiques</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Strictement 3 tranches (P1, P2, P3)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configuration officielle des 3 échéances annuelles. Les pourcentages s'équilibrent automatiquement pour garantir exactement 100%.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Total Verrouillé : 100.0%
                    </span>
                  </div>
                </div>

                {/* Sélecteur de Niveau */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sélectionner un niveau :</span>
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                      {levels.map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedTrancheLevel(lvl)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            selectedTrancheLevel === lvl
                              ? 'bg-[#FF6B00] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Scolarité de référence ({selectedTrancheLevel}{selectedDomain ? ` - ${selectedDomain}` : ' - Tous pôles'}) :
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {currentScolariteFee > 0 ? (
                          `${currentScolariteFee.toLocaleString('fr-FR')} FCFA`
                        ) : (
                          <span className="text-amber-600 text-xs font-semibold">Non configuré (0 FCFA)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {currentScolariteFee <= 0 && (
                  <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <span>
                      <strong>Attention :</strong> Le tarif de scolarité pour <strong>{selectedTrancheLevel}</strong> est actuellement à 0 FCFA.
                      Veuillez renseigner le tarif dans le tableau des frais académiques ci-dessus et cliquer sur 💾 pour que les montants des 3 tranches soient calculés en temps réel.
                    </span>
                  </div>
                )}

                {/* Boutons de Pré-configurations Rapides */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#FF6B00]" />
                      Répartitions Types Recommandées (100%) :
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => applyTranchePreset(40, 30, 30)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        threeTranches[0].percentage === 40 && threeTranches[1].percentage === 30 && threeTranches[2].percentage === 30
                          ? 'border-[#FF6B00] bg-orange-50/70 text-slate-900 ring-2 ring-[#FF6B00]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">Standard Académique</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">40% / 30% / 30%</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyTranchePreset(50, 25, 25)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        threeTranches[0].percentage === 50 && threeTranches[1].percentage === 25 && threeTranches[2].percentage === 25
                          ? 'border-[#FF6B00] bg-orange-50/70 text-slate-900 ring-2 ring-[#FF6B00]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">Acompte Majoré</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">50% / 25% / 25%</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyTranchePreset(33.34, 33.33, 33.33)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        threeTranches[0].percentage === 33.34 && threeTranches[1].percentage === 33.33 && threeTranches[2].percentage === 33.33
                          ? 'border-[#FF6B00] bg-orange-50/70 text-slate-900 ring-2 ring-[#FF6B00]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">3 Tranches Égales</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">33.3% / 33.3% / 33.3%</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyTranchePreset(35, 35, 30)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        threeTranches[0].percentage === 35 && threeTranches[1].percentage === 35 && threeTranches[2].percentage === 30
                          ? 'border-[#FF6B00] bg-orange-50/70 text-slate-900 ring-2 ring-[#FF6B00]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">Équilibré Semestriel</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">35% / 35% / 30%</p>
                    </button>
                  </div>
                </div>

                {/* Barre Visuelle Interactive de Répartition (100% garanti) */}
                <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700">Jauge de Répartition de la Scolarité (100%)</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {currentTotalPercentage.toFixed(1)}% / 100%
                    </span>
                  </div>
                  <div className="h-6 w-full bg-slate-200 rounded-lg overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${threeTranches[0].percentage}%` }}
                      className="bg-blue-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300 px-1 truncate"
                      title={`P1 : ${threeTranches[0].percentage}%`}
                    >
                      P1 : {threeTranches[0].percentage}%
                    </div>
                    <div
                      style={{ width: `${threeTranches[1].percentage}%` }}
                      className="bg-indigo-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300 px-1 truncate border-l border-white/20"
                      title={`P2 : ${threeTranches[1].percentage}%`}
                    >
                      P2 : {threeTranches[1].percentage}%
                    </div>
                    <div
                      style={{ width: `${threeTranches[2].percentage}%` }}
                      className="bg-emerald-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300 px-1 truncate border-l border-white/20"
                      title={`P3 : ${threeTranches[2].percentage}%`}
                    >
                      P3 : {threeTranches[2].percentage}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                    <span className="flex items-center gap-1 font-medium text-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                      P1 : {currentAmountT1.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="flex items-center gap-1 font-medium text-indigo-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                      P2 : {currentAmountT2.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                      P3 : {currentAmountT3.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {/* Formulaire des 3 Tranches (P1, P2, P3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Tranche 1 */}
                  <div className="p-4 bg-gradient-to-b from-blue-50/40 to-white border-2 border-blue-200 rounded-xl shadow-sm hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
                        <GraduationCap size={14} />
                        Tranche 1 (P1)
                      </span>
                      <span className="text-xs font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {threeTranches[0].percentage}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom de la tranche :</label>
                        <input
                          type="text"
                          value={threeTranches[0].tranche_name}
                          onChange={(e) => handleUpdateTrancheName(0, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Pourcentage (%) :</span>
                          <span className="text-blue-600 font-mono font-bold">{threeTranches[0].percentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="80"
                          step="1"
                          value={threeTranches[0].percentage}
                          onChange={(e) => handleUpdateTranche1(parseFloat(e.target.value) || 0)}
                          className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="number"
                            min="1"
                            max="98"
                            step="0.1"
                            value={threeTranches[0].percentage}
                            onChange={(e) => handleUpdateTranche1(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-500">% de la scolarité</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                        <p className="text-[10px] text-blue-700 font-medium">Montant calculé :</p>
                        <p className="text-sm font-black text-blue-950 font-mono">
                          {currentAmountT1.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date limite (Échéance) :</label>
                        <input
                          type="date"
                          value={threeTranches[0].due_date}
                          onChange={(e) => handleUpdateTrancheDueDate(0, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tranche 2 */}
                  <div className="p-4 bg-gradient-to-b from-indigo-50/40 to-white border-2 border-indigo-200 rounded-xl shadow-sm hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800">
                        <BookOpen size={14} />
                        Tranche 2 (P2)
                      </span>
                      <span className="text-xs font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {threeTranches[1].percentage}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom de la tranche :</label>
                        <input
                          type="text"
                          value={threeTranches[1].tranche_name}
                          onChange={(e) => handleUpdateTrancheName(1, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Pourcentage (%) :</span>
                          <span className="text-indigo-600 font-mono font-bold">{threeTranches[1].percentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max={Math.max(5, Math.floor(99 - threeTranches[0].percentage))}
                          step="1"
                          value={threeTranches[1].percentage}
                          onChange={(e) => handleUpdateTranche2(parseFloat(e.target.value) || 0)}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, 99 - threeTranches[0].percentage)}
                            step="0.1"
                            value={threeTranches[1].percentage}
                            onChange={(e) => handleUpdateTranche2(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-500">% (P3 ajuste auto)</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                        <p className="text-[10px] text-indigo-700 font-medium">Montant calculé :</p>
                        <p className="text-sm font-black text-indigo-950 font-mono">
                          {currentAmountT2.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date limite (Échéance) :</label>
                        <input
                          type="date"
                          value={threeTranches[1].due_date}
                          onChange={(e) => handleUpdateTrancheDueDate(1, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tranche 3 */}
                  <div className="p-4 bg-gradient-to-b from-emerald-50/40 to-white border-2 border-emerald-200 rounded-xl shadow-sm hover:border-emerald-300 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle size={14} />
                        Tranche 3 (P3 - Solde)
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {threeTranches[2].percentage}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom de la tranche :</label>
                        <input
                          type="text"
                          value={threeTranches[2].tranche_name}
                          onChange={(e) => handleUpdateTrancheName(2, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Pourcentage (%) :</span>
                          <span className="text-emerald-600 font-mono font-bold">{threeTranches[2].percentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max={Math.max(5, Math.floor(99 - threeTranches[0].percentage))}
                          step="1"
                          value={threeTranches[2].percentage}
                          onChange={(e) => handleUpdateTranche3(parseFloat(e.target.value) || 0)}
                          className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, 99 - threeTranches[0].percentage)}
                            step="0.1"
                            value={threeTranches[2].percentage}
                            onChange={(e) => handleUpdateTranche3(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-slate-500">% (Solde automatique)</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                        <p className="text-[10px] text-emerald-700 font-medium">Montant calculé (Reliquat) :</p>
                        <p className="text-sm font-black text-emerald-950 font-mono">
                          {currentAmountT3.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date limite (Échéance) :</label>
                        <input
                          type="date"
                          value={threeTranches[2].due_date}
                          onChange={(e) => handleUpdateTrancheDueDate(2, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton d'Enregistrement Atomique */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-8">
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">
                      Vérification mathématique : P1 ({threeTranches[0].percentage}%) + P2 ({threeTranches[1].percentage}%) + P3 ({threeTranches[2].percentage}%) = <span className="text-emerald-700 font-bold">100.0%</span>
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Total financier : {currentScolariteFee.toLocaleString('fr-FR')} FCFA (100% de la scolarité de {selectedTrancheLevel})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {tranches.some(t => t.level === selectedTrancheLevel && t.payment_type === 'scolarite') && (
                      <button
                        type="button"
                        onClick={() => handleResetLevelTranches(selectedTrancheLevel)}
                        className="px-3.5 py-2.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Trash2 size={14} />
                        Réinitialiser {selectedTrancheLevel}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveThreeTranches}
                      disabled={savingThreeTranches || currentScolariteFee <= 0}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      {savingThreeTranches ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Enregistrement des 3 tranches...
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          Enregistrer les 3 tranches ({selectedTrancheLevel} - 100%)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Synthèse Récapitulative de Tous les Niveaux */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span>État de Configuration des 3 Tranches (Tous Niveaux)</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Niveau</th>
                          <th className="py-3 px-4">Scolarité</th>
                          <th className="py-3 px-4 text-blue-700">Tranche 1 (P1)</th>
                          <th className="py-3 px-4 text-indigo-700">Tranche 2 (P2)</th>
                          <th className="py-3 px-4 text-emerald-700">Tranche 3 (P3)</th>
                          <th className="py-3 px-4 text-center">Statut</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {levels.map((lvl) => {
                          const lvlFee = getFeeAmount(lvl, 'scolarite') || 0;
                          const lvlTranches = tranches.filter(t =>
                            t.level === lvl &&
                            t.payment_type === 'scolarite' &&
                            ((!selectedDomain && (!t.domain || t.domain === '')) || t.domain === selectedDomain)
                          );

                          const t1 = lvlTranches.find(t => t.tranche_number === 1);
                          const t2 = lvlTranches.find(t => t.tranche_number === 2);
                          const t3 = lvlTranches.find(t => t.tranche_number === 3);
                          const isConfigured = Boolean(t1 && t2 && t3);

                          return (
                            <tr
                              key={lvl}
                              className={`hover:bg-slate-50 transition-colors ${
                                selectedTrancheLevel === lvl ? 'bg-orange-50/30' : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#FF6B00]"></span>
                                  {lvl}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800 font-mono">
                                {lvlFee > 0 ? `${lvlFee.toLocaleString('fr-FR')} FCFA` : <span className="text-slate-400 italic">0 F</span>}
                              </td>
                              <td className="py-3 px-4">
                                {t1 ? (
                                  <div>
                                    <span className="font-bold text-blue-800">{t1.percentage}%</span>
                                    <span className="text-[11px] text-slate-500 font-mono ml-1.5">({t1.amount.toLocaleString('fr-FR')} F)</span>
                                    {t1.due_date && (
                                      <p className="text-[10px] text-slate-400">Échéance : {new Date(t1.due_date).toLocaleDateString('fr-FR')}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Non défini</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {t2 ? (
                                  <div>
                                    <span className="font-bold text-indigo-800">{t2.percentage}%</span>
                                    <span className="text-[11px] text-slate-500 font-mono ml-1.5">({t2.amount.toLocaleString('fr-FR')} F)</span>
                                    {t2.due_date && (
                                      <p className="text-[10px] text-slate-400">Échéance : {new Date(t2.due_date).toLocaleDateString('fr-FR')}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Non défini</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {t3 ? (
                                  <div>
                                    <span className="font-bold text-emerald-800">{t3.percentage}%</span>
                                    <span className="text-[11px] text-slate-500 font-mono ml-1.5">({t3.amount.toLocaleString('fr-FR')} F)</span>
                                    {t3.due_date && (
                                      <p className="text-[10px] text-slate-400">Échéance : {new Date(t3.due_date).toLocaleDateString('fr-FR')}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Non défini</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isConfigured ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                                    <Check size={12} />
                                    100% Configuré
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    En attente
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTrancheLevel(lvl)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                    selectedTrancheLevel === lvl
                                      ? 'bg-orange-100 text-[#FF6B00] border border-orange-200'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {selectedTrancheLevel === lvl ? 'En cours d\'édition' : 'Configurer'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSavePenalties}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? 'Enregistrement...' : 'Enregistrer les pénalités'}
                  </button>
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
                        <p className="font-semibold text-slate-900">Compensation entre modules</p>
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

      {/* Modal Configuration Modalité Mensuelle */}
      {monthlyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Modalité Mensuelle — {monthlyModal.level}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedDomain ? `Pôle : ${selectedDomain}` : 'Tarif standard global'} • Scolarité : {monthlyModal.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMonthlyModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Configurez l'acompte initial exigé à l'inscription et la mensualité à payer chaque mois (acompte d'inscription + mensualités régulières étalées sur l'année).
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Acompte à l'inscription (FCFA)
                </label>
                <input
                  type="number"
                  value={monthlyModal.deposit}
                  onChange={(e) => setMonthlyModal({ ...monthlyModal, deposit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  placeholder="Ex: 350000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Montant Mensualité (FCFA)
                  </label>
                  <input
                    type="number"
                    value={monthlyModal.installment}
                    onChange={(e) => setMonthlyModal({ ...monthlyModal, installment: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                    placeholder="Ex: 100000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre de mois
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={monthlyModal.monthsCount}
                    onChange={(e) => setMonthlyModal({ ...monthlyModal, monthsCount: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const inst = 100000;
                    const months = 5;
                    const dep = Math.max(0, monthlyModal.amount - (inst * months));
                    setMonthlyModal({ ...monthlyModal, deposit: dep, installment: inst, monthsCount: months });
                  }}
                  className="text-xs text-[#FF6B00] hover:text-[#e55f00] font-semibold underline"
                >
                  ⚡ Appliquer formule standard (5 × 100 000 F)
                </button>
              </div>

              {/* Bilan du calcul */}
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                (monthlyModal.deposit + (monthlyModal.installment * monthlyModal.monthsCount)) === monthlyModal.amount
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span>Total échelonné :</span>
                  <span className="font-bold">
                    {(monthlyModal.deposit + (monthlyModal.installment * monthlyModal.monthsCount)).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] opacity-80 mt-0.5">
                  <span>Scolarité de référence :</span>
                  <span>{monthlyModal.amount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMonthlyModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveMonthlyConfig}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Save size={14} />
                Enregistrer la formule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}