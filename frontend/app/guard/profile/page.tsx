'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Shield } from 'lucide-react';

export default function GuardProfilePage() {
  return (
    <SettingsPage 
      role="guard" 
      roleLabel="Gardien"
      roleIcon={Shield}
    />
  );
}
