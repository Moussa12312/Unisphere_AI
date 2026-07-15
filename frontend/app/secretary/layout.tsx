import RoleLayout from '@/components/layouts/RoleLayout';

export default function SecretaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['secretary', 'admin']}>
      {children}
    </RoleLayout>
  );
}