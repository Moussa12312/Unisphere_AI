'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Building2, Receipt, LogOut, Shield } from 'lucide-react';
import { authService } from '@/services/authService';

const NAV_ITEMS = [
  { href: '/superadmin/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/superadmin/invoices', label: 'Factures Clients', icon: FileText },
  { href: '/superadmin/universities', label: 'Universités Clients', icon: Building2 },
  { href: '/superadmin/payments', label: 'Encaissements', icon: Receipt },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role !== 'super_admin') {
        router.push('/login');
        return;
      }
    } catch {
      router.push('/login');
      return;
    }
    setChecked(true);
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-[#0a1628] text-white flex flex-col">
        <div className="p-5 flex items-center gap-2 border-b border-white/10">
          <Shield className="text-[#FF6B00]" size={22} />
          <span className="font-bold">UniSphere Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#FF6B00] text-white' : 'text-white/70 hover:bg-white/10'}`}
              >
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
