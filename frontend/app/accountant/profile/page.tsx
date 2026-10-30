'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { CreditCard } from 'lucide-react';

export default function AccountantProfilePage() {
  return (
    <SettingsPage 
      role="accountant" 
      roleLabel="Comptable"
      roleIcon={CreditCard}
    />
  );
}