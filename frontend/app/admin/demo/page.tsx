'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminDemoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role === 'super_admin' || user?.role === 'superadmin') {
        router.replace('/superadmin/demo');
      } else {
        router.replace('/admin/dashboard');
      }
    } catch {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      <p className="text-sm font-semibold text-slate-500">Redirection en cours...</p>
    </div>
  );
}
