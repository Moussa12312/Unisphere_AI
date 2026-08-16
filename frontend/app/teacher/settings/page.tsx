'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Briefcase } from 'lucide-react';

export default function TeacherSettingsPage() {
  return (
    <SettingsPage 
      role="teacher" 
      roleLabel="Enseignant"
      roleIcon={Briefcase}
    />
  );
}