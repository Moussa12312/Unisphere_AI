'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { Building2 } from 'lucide-react';

export default function AdminProfilePage() {
  return (
    <SettingsPage 
      role="admin" 
      roleLabel="Administrateur"
      roleIcon={Building2}
    />
  );
}