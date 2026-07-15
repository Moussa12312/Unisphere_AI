'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, GraduationCap, UserCheck, 
  BookOpen, FileText, Calendar, CreditCard, Shield, 
  Settings, Bot, Briefcase, ChevronRight, Bell, Mail
} from 'lucide-react';

const menuSections = [
  {
    title: 'ACADÉMIQUE',
    items: [
      { name: 'Étudiants', href: '/admin/students', icon: Users },
      { name: 'Enseignants', href: '/admin/teachers', icon: GraduationCap },
      { name: 'Censeurs', href: '/admin/censors', icon: UserCheck },
      { name: 'Cours', href: '/admin/courses', icon: BookOpen },
      { name: 'Notes', href: '/admin/grades', icon: FileText },
      { name: 'Présences', href: '/admin/attendance', icon: Calendar },
      { name: 'Emploi du temps', href: '/admin/schedule', icon: Calendar },
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'Secrétariat', href: '/admin/secretariat', icon: Briefcase },
      { name: 'Gardiens', href: '/admin/guards', icon: Shield },
      { name: 'Paiements', href: '/admin/payments', icon: CreditCard },
      { name: 'Documents', href: '/admin/documents', icon: FileText },
      { name: 'Annonces', href: '/admin/announcements', icon: Bell },
    ]
  },
  {
    title: 'PILOTAGE',
    items: [
      { name: 'Rapports', href: '/admin/reports', icon: FileText },
      { name: 'Assistant IA', href: '/admin/ai-assistant', icon: Bot },
    ]
  },
  {
    title: 'SYSTÈME',
    items: [
      { name: 'Comptes', href: '/admin/accounts', icon: Users },
      { name: 'Paramètres', href: '/admin/settings', icon: Settings },
    ]
  }
];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-[260px] bg-[#0a1628] 
        transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="rounded-lg flex  justify-center mr-0 -ml-5">
            <img
                  src="/logo.png"
                  alt="UniSphere AI"
                  className=" bg-none w-23 h-18 object-contain"
              />
          </div>
          <span className="text-white font-bold text-lg">UniSphere <span className="text-[#FF6B00]">AI</span></span>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {/* Dashboard - Special Item */}
          <Link 
            href="/admin/dashboard"
            className={`
              flex items-center px-4 py-2.5 rounded-lg text-sm font-medium mb-4 transition-all
              ${pathname === '/admin/dashboard' 
                ? 'bg-[#FF6B00] text-white' 
                : 'text-slate-300 hover:bg-white/5'}
            `}
          >
            <LayoutDashboard size={18} className="mr-3" />
            Dashboard
          </Link>

          {menuSections.map((section, idx) => (
            <div key={idx} className="mb-4">
              <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href}
                        className={`
                          flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-all
                          ${isActive 
                            ? 'bg-white/10 text-white' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                        `}
                      >
                        <div className="flex items-center">
                          <Icon size={17} className="mr-3" />
                          {item.name}
                        </div>
                        <ChevronRight size={14} className="opacity-50" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-[#FF6B00] flex items-center justify-center text-white font-bold text-sm mr-3">
              AD
            </div>
            <div>
              <p className="text-white text-sm font-medium">Administrateur</p>
              <p className="text-slate-500 text-xs">UniSphere AI</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}