'use client';

import SettingsPage from '@/components/settings/SettingsPage';
import { FileText } from 'lucide-react';

export default function SecretarySettingsPage() {
  return (
    <SettingsPage 
      role="secretary" 
      roleLabel="Secrétaire"
      roleIcon={FileText}
    />
  );
}