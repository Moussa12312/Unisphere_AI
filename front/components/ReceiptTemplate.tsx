'use client';

import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

/* ---------- Montant en lettres ---------- */
function enLettres(n: number): string {
  const units = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const tens = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
  const under100 = (x: number): string => {
    if (x < 20) return units[x];
    const t = Math.floor(x / 10), r = x % 10;
    if (t === 7 || t === 9) return tens[t] + '-' + units[10 + r];
    if (r === 0) return tens[t] + (t === 8 ? 's' : '');
    if (r === 1 && t !== 8) return tens[t] + ' et un';
    return tens[t] + '-' + units[r];
  };
  const under1000 = (x: number): string => {
    const c = Math.floor(x / 100), r = x % 100;
    let s = '';
    if (c > 0) s = c === 1 ? 'cent' : units[c] + ' cent' + (r === 0 && c > 1 ? 's' : '');
    if (r > 0) s = s ? s + ' ' + under100(r) : under100(r);
    return s;
  };
  n = Math.round(Math.abs(n));
  if (n === 0) return 'zéro';
  const M = Math.floor(n / 1000000), K = Math.floor((n % 1000000) / 1000), R = n % 1000;
  let out = '';
  if (M) out += M === 1 ? 'un million' : units[M] + ' millions';
  if (K) out += (out ? ' ' : '') + (K === 1 ? 'mille' : under1000(K) + ' mille');
  if (R) out += (out ? ' ' : '') + under1000(R);
  return out;
}

interface Props {
  receipt: any;
  showBackButton?: boolean;
  backUrl?: string;
}

export default function ReceiptTemplate({ receipt, showBackButton = false, backUrl }: Props) {
  const router = useRouter();
  const p = receipt?.payment || {};
  const s = receipt?.student || {};
  const u = receipt?.university || {};
  const c = receipt?.creator || {};
  const t = receipt?.tranches || {};
  const paid = t.paid || [];
  const remaining = t.remaining || [];
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0);
  const dateFr = (d: any) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

  return (

    <div className="receipt-wrapper max-w-[190mm] mx-auto print:max-w-none print:w-full print:mx-0">
      {/* ✅ Boutons (masqués à l'impression) */}
      <div className="flex gap-3 mb-5 print:hidden">
        {showBackButton && (
          <button
            onClick={() => (backUrl ? router.push(backUrl) : router.back())}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft size={17} /> Retour
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] shadow-md"
        >
          <Printer size={17} /> Imprimer
        </button>
      </div>

      {/* ✅ FEUILLE — taille normale, espacements confortables */}
      <div className="receipt-sheet bg-white rounded-2xl border border-slate-200 shadow-lg p-10 print:shadow-none print:rounded-none print:border-none print:p-0 text-[12px] leading-relaxed text-slate-900">

        {/* ===== En-tête ===== */}
        <div className="flex items-start justify-between pb-5 mb-6 border-b-2 border-[#FF6B00]">
          <div className="flex items-center gap-4">
            {u.logo && (
              <img src={`${API_BASE_URL}/uploads/logos/${u.logo}`} alt="Logo" className="w-16 h-16 object-contain" />
            )}
            <div>
              <p className="font-bold text-[15px] uppercase">{u.name || 'Université'}</p>
              {u.address && <p className="text-[11px] text-slate-500">{u.address}</p>}
              {u.phone && <p className="text-[11px] text-slate-500">Tél : {u.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-[16px] text-[#FF6B00]">REÇU DE PAIEMENT</p>
            <p className="font-mono text-[12px] mt-1">N° {p.receipt_number || `REC-${p.id}`}</p>
            <p className="text-[11px] text-slate-500">Réf : {p.reference || '—'}</p>
          </div>
        </div>

        {/* ===== Infos sur la même horizontale ===== */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          <div className="border border-slate-300 rounded-lg p-4">
            <p className="font-bold text-[11px] uppercase text-[#FF6B00] border-b border-slate-200 pb-2 mb-3">
              Informations étudiant
            </p>
            <table className="w-full">
              <tbody>
                <tr><td className="text-slate-500 py-1 pr-2 w-24">Nom</td><td className="font-semibold py-1">{s.name || '—'}</td></tr>
                <tr><td className="text-slate-500 py-1 pr-2">Matricule</td><td className="font-mono font-semibold py-1">{s.matricule || '—'}</td></tr>
                <tr><td className="text-slate-500 py-1 pr-2">Niveau</td><td className="py-1">{s.level || '—'}</td></tr>
                <tr><td className="text-slate-500 py-1 pr-2">Filière</td><td className="py-1">{s.filiere || '—'}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border border-slate-300 rounded-lg p-4">
            <p className="font-bold text-[11px] uppercase text-[#FF6B00] border-b border-slate-200 pb-2 mb-3">
              Détails du paiement
            </p>
            <table className="w-full">
              <tbody>
                <tr><td className="text-slate-500 py-1 pr-2 w-24">Date</td><td className="font-semibold py-1">{dateFr(p.payment_date || p.created_at)}</td></tr>
                <tr><td className="text-slate-500 py-1 pr-2">Type</td><td className="capitalize py-1">{(p.payment_type || 'scolarite').replace('_', ' ')}</td></tr>
                <tr><td className="text-slate-500 py-1 pr-2">Méthode</td><td className="capitalize py-1">{(p.payment_method || 'espèces').replace('_', ' ')}</td></tr>
                <tr><td className="text-slate-500 py-1 pr-2">Encaissé par</td><td className="py-1">{c.name || 'Comptable'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== Tableau des tranches ===== */}
        <table className="w-full border border-slate-300 mb-6">
          <thead>
            <tr className="bg-[#FF6B00] text-white">
              <th className="border border-slate-300 px-3 py-2 text-left text-[11px]">Tranche</th>
              <th className="border border-slate-300 px-3 py-2 text-right text-[11px]">Montant</th>
              <th className="border border-slate-300 px-3 py-2 text-center text-[11px]">Échéance</th>
              <th className="border border-slate-300 px-3 py-2 text-center text-[11px]">Statut</th>
            </tr>
          </thead>
          <tbody>
            {paid.map((tr: any, i: number) => (
              <tr key={`p${i}`}>
                <td className="border border-slate-300 px-3 py-1.5">{tr.tranche_name}</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-semibold">{fmt(tr.amount)} FCFA</td>
                <td className="border border-slate-300 px-3 py-1.5 text-center">{dateFr(tr.due_date)}</td>
                <td className="border border-slate-300 px-3 py-1.5 text-center font-bold text-green-700">PAYÉE</td>
              </tr>
            ))}
            {remaining.map((tr: any, i: number) => (
              <tr key={`r${i}`}>
                <td className="border border-slate-300 px-3 py-1.5">{tr.tranche_name}</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-semibold">{fmt(tr.amount)} FCFA</td>
                <td className="border border-slate-300 px-3 py-1.5 text-center">{dateFr(tr.due_date)}</td>
                <td className="border border-slate-300 px-3 py-1.5 text-center font-bold text-orange-600">À PAYER</td>
              </tr>
            ))}
            {paid.length === 0 && remaining.length === 0 && (
              <tr>
                <td colSpan={4} className="border border-slate-300 px-3 py-1.5 text-center text-slate-500">Paiement unique</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ===== Totaux ===== */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border border-slate-300 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Total dû</p>
            <p className="font-bold text-[14px]">{fmt(p.total_amount)} FCFA</p>
          </div>
          <div className="border border-green-600 rounded-lg p-3 text-center bg-green-50">
            <p className="text-[10px] text-green-700 uppercase">Total payé</p>
            <p className="font-bold text-[14px] text-green-700">{fmt(t.total_paid ?? p.amount)} FCFA</p>
          </div>
          <div className="border border-orange-500 rounded-lg p-3 text-center bg-orange-50">
            <p className="text-[10px] text-orange-700 uppercase">Reste à payer</p>
            <p className="font-bold text-[14px] text-orange-700">{fmt(t.total_remaining ?? p.balance)} FCFA</p>
          </div>
        </div>
        <p className="italic text-[11px] mb-7">
          Arrêté le présent reçu à la somme de :{' '}
          <span className="font-semibold not-italic">{enLettres(t.total_paid ?? p.amount)} francs CFA</span>.
        </p>

        {/* ===== Partie comptable en bas + signatures & cachets ===== */}
        <div className="border-2 border-slate-400 rounded-lg p-5">
          <p className="font-bold text-[11px] uppercase text-slate-700 border-b border-slate-300 pb-2 mb-4">
            Partie comptable — Visa & signatures
          </p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
              <span className="text-slate-500">Imputation</span>
              <span className="font-mono">706000 — Frais de scolarité</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
              <span className="text-slate-500">Pièce jointe</span>
              <span className="font-mono">{p.reference || '—'}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="font-semibold mb-1">Le Comptable</p>
              <p className="text-[10px] text-slate-500 mb-10">{c.name || ''}</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Signature & Cachets</p>
              <div className="h-16 border border-dashed border-slate-400 rounded"></div>
            </div>
            <div>
              <p className="font-semibold mb-1">L'Étudiant / Le Parent</p>
              <p className="text-[10px] text-slate-500 mb-10">{s.name || ''}</p>
            </div>
          </div>
        </div>

        {/* ===== Pied de page ===== */}
        <p className="text-center text-[10px] text-slate-500 mt-6">
          Ce reçu généré électroniquement fait foi de paiement. {u.name}{u.email ? ` • ${u.email}` : ''}
        </p>
      </div>

      {/* ===== CSS IMPRESSION : marges généreuses, ne remplit pas la feuille ===== */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm 12mm; }
          html, body { background: #fff !important; }
          .receipt-sheet {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .receipt-sheet, .receipt-sheet * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}