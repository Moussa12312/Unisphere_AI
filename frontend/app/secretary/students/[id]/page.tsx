'use client';

import { useParams } from 'next/navigation';
import StudentCompleteDossier from '@/components/students/StudentCompleteDossier';

export default function SecretaryStudentDetailPage() {
  const params = useParams();
  const studentId = String(params?.id || '');

  return <StudentCompleteDossier studentId={studentId} role="secretary" />;
}
