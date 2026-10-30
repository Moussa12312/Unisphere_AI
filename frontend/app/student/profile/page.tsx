'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { GraduationCap } from 'lucide-react';

export default function StudentProfilePage() {
  return (
    <SettingsPage 
      role="student" 
      roleLabel="Étudiant"
      roleIcon={GraduationCap}
    />
  );
}