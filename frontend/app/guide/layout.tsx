import RoleLayout from '@/components/layouts/RoleLayout';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['guard', 'admin', 'alumni', 'accountant', 'censeur', 'secretary', 'superadmin', 'teacher', 'student']}>
      {children}
    </RoleLayout>
  );
}