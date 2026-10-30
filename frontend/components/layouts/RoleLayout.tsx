'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import FloatingAIButton from '@/components/FloatingAIButton';
import MobileBottomNav from '@/components/layouts/MobileBottomNav';

import api from '@/lib/api';

interface User {
  id?: number;
  email: string;
  role: string;
  full_name: string;
  photo?: string;
  phone?: string;
  university_id?: number;
}

interface RoleLayoutProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

function getUserFromStorage(): User | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export default function RoleLayout({ children, allowedRoles }: RoleLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // ✅ MÉMOÏSER allowedRoles pour éviter les re-rendus inutiles
  const memoizedAllowedRoles = useMemo(() => allowedRoles, [allowedRoles.join(',')]);

  useEffect(() => {
    // ✅ Ne pas rediriger si on est déjà sur /login
    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    const currentUser = getUserFromStorage();
    const token = localStorage.getItem('token');

    if (!currentUser || !token || !memoizedAllowedRoles.includes(currentUser.role)) {
      window.location.href = '/login';
      return;
    }

    setUser(currentUser);
    setLoading(false);

    // Rafraîchir les informations de l'utilisateur (dont sa photo) depuis le backend
    api.get('/api/v1/auth/me').then(res => {
      if (res.data) {
        const updated = { ...currentUser, ...res.data };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    }).catch(() => {});

    // Écouter les mises à jour locales de profil (ex: upload photo dans paramètres)
    const handleUserUpdate = () => {
      const refreshed = getUserFromStorage();
      if (refreshed) {
        setUser(refreshed);
      }
    };

    window.addEventListener('unisphere:user_updated', handleUserUpdate);
    return () => window.removeEventListener('unisphere:user_updated', handleUserUpdate);
  }, [memoizedAllowedRoles, pathname]);

  useEffect(() => {
    const checkWidth = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setIsSidebarOpen(false);
      }
    };
    
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Fermer la sidebar sur mobile à chaque changement de page
  useEffect(() => {
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isDesktop]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  // ✅ NE PAS AFFICHER LE BOUTON FLOTTANT SUR LA PAGE IA
  const isAIPage = pathname === '/ai-assistant';

  return (
    <div className="h-screen bg-[#f1f5f9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden flex transition-colors duration-200 print:h-auto print:overflow-visible print:bg-white print:block">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#333', color: '#fff', fontSize: '14px' },
        }}
      />
      
      {isSidebarOpen && !isDesktop && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-60
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen || isDesktop ? 'translate-x-0' : '-translate-x-full'}
        print:hidden
      `}>
        <Sidebar userRole={user.role} />
      </div>

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDesktop ? 'ml-60' : 'ml-0'} print:ml-0 print:w-full print:block`}>
        {/* ✅ HEADER FIXE EN HAUT - NE DÉFILE PAS AVEC LE CONTENU */}
        {pathname !== '/ai-assistant' && (
          <div className="sticky top-0 z-30 flex-shrink-0 w-full bg-[#f1f5f9]/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors print:hidden">
            <Header 
              user={user} 
              isDesktop={isDesktop}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            />
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-2 sm:px-6 lg:px-8 pt-2 pb-24 md:pb-6 print:overflow-visible print:p-0 print:m-0 print:h-auto print:block">
          <div className="w-full max-w-7xl mx-auto overflow-x-hidden print:max-w-none print:w-full print:m-0 print:p-0">
            {children}
          </div>
        </main>
      </div>

      {/* Navigation Mobile en bas d'écran (Écrans < 768px) */}
      <MobileBottomNav userRole={user.role} />

      {/* Bouton flottant IA - Masqué à l'impression */}
      {!isAIPage && (
        <div className="print:hidden">
          <FloatingAIButton />
        </div>
      )}
    </div>
  );
}