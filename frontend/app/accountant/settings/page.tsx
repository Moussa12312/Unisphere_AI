'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Calculator } from 'lucide-react';

export default function AccountantSettingsPage() {
  return (
    <SettingsPage 
      defaultTab="appearance"
      role="accountant" 
      roleLabel="Comptable"
      roleIcon={Calculator}
    />
  );
}