'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Building2, Receipt, LogOut, Shield, Menu, X, Plus } from 'lucide-react';
import { authService } from '@/services/authService';

const NAV_ITEMS = [
  { href: '/superadmin/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: '/superadmin/invoices', label: 'Factures Clients', icon: FileText },
  { href: '/superadmin/universities', label: 'Universités Clients', icon: Building2 },
  { href: '/superadmin/payments', label: 'Encaissements', icon: Receipt },
  { href: '/superadmin/universities/new', label: '+ Créer Université', icon: Plus },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1628] text-white flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="text-[#FF6B00]" size={22} />
            <span className="font-bold">UniSphere Admin</span>
          </div>
          <button
            className="lg:hidden text-white/70 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
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

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="lg:hidden bg-[#0a1628] text-white p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Shield className="text-[#FF6B00]" size={20} />
            <span className="font-bold text-sm">UniSphere Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-white/70 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
