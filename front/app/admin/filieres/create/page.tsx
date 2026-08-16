'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { useToast } from '@/components/ToastProvider';
import ComboBox from '@/components/ui/ComboBox';

export default function CreateFilierePage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [existingDomains, setExistingDomains] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    domain: '',
    name: '',
    levels: ''
  });

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const domains = await filiereService.getDomains();
      setExistingDomains(domains || []);
      console.log('🏷️ Domaines existants chargés:', domains);
    } catch (error) {
      console.error('Erreur chargement domaines:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await filiereService.create(formData);
      toast.success('Filière créée avec succès !');
      router.push('/admin/filieres');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/filieres" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-slate-500 mt-1">Ajouter un domaine et une filière.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <div className="space-y-6">

          {/* ✅ ComboBox pour le domaine */}
          <ComboBox
            label="Domaine *"
            placeholder="Sélectionnez ou tapez un nouveau domaine..."
            value={formData.domain}
            onChange={(domain) => setFormData({ ...formData, domain })}
            options={existingDomains}
          />

          {/* Nom de la filière */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom de la filière *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Génie Logiciel, Géologie Appliquée, Marketing Digital"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          {/* Niveaux */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Niveaux disponibles *
            </label>
            <input
              type="text"
              value={formData.levels}
              onChange={(e) => setFormData({ ...formData, levels: e.target.value })}
              placeholder="Ex: L1, L2, L3, M1, M2"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
            <p className="text-xs text-slate-500 mt-1">
              Séparez les niveaux par des virgules.
            </p>
          </div>

          {/* Aperçu */}
          {(formData.domain || formData.name || formData.levels) && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-2">📋 Aperçu de la filière</p>
              <div className="flex flex-wrap gap-2">
                {formData.domain && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    {formData.domain}
                  </span>
                )}
                {formData.name && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    {formData.name}
                  </span>
                )}
                {formData.levels && formData.levels.split(',').map((level, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {level.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link
            href="/admin/filieres"
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}