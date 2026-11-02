'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Shield } from 'lucide-react';

export default function GuardSettingsPage() {
  return (
    <SettingsPage 
      defaultTab="appearance"
      role="guard" 
      roleLabel="Gardien"
      roleIcon={Shield}
    />
  );
}