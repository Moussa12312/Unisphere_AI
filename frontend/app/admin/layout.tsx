import RoleLayout from '@/components/layouts/RoleLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['admin']}>
      {children}
    </RoleLayout>
  );
}