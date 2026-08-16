'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Calculator } from 'lucide-react';

export default function AccountantSettingsPage() {
  return (
    <SettingsPage 
      role="accountant" 
      roleLabel="Comptable"
      roleIcon={Calculator}
    />
  );
}