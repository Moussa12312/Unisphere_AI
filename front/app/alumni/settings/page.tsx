'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Award } from 'lucide-react';

export default function AlumniSettingsPage() {
  return (
    <SettingsPage 
      role="alumni" 
      roleLabel="Alumni"
      roleIcon={Award}
    />
  );
}