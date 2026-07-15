import RoleLayout from '@/components/layouts/RoleLayout';

export default function CenseurLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['censeur', 'admin']}>
      {children}
    </RoleLayout>
  );
}