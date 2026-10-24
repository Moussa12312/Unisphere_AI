import RoleLayout from '@/components/layouts/RoleLayout';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['guard', 'admin']}>
      {children}
    </RoleLayout>
  );
}
