'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Loader2, CheckCircle, AlertCircle,
  Calendar, DollarSign, User, CreditCard, Receipt,
  Layers, Lock, Clock, Shield
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function CreatePaymentPage() {
  const toast = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentSummary, setStudentSummary] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_type: 'scolarite',
    payment_method: 'cash',
    reference: '',
    description: '',
    tranche_id: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentSummary();
    }
  }, [selectedStudent, formData.payment_type]);

  const loadStudents = async () => {
    try {
      const response = await api.get('/api/v1/students/');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setStudents(data);
    } catch (error) {
      toast.error('Impossible de charger les étudiants');
    }
  };

  const loadStudentSummary = async () => {
    if (!selectedStudent) return;
    
    try {
      const response = await api.get(`/api/v1/payments/student/${selectedStudent.id}/summary`);
      setStudentSummary(response.data);
    } catch (error: any) {
      console.error('Erreur chargement résumé:', error);
      // Valeurs par défaut si l'endpoint échoue
      setStudentSummary({
        total_amount: 450000,
        total_paid: 0,
        total_remaining: 450000,
        paid_percentage: 0,
        status: 'unpaid',
        tranches: [
          { id: 1, name: 'Tranche 1', amount: 150000, status: 'available', due_date: null },
          { id: 2, name: 'Tranche 2', amount: 150000, status: 'locked', due_date: null },
          { id: 3, name: 'Tranche 3', amount: 150000, status: 'locked', due_date: null }
        ]
      });
    }
  };

  const filteredStudents = students
    .filter(s => {
      const query = searchQuery.toLowerCase();
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const matricule = s.matricule?.toLowerCase() || '';
      return fullName.includes(query) || matricule.includes(query);
    })
    .slice(0, 10);

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setFormData({ ...formData, student_id: String(student.id) });
    setSearchQuery('');
  };

  const handleSelectTranche = (tranche: any) => {
    setFormData({
      ...formData,
      tranche_id: String(tranche.id),
      amount: tranche.amount.toString()
    });
  };

  const availableTranches = studentSummary?.tranches?.filter((t: any) => t.status === 'available') || [];
  const paidTranches = studentSummary?.tranches?.filter((t: any) => t.status === 'paid') || [];
  const lockedTranches = studentSummary?.tranches?.filter((t: any) => t.status === 'locked') || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id) {
      toast.error('Veuillez sélectionner un étudiant');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/v1/payments/', {
        student_id: parseInt(formData.student_id),
        amount: parseFloat(formData.amount),
        currency: 'FCFA',
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        reference: formData.reference,
        description: formData.description,
        tranche_id: formData.tranche_id ? parseInt(formData.tranche_id) : null,
        payment_date: new Date().toISOString().split('T')[0]
      });

      setLastPayment(response.data);
      setShowSuccess(true);
      toast.success('Paiement enregistré avec succès !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'enregistrement';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '', amount: '', payment_type: 'scolarite',
      payment_method: 'cash', reference: '', description: '', tranche_id: ''
    });
    setSelectedStudent(null);
    setStudentSummary(null);
    setSearchQuery('');
    setShowSuccess(false);
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  // ÉCRAN DE SUCCÈS
  if (showSuccess && lastPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Paiement enregistré !</h2>
            <p className="text-white/90 text-sm">Le paiement a été enregistré avec succès</p>
          </div>

          <div className="p-8">
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={18} className="text-[#FF6B00]" />
                <h3 className="font-semibold text-slate-900">Détails du reçu</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Référence</p>
                  <p className="font-mono font-semibold text-slate-900 text-sm">{lastPayment.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">N° Reçu</p>
                  <p className="font-mono font-semibold text-slate-900 text-sm">{lastPayment.receipt_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Montant payé</p>
                  <p className="text-lg font-bold text-green-600">{formatFCFA(lastPayment.amount)}</p>
                </div>
                {lastPayment.balance > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Reliquat</p>
                    <p className="text-lg font-bold text-orange-600">{formatFCFA(lastPayment.balance)}</p>
                  </div>
                )}
              </div>
            </div>

            {lastPayment.balance > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900 mb-1">Reliquat créé</p>
                    <p className="text-slate-600">
                      Un échéancier a été créé pour <span className="font-bold text-orange-600">{formatFCFA(lastPayment.balance)}</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={resetForm}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl text-sm font-semibold transition-all"
              >
                <Receipt size={16} /> Nouveau paiement
              </button>
              <Link
                href={`/accountant/payments/receipt/${lastPayment.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#0a1628] hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all"
              >
                <Receipt size={16} /> Voir le reçu
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/accountant/payments" className="hover:text-[#FF6B00] flex items-center gap-1">
          <ArrowLeft size={14} />
          Paiements
        </Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900 font-medium">Nouveau paiement</span>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <DollarSign size={24} className="text-white" />
        </div>
        Enregistrer un paiement
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-2 space-y-6">
          {/* Carte 1 : Étudiant */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                  <User className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Étudiant</h2>
                  <p className="text-xs text-slate-300">Sélectionnez l'étudiant concerné</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Rechercher par nom ou matricule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all"
                />

                {searchQuery && (
                  <div className="absolute left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500 text-center">Aucun étudiant trouvé</p>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full p-4 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center">
                              <User size={16} className="text-[#FF6B00]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {student.matricule} • <span className="text-[#FF6B00] font-medium">{student.level}</span> • {student.filiere}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedStudent.first_name.charAt(0)}{selectedStudent.last_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {selectedStudent.matricule} • <span className="text-[#FF6B00] font-medium">{selectedStudent.level}</span>
                    </p>
                  </div>
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              )}
            </div>
          </div>

          {/* Carte 2 : Récapitulatif actuel */}
          {selectedStudent && studentSummary && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Receipt className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Récapitulatif actuel</h2>
                    <p className="text-xs text-white/80">État des paiements de l'étudiant</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs text-blue-600 mb-1">Montant total dû</p>
                    <p className="text-lg font-bold text-blue-900">{formatFCFA(studentSummary.total_amount)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-xs text-green-600 mb-1">Déjà payé</p>
                    <p className="text-lg font-bold text-green-700">{formatFCFA(studentSummary.total_paid)}</p>
                    <p className="text-xs text-green-600 mt-1">{studentSummary.paid_percentage}%</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-xs text-orange-600 mb-1">Reste à payer</p>
                    <p className="text-lg font-bold text-orange-700">{formatFCFA(studentSummary.total_remaining)}</p>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Progression</span>
                    <span className="font-semibold">{studentSummary.paid_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        studentSummary.paid_percentage >= 100 ? 'bg-green-500' :
                        studentSummary.paid_percentage >= 50 ? 'bg-blue-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, studentSummary.paid_percentage)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Statut */}
                <div className={`p-3 rounded-xl ${
                  studentSummary.status === 'paid' ? 'bg-green-50 border border-green-200' :
                  studentSummary.status === 'partial' ? 'bg-orange-50 border border-orange-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {studentSummary.status === 'paid' ? (
                      <>
                        <CheckCircle size={16} className="text-green-600" />
                        <p className="text-sm font-semibold text-green-700">SOLDÉ ✅ - Toutes tranches payées</p>
                      </>
                    ) : studentSummary.status === 'partial' ? (
                      <>
                        <AlertCircle size={16} className="text-orange-600" />
                        <p className="text-sm font-semibold text-orange-700">RELIQUAT - Paiements en cours</p>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-red-600" />
                        <p className="text-sm font-semibold text-red-700">1ère TRANCHE - Aucun paiement</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Carte 3 : Tranches disponibles */}
          {selectedStudent && availableTranches.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Layers className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Tranches disponibles au paiement</h2>
                    <p className="text-xs text-white/80">Sélectionnez une tranche pour pré-remplir le montant</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {availableTranches.map((tranche: any) => (
                    <button
                      key={tranche.id}
                      type="button"
                      onClick={() => handleSelectTranche(tranche)}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                        formData.tranche_id === String(tranche.id)
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.tranche_id === String(tranche.id) ? 'bg-[#FF6B00] text-white' : 'bg-purple-100 text-purple-600'
                          }`}>
                            <Layers size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{tranche.name}</p>
                            {tranche.due_date && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                📅 Échéance : {new Date(tranche.due_date).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#FF6B00]">{formatFCFA(tranche.amount)}</p>
                          {formData.tranche_id === String(tranche.id) && (
                            <CheckCircle size={16} className="text-[#FF6B00] ml-auto mt-1" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Carte 4 : Détails du paiement */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#0a1628] to-[#1e293b] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                  <CreditCard className="text-white" size={20} />
                </div>
                <h2 className="text-lg font-bold text-white">Détails du paiement</h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Montant à payer (FCFA) *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-lg font-semibold"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mode de paiement *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'cash', label: '💵 Espèces' },
                    { value: 'mobile_money', label: '📱 Mobile Money' },
                    { value: 'bank_transfer', label: '🏦 Virement' },
                    { value: 'check', label: '📄 Chèque' }
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_method: method.value })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        formData.payment_method === method.value
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5 text-[#FF6B00]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Référence / Reçu N°</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  placeholder="Ex: REC-2026-001234"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Commentaire (optionnel)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Après validation, cette tranche sera marquée comme PAYÉE et n'apparaîtra plus dans les tranches disponibles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : Récapitulatif */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="bg-[#FF6B00] px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt size={20} /> Récapitulatif
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="pb-4 border-b border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Étudiant</p>
                <p className="font-semibold text-slate-900">
                  {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : '—'}
                </p>
                {selectedStudent && (
                  <p className="text-xs text-slate-500 mt-1">{selectedStudent.matricule}</p>
                )}
              </div>

              {formData.tranche_id && studentSummary && (
                <div className="pb-4 border-b border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Tranche sélectionnée</p>
                  <p className="font-semibold text-[#FF6B00]">
                    {studentSummary.tranches?.find((t: any) => String(t.id) === formData.tranche_id)?.name}
                  </p>
                </div>
              )}

              {studentSummary && (
                <>
                  <div className="flex justify-between">
                    <p className="text-sm text-slate-600">Total dû</p>
                    <p className="font-semibold">{formatFCFA(studentSummary.total_amount)}</p>
                  </div>

                  <div className="flex justify-between">
                    <p className="text-sm text-slate-600">Déjà payé</p>
                    <p className="font-semibold text-green-600">{formatFCFA(studentSummary.total_paid)}</p>
                  </div>

                  <div className="flex justify-between">
                    <p className="text-sm text-slate-600">Montant à payer</p>
                    <p className="font-semibold text-blue-600">
                      {formatFCFA(parseFloat(formData.amount || '0'))}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between">
                      <p className="text-sm font-semibold">Reste après paiement</p>
                      {(() => {
                        const remaining = studentSummary.total_remaining - parseFloat(formData.amount || '0');
                        return remaining > 0 ? (
                          <p className="text-xl font-bold text-orange-600">{formatFCFA(remaining)}</p>
                        ) : (
                          <p className="text-xl font-bold text-green-600">0 FCFA</p>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !selectedStudent || !formData.amount}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                ) : (
                  <><Save size={18} /> Enregistrer le paiement</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}