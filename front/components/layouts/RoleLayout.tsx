'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import FloatingAIButton from '@/components/FloatingAIButton';  // ✅ AJOUT

interface User {
  email: string;
  role: string;
  full_name: string;
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
      // ✅ Utiliser window.location pour éviter la boucle Next.js
      window.location.href = '/login';
    } else {
      setUser(currentUser);
    }
    setLoading(false);
  }, [memoizedAllowedRoles, pathname]);

  useEffect(() => {
    const checkWidth = () => {
      const desktop = window.innerWidth >= 600;
      setIsDesktop(desktop);
      if (desktop) {
        setIsSidebarOpen(false);
      }
    };
    
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

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
    <div className="h-screen bg-[#f1f5f9] overflow-hidden flex">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#333', color: '#fff', fontSize: '14px' },
        }}
      />
      
      {isSidebarOpen && !isDesktop && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-60
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen || isDesktop ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar userRole={user.role} />
      </div>

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDesktop ? 'ml-60' : 'ml-0'}`}>
        {/* ✅ MASQUER LE HEADER SUR LA PAGE AI-ASSISTANT */}
        {pathname !== '/ai-assistant' && (
          <Header 
            user={user} 
            isDesktop={isDesktop}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
        )}
        
        <main className="flex-1 overflow-y-auto px-2 sm:px-6 lg:px-8 pt-2 pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ✅ BOUTON FLOTTANT IA - AJOUTÉ ICI */}
      {!isAIPage && <FloatingAIButton />}
    </div>
  );
}