'use client';

import { useParams } from 'next/navigation';
import StudentEditForm from '@/components/students/StudentEditForm';

export default function AdminEditStudentPage() {
  const params = useParams();
  const studentId = String(params?.id || '');

  return <StudentEditForm studentId={studentId} role="admin" />;
}
