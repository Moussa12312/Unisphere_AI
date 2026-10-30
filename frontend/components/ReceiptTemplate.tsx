'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';

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

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (p?.id) {
      setDownloadingPdf(true);
      try {
        const token = getAuthToken();
        const res = await api.get(`/api/v1/payments/${p.id}/receipt/pdf`, {
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Recu_Paiement_${p.receipt_number || p.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      } catch (err) {
        console.error('Erreur téléchargement PDF:', err);
        window.print();
      } finally {
        setDownloadingPdf(false);
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="receipt-wrapper w-full max-w-[190mm] mx-auto print:max-w-none print:w-full print:mx-0 px-1 sm:px-0">
      {/* ✅ Boutons (masqués à l'impression) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5 print:hidden">
        {showBackButton && (
          <button
            onClick={() => (backUrl ? router.push(backUrl) : router.back())}
            className="flex items-center gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft size={16} /> Retour
          </button>
        )}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#e55f00] shadow-md transition-all"
        >
          <Printer size={16} /> Imprimer
        </button>
        {p?.id && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 shadow-md transition-all disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{downloadingPdf ? 'Génération...' : 'Télécharger PDF'}</span>
          </button>
        )}
      </div>

      {/* ✅ FEUILLE OFFICIELLE — Double encadrement solennel, filigrane et cachet d'État */}
      <div className="receipt-sheet relative bg-white border border-slate-700 sm:border-2 sm:border-slate-800 p-3 sm:p-6 md:p-8 shadow-xl print:shadow-none print:m-0 text-[11px] sm:text-[12px] leading-relaxed text-slate-900 overflow-hidden w-full">
        
        {/* Filigrane officiel en arrière-plan */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] select-none z-0">
          <div className="text-center transform -rotate-25 scale-125">
            <p className="text-6xl sm:text-8xl font-black uppercase tracking-widest text-slate-900">UNISPHERE</p>
            <p className="text-2xl sm:text-4xl font-bold uppercase tracking-wider text-slate-900 mt-2">DOCUMENT OFFICIEL</p>
          </div>
        </div>

        {/* Filet d'encadrement intérieur fin */}
        <div className="border border-slate-300 p-2.5 sm:p-5 md:p-6 relative z-10 w-full">

          {/* ===== EN-TÊTE NATIONAL & MINISTÉRIEL (Style République & Ministère) ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center sm:items-start pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-300 text-center">
            <div className="text-center sm:text-left order-2 sm:order-1">
              <p className="font-extrabold text-[9px] sm:text-[10px] uppercase text-slate-800 leading-tight">
                MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR<br />ET DE LA RECHERCHE SCIENTIFIQUE
              </p>
              <p className="text-[8px] sm:text-[9px] text-slate-500 mt-0.5">Direction Générale de l'Enseignement Supérieur</p>
            </div>

            <div className="flex flex-col items-center order-1 sm:order-2">
              {u.logo ? (
                <img src={`${API_BASE_URL}/uploads/logos/${u.logo}`} alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mb-1" />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-800 flex items-center justify-center font-black text-xs sm:text-sm text-[#FF6B00] mb-1">
                  UNI
                </div>
              )}
              <p className="font-black text-[12px] sm:text-[13px] uppercase tracking-wide text-slate-900 leading-tight">{u.name || 'UNIVERSITÉ'}</p>
              {u.phone && <p className="text-[9px] sm:text-[10px] text-slate-500">Tél : {u.phone}</p>}
            </div>

            <div className="text-center sm:text-right order-3">
              <p className="font-extrabold text-[9px] sm:text-[10px] uppercase text-slate-800 leading-tight">
                RÉPUBLIQUE DU MALI<br />
                <span className="italic font-normal lowercase tracking-normal">Un Peuple - Un But - Une Foi</span>
              </p>
              <p className="font-mono text-[8px] sm:text-[9px] text-slate-400 mt-0.5">Système LMD Officiel</p>
            </div>
          </div>

          {/* ===== TITRE MAJEUR DU REÇU ===== */}
          <div className="text-center py-2 mb-4 sm:mb-5 border-y-2 border-slate-800 bg-slate-50/70">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-wider uppercase">
              REÇU OFFICIEL DE RÈGLEMENT & QUITTANCE
            </h1>
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-6 text-[10px] sm:text-[11px] font-mono mt-1 text-slate-700">
              <span><b>N° Reçu :</b> <span className="text-[#FF6B00] font-bold">{p.receipt_number || `REC-${p.id}`}</span></span>
              <span className="hidden sm:inline">•</span>
              <span><b>Réf :</b> {p.reference || '—'}</span>
              <span className="hidden sm:inline">•</span>
              <span><b>Date :</b> {dateFr(p.payment_date || p.created_at)}</span>
            </div>
          </div>

          {/* ===== CARTOUCHE D'IDENTITÉ DE L'ÉTUDIANT & DÉTAILS COMPTABLES ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="border border-slate-300 rounded p-2.5 sm:p-3 bg-white">
              <p className="font-bold text-[9px] sm:text-[10px] uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
                <span>Identité de l'Étudiant</span>
                <span className="text-[8px] sm:text-[9px] font-normal text-slate-400">Cycle Initial</span>
              </p>
              <table className="w-full text-[10px] sm:text-[11px]">
                <tbody>
                  <tr><td className="text-slate-500 py-0.5 w-20 sm:w-24">Nom & Prénoms :</td><td className="font-bold py-0.5 text-slate-900 break-words">{s.name || '—'}</td></tr>
                  <tr><td className="text-slate-500 py-0.5">N° Matricule :</td><td className="font-mono font-bold py-0.5 text-[#FF6B00] break-words">{s.matricule || '—'}</td></tr>
                  <tr><td className="text-slate-500 py-0.5">Niveau :</td><td className="py-0.5 font-medium">{s.level || '—'}</td></tr>
                  <tr><td className="text-slate-500 py-0.5">Filière :</td><td className="py-0.5 font-medium">{s.filiere || '—'}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-300 rounded p-2.5 sm:p-3 bg-white">
              <p className="font-bold text-[9px] sm:text-[10px] uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
                <span>Paramètres d'Encaissement</span>
                <span className="text-[8px] sm:text-[9px] font-normal text-slate-400">Journal Caisse/Banque</span>
              </p>
              <table className="w-full text-[10px] sm:text-[11px]">
                <tbody>
                  <tr><td className="text-slate-500 py-0.5 w-20 sm:w-24">Objet :</td><td className="font-bold py-0.5 capitalize">{(p.payment_type || 'scolarite').replace('_', ' ')}</td></tr>
                  <tr><td className="text-slate-500 py-0.5">Mode règlement :</td><td className="font-semibold py-0.5 capitalize">{(p.payment_method || 'espèces').replace('_', ' ')}</td></tr>
                  <tr><td className="text-slate-500 py-0.5">Imputation :</td><td className="font-mono py-0.5">706000 — Droits scolarité</td></tr>
                  <tr><td className="text-slate-500 py-0.5">Comptable :</td><td className="py-0.5 font-medium">{c.name || 'Agent Comptable'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== TABLEAU DES TRANCHES & ÉCHÉANCES (Avec Scroll Horizontal sur Mobile) ===== */}
          <div className="overflow-x-auto w-full -mx-1 sm:mx-0 mb-4 sm:mb-5">
            <table className="w-full min-w-[420px] sm:min-w-full border-collapse border border-slate-400 text-[10px] sm:text-[11px]">
              <thead>
                <tr className="bg-slate-800 text-white font-bold uppercase text-[9px] sm:text-[10px]">
                  <th className="border border-slate-400 px-2 sm:px-3 py-2 text-left">Désignation de la Tranche</th>
                  <th className="border border-slate-400 px-2 sm:px-3 py-2 text-right">Montant Exigible</th>
                  <th className="border border-slate-400 px-2 sm:px-3 py-2 text-center">Échéance</th>
                  <th className="border border-slate-400 px-2 sm:px-3 py-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((tr: any, i: number) => (
                  <tr key={`p${i}`} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 font-medium">{tr.tranche_name}</td>
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 text-right font-bold font-mono">{fmt(tr.amount)} FCFA</td>
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 text-center">{dateFr(tr.due_date)}</td>
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 text-center font-bold text-emerald-700 bg-emerald-50/50">RÉGLÉE</td>
                  </tr>
                ))}
                {remaining.map((tr: any, i: number) => (
                  <tr key={`r${i}`} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 font-medium">{tr.tranche_name}</td>
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 text-right font-bold font-mono">{fmt(tr.amount)} FCFA</td>
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 text-center">{dateFr(tr.due_date)}</td>
                    <td className="border border-slate-300 px-2 sm:px-3 py-1.5 text-center font-bold text-amber-700 bg-amber-50/50">À PAYER</td>
                  </tr>
                ))}
                {paid.length === 0 && remaining.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-slate-300 px-3 py-2 text-center text-slate-500 italic">Paiement unique de scolarité</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ===== TOTAUX COMPTABLES ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            <div className="border border-slate-400 rounded p-2 sm:p-2.5 text-center bg-slate-50">
              <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold">Total Dû Annuel</p>
              <p className="font-black text-xs sm:text-sm font-mono mt-0.5 text-slate-900">{fmt(p.total_amount)} FCFA</p>
            </div>
            <div className="border border-emerald-600 rounded p-2 sm:p-2.5 text-center bg-emerald-50/60">
              <p className="text-[8px] sm:text-[9px] text-emerald-800 uppercase font-bold">Total Payé à ce jour</p>
              <p className="font-black text-xs sm:text-sm font-mono mt-0.5 text-emerald-700">{fmt(t.total_paid ?? p.amount)} FCFA</p>
            </div>
            <div className="border border-orange-500 rounded p-2 sm:p-2.5 text-center bg-orange-50/60">
              <p className="text-[8px] sm:text-[9px] text-orange-800 uppercase font-bold">Solde Restant Dû</p>
              <p className="font-black text-xs sm:text-sm font-mono mt-0.5 text-orange-700">{fmt(t.total_remaining ?? p.balance)} FCFA</p>
            </div>
          </div>

          {/* Formule juridique d'arrêt de compte */}
          <p className="text-[10px] sm:text-[11px] mb-4 sm:mb-5 bg-slate-50 border-l-2 border-[#FF6B00] px-3 py-1.5 text-slate-800">
            Arrêté le présent reçu à la somme de :{' '}
            <span className="font-black uppercase">{enLettres(t.total_paid ?? p.amount)} francs CFA</span>.
          </p>

          {/* ===== ZONE DE VISA, SIGNATURES & CACHET OFFICIEL (STYLE ECOB / MINISTÈRE) ===== */}
          <div className="border border-slate-400 rounded p-3 sm:p-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center items-center">
              
              {/* Le Comptable */}
              <div>
                <p className="font-bold text-[10px] sm:text-[11px] text-slate-800">L'Agent Comptable</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">{c.name || 'Service Financier'}</p>
                <div className="h-10 sm:h-14 flex items-end justify-center">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 italic">Signature certifiée</span>
                </div>
              </div>

              {/* Cachet rond officiel d'institution */}
              <div className="flex flex-col items-center justify-center my-2 sm:my-0">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-blue-600/70 p-1 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border border-blue-700 flex flex-col items-center justify-center text-blue-800 text-[7px] sm:text-[8px] font-black uppercase text-center leading-tight p-1 select-none">
                    <span className="text-[6px] sm:text-[7px] text-blue-600 tracking-tighter">★ SERVICES FINANCIERS ★</span>
                    <span className="my-0.5 font-extrabold text-[8px] sm:text-[9px] text-blue-900 border-y border-blue-400 py-0.5 px-1">QUITTANCE VALIDÉE</span>
                    <span className="text-[6px] sm:text-[7px] font-mono text-blue-700">{dateFr(p.payment_date || p.created_at)}</span>
                  </div>
                </div>
                <p className="text-[8px] sm:text-[9px] text-slate-400 mt-1 italic">Sceau et timbre officiel</p>
              </div>

              {/* L'Étudiant / Déposant */}
              <div>
                <p className="font-bold text-[10px] sm:text-[11px] text-slate-800">L'Étudiant(e) / Pour Acquit</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">{s.name || ''}</p>
                <div className="h-10 sm:h-14 flex items-end justify-center">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 italic">Reçu en main propre</span>
                </div>
              </div>

            </div>
          </div>

          {/* ===== PIED DE PAGE OFFICIEL (Mention légale et authentification) ===== */}
          <div className="mt-4 pt-3 border-t border-slate-300 text-center text-[9px] text-slate-500">
            <p className="font-semibold text-slate-700">
              Document officiel généré électroniquement • Fait foi de paiement libératoire conformément aux règlements universitaires.
            </p>
            <p className="mt-0.5 text-slate-400">
              Ratures et surcharges interdites • {u.name || 'UniSphere AI'} • Contact : {u.phone || '+223 20 00 00 00'} {u.email ? `• ${u.email}` : ''}
            </p>
          </div>

        </div>
      </div>

      {/* ===== CSS IMPRESSION : marges généreuses, document propre et cadré sur 1 page A4 ===== */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          html, body { 
            background: #fff !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .receipt-wrapper {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .receipt-sheet {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            padding: 24px !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
            break-inside: avoid;
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