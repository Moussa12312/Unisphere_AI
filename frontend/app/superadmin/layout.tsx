'use client';

import RoleLayout from '@/components/layouts/RoleLayout';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['super_admin', 'superadmin']}>
      {children}
    </RoleLayout>
  );
}
