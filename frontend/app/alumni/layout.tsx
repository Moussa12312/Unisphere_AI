import RoleLayout from '@/components/layouts/RoleLayout';

export default function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout allowedRoles={['alumni']}>{children}</RoleLayout>;
}