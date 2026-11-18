'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Save, Check, UserPlus, ArrowLeft, Globe, Layers } from 'lucide-react';
import Link from 'next/link';
import { teacherService } from '@/services/teacherService';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { toast } from 'react-hot-toast';

export default function CreateTeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [filieres, setFilieres] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    speciality: '',
    scope: 'ALL', // 'ALL' | 'CUSTOM'
    selected_filieres: [] as number[],
  });

  const defaultDepartments = [
    'Sciences & Technologies',
    'Sciences Économiques & Gestion',
    'Droit & Sciences Politiques',
    'Lettres, Langues & Sciences Humaines',
    'Médecine & Sciences de la Santé',
    'Sciences de l\'Ingénieur'
  ];

  useEffect(() => {
    const loadFilieres = async () => {
      try {
        const data = await filiereService.getAll();
        setFilieres(data || []);
      } catch (error) {
        console.error('Erreur chargement filières:', error);
      }
    };
    loadFilieres();
  }, []);

  // Domaines uniques disponibles depuis les filières créées
  const existingDomains = [...new Set(filieres.map(f => f.domain))].filter(Boolean);
  const availableDepartments = Array.from(new Set([...defaultDepartments, ...existingDomains])).sort();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 8 Mo');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const toggleFiliereSelection = (filiereId: number) => {
    setFormData(prev => {
      const exists = prev.selected_filieres.includes(filiereId);
      return {
        ...prev,
        selected_filieres: exists
          ? prev.selected_filieres.filter(id => id !== filiereId)
          : [...prev.selected_filieres, filiereId]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      toast.error('Veuillez renseigner le nom, prénom et email');
      return;
    }
    if (!formData.speciality.trim()) {
      toast.error('Veuillez renseigner la spécialité de l\'enseignant');
      return;
    }

    setLoading(true);
  
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name.trim());
      formDataToSend.append('last_name', formData.last_name.trim());
      formDataToSend.append('email', formData.email.trim().toLowerCase());
      formDataToSend.append('department', formData.department || 'Enseignement Général');
      formDataToSend.append('speciality', formData.speciality.trim());
      
      const filieresInterventions = formData.scope === 'ALL'
        ? 'ALL'
        : formData.selected_filieres.join(',');
      formDataToSend.append('filieres_interventions', filieresInterventions);

      if (formData.scope === 'CUSTOM' && formData.selected_filieres.length > 0) {
        formDataToSend.append('filiere_id', formData.selected_filieres[0].toString());
      }
      
      if (formData.phone && formData.phone.trim() !== '') {
        formDataToSend.append('phone', formData.phone.trim());
      }
      
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }
  
      const response = await teacherService.create(formDataToSend);
      
      if (response.temp_password) {
        toast.success(
          `Enseignant créé ! Mot de passe : ${response.temp_password}`,
          { duration: 8000 }
        );
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(response.temp_password);
            toast.success('Mot de passe copié dans le presse-papier !');
          }
        } catch {}
      } else {
        toast.success(response.message || 'Enseignant rattaché avec succès !');
      }
      
      router.push('/admin/teachers');
      
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/teachers"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="text-[#FF6B00]" size={22} />
              Nouvel Enseignant
            </h1>
            <p className="text-xs text-slate-500">Ajout d'un enseignant avec affectation transversale ou multi-filières</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* État civil & contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Prénom *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
              placeholder="Ex: Amadou, Fanta..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nom de Famille *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
              placeholder="Ex: Coulibaly, Traoré..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Académique / Professionnel *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="enseignant@univ.edu"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Numéro de Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+223 70 00 00 00"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
            />
          </div>
        </div>

        {/* Profil Académique : Département & Spécialité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Département / Faculté de Rattachement *
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white text-sm"
            >
              <option value="">Sélectionner un département...</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Spécialité / Discipline d'Enseignement *
            </label>
            <input
              type="text"
              value={formData.speciality}
              onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
              placeholder="Ex: Algorithmique, Droit Civil, Macroéconomie, Mathématiques..."
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
            />
          </div>
        </div>

        {/* Périmètre d'Intervention Académique (Boutons) */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Périmètre d'Intervention de l'Enseignant *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, scope: 'ALL' }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                formData.scope === 'ALL'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe size={16} />
                <div>
                  <div className="font-bold text-xs">🌐 Transversal (Toutes les filières)</div>
                  <div className="text-[11px] font-normal text-slate-500">Peut dispenser des cours dans n'importe quelle filière</div>
                </div>
              </div>
              {formData.scope === 'ALL' && <Check size={16} />}
            </button>

            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, scope: 'CUSTOM' }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                formData.scope === 'CUSTOM'
                  ? 'border-[#FF6B00] bg-orange-50/50 text-[#FF6B00]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers size={16} />
                <div>
                  <div className="font-bold text-xs">🎯 Filières Spécifiques</div>
                  <div className="text-[11px] font-normal text-slate-500">Affecté à une ou plusieurs filières choisies</div>
                </div>
              </div>
              {formData.scope === 'CUSTOM' && <Check size={16} />}
            </button>
          </div>

          {/* Sélection personnalisée si CUSTOM */}
          {formData.scope === 'CUSTOM' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                Sélectionnez les filières d'intervention ({formData.selected_filieres.length} sélectionnée(s)) :
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {filieres.map(f => {
                  const isChecked = formData.selected_filieres.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFiliereSelection(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-[#FF6B00] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isChecked && <Check size={12} />}
                      <span>{f.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Photo de Profil (Optionnelle)
          </label>
          
          {photoPreview ? (
            <div className="relative inline-block">
              <img 
                src={photoPreview} 
                alt="Preview" 
                className="w-28 h-28 rounded-xl object-cover border-2 border-slate-200"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-200 hover:border-[#FF6B00] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors max-w-sm">
              <Upload className="text-slate-400 mb-1" size={24} />
              <span className="text-xs font-semibold text-slate-700">Sélectionner une photo</span>
              <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG ou WEBP (max 8 Mo)</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="hidden" 
              />
            </label>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} /> {loading ? 'Création en cours...' : 'Enregistrer l\'Enseignant'}
          </button>
          <Link
            href="/admin/teachers"
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
