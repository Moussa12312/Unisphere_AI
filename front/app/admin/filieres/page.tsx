'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { filiereService } from '@/services/filiereService';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

export default function FilieresPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const [filieres, setFilieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilieres();
  }, []);

  const loadFilieres = async () => {
    try {
      const data = await filiereService.getAll();
      setFilieres(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Supprimer cette filière ?',
      message: `Voulez-vous vraiment supprimer "${name}" ? Cette action est irréversible. Toutes les classes et étudiants associés seront affectés.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    
    if (ok) {
      try {
        await filiereService.delete(id);
        toast.success('Filière supprimée');
        loadFilieres();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const grouped = filieres.reduce((acc: any, curr: any) => {
    if (!acc[curr.domain]) acc[curr.domain] = [];
    acc[curr.domain].push(curr);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Filières</h1>
          <p className="text-slate-500 mt-1">Définissez les domaines et filières de votre université.</p>
        </div>
        <Link href="/admin/filieres/create" className="bg-[#FF6B00] hover:bg-[#e55f00] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Ajouter une filière
        </Link>
      </div>

      <div className="space-y-6">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">Aucune filière configurée. Commencez par en ajouter une.</p>
          </div>
        )}

        {Object.entries(grouped).map(([domain, items]: [string, any]) => (
          <div key={domain} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                📂 {domain}
              </h3>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{f.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {f.levels.split(',').map((l: string) => (
                        <span key={l} className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full mr-1 mb-1">
                          {l.trim()}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/filieres/${f.id}/edit`} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                          <Pencil size={16} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(f.id, f.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}