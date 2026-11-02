'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { ShieldCheck } from 'lucide-react';

export default function CenseurSettingsPage() {
  return (
    <SettingsPage 
      defaultTab="appearance"
      role="censeur" 
      roleLabel="Censeur"
      roleIcon={ShieldCheck}
    />
  );
}