'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { GraduationCap } from 'lucide-react';

export default function StudentSettingsPage() {
  return (
    <SettingsPage 
      defaultTab="appearance"
      role="student" 
      roleLabel="Étudiant"
      roleIcon={GraduationCap}
    />
  );
}