'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { BookOpen } from 'lucide-react';

export default function TeacherProfilePage() {
  return (
    <SettingsPage 
      role="teacher" 
      roleLabel="Enseignant"
      roleIcon={BookOpen}
    />
  );
}