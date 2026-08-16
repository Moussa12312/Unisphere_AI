import RoleLayout from '@/components/layouts/RoleLayout';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['guard', 'admin']}>
      {children}
    </RoleLayout>
  );
}