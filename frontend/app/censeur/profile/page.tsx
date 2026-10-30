'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { CheckCircle } from 'lucide-react';

export default function CenseurProfilePage() {
  return (
    <SettingsPage 
      role="censeur" 
      roleLabel="Censeur"
      roleIcon={CheckCircle}
    />
  );
}