'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { filiereService } from '@/services/filiereService';
import { getApiErrorMessage } from '@/lib/errorHandler';
import { useToast } from '@/components/ToastProvider';
import ComboBox from '@/components/ui/ComboBox';

export default function EditFilierePage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const filiereId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingDomains, setExistingDomains] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    domain: '',
    name: '',
    levels: ''
  });

  useEffect(() => {
    if (filiereId) {
      loadInitialData();
    }
  }, [filiereId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [domains, filiere] = await Promise.all([
        filiereService.getDomains().catch(() => []),
        filiereService.getById(filiereId)
      ]);
      setExistingDomains(domains || []);
      if (filiere) {
        setFormData({
          domain: filiere.domain || '',
          name: filiere.name || '',
          levels: filiere.levels || ''
        });
      }
    } catch (error) {
      toast.error('Erreur lors du chargement de la filière');
      router.push('/admin/filieres');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await filiereService.update(filiereId, {
        domain: formData.domain.trim(),
        name: formData.name.trim(),
        levels: formData.levels.trim()
      });
      toast.success('Filière mise à jour avec succès !');
      router.push('/admin/filieres');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la modification'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/filieres" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modifier la filière</h1>
          <p className="text-slate-500 text-sm">Mettez à jour le domaine, l'intitulé ou les niveaux.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl space-y-6">
        <ComboBox
          label="Domaine *"
          placeholder="Sélectionnez ou tapez un domaine..."
          value={formData.domain}
          onChange={(domain) => setFormData({ ...formData, domain })}
          options={existingDomains}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nom de la filière *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Génie Logiciel"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>

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
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-semibold text-blue-700 mb-2">📋 Aperçu de la filière modifiée</p>
          <div className="flex flex-wrap gap-2">
            {formData.domain && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                {formData.domain}
              </span>
            )}
            {formData.name && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                {formData.name}
              </span>
            )}
            {formData.levels && formData.levels.split(',').map((level, idx) => {
              const trimmed = level.trim();
              if (!trimmed) return null;
              return (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  {trimmed}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
          <Link
            href="/admin/filieres"
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
