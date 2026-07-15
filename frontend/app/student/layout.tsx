import RoleLayout from '@/components/layouts/RoleLayout';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['student']}>
      {children}
    </RoleLayout>
  );
}