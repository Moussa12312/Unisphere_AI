'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldX, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function SuspendedPage() {
  const [contact, setContact] = useState<{ contact_email: string; platform_name: string } | null>(null);

  useEffect(() => {
    api.get('/api/v1/auth/platform-contact')
      .then((r) => setContact(r.data))
      .catch(() => setContact({ contact_email: 'support@unisphere-ai.com', platform_name: 'UniSphere AI' }));
  }, []);

  const email = contact?.contact_email || '';
  const subject = encodeURIComponent('Régularisation accès université');
  const body = encodeURIComponent(
    'Bonjour,\n\nNotre université a été suspendue sur la plateforme. ' +
    'Nous souhaitons régulariser notre situation.\n\n' +
    'Merci de nous indiquer la marche à suivre.\n\nCordialement'
  );
  const mailto = `mailto:${email}?subject=${subject}&body=${body}`;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #3b82f6 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center relative z-10">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX className="text-red-600" size={32} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès suspendu</h1>
        <p className="text-sm text-slate-500 mb-6">
          Votre université a été <strong className="text-red-600">bloquée par l'administrateur de la plateforme</strong>
          {' '}(défaut de paiement ou motif administratif).
          <br />
          Vos données sont conservées en sécurité.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <p className="text-xs text-slate-500 mb-2">Pour régulariser votre situation, contactez-nous :</p>
          {contact ? (
            <>
              <p className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-center gap-2">
                <Mail size={15} className="text-[#FF6B00]" /> {email}
              </p>
              <a
                href={mailto}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B00] to-blue-600 hover:from-[#e55f00] hover:to-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-lg"
              >
                <Mail size={16} /> Écrire à l'administrateur
              </a>
            </>
          ) : (
            <Loader2 className="animate-spin mx-auto text-[#FF6B00]" size={20} />
          )}
        </div>

        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
