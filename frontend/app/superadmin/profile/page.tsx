'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Shield } from 'lucide-react';

export default function SuperAdminProfilePage() {
  return (
    <SettingsPage 
      role="superadmin" 
      roleLabel="Super Administrateur"
      roleIcon={Shield}
    />
  );
}
