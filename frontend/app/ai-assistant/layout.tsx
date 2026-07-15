import RoleLayout from '@/components/layouts/RoleLayout';

export default function AIAssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={['admin', 'teacher', 'student', 'secretary', 'censeur', 'accountant', 'guard']}>
      {children}
    </RoleLayout>
  );
}