'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { getPageTitle } from '@/lib/pageTitles';

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  
  // Ne pas afficher sur le dashboard principal
  if (segments.length <= 2 && segments[1] === 'dashboard') {
    return null;
  }

  const buildPath = (index: number) => '/' + segments.slice(0, index + 1).join('/');
  
  return (
    <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1">
      <Link 
        href={`/${segments[0]}/dashboard`}
        className="flex items-center gap-1 hover:text-[#FF6B00] transition-colors"
      >
        <Home size={12} />
        <span>Accueil</span>
      </Link>
      
      {segments.slice(1).map((segment, idx) => {
        const path = buildPath(idx + 1);
        const pageInfo = getPageTitle(path);
        const isLast = idx === segments.length - 2;
        
        // Ignorer les IDs numériques dans le breadcrumb
        if (/^\d+$/.test(segment)) return null;
        
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-slate-300" />
            {isLast ? (
              <span className="font-medium text-slate-900">{pageInfo.title}</span>
            ) : (
              <Link 
                href={path} 
                className="hover:text-[#FF6B00] transition-colors"
              >
                {pageInfo.title}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}