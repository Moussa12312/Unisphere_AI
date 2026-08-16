import RoleLayout from '@/components/layouts/RoleLayout';

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['accountant', 'admin']}>
      {children}
    </RoleLayout>
  );
}