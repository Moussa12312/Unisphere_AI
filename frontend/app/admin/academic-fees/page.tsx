'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, DollarSign } from 'lucide-react';

export default function AcademicFeesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings/config?tab=frais');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-[#FF6B00] flex items-center justify-center">
        <DollarSign size={26} />
      </div>
      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-base">
        <Loader2 className="animate-spin text-[#FF6B00]" size={20} />
        <span>Redirection vers la Configuration des Scolarités &amp; Tranches...</span>
      </div>
      <p className="text-xs text-slate-500 max-w-md text-center">
        Toutes les règles de scolarité, tranches et pénalités sont désormais centralisées dans votre Tour de Contrôle Unique.
      </p>
    </div>
  );
}
