'use client';

import ExamSessionsManager from '@/components/academic/ExamSessionsManager';

export default function SecretaryExamSessionsPage() {
  return (
    <ExamSessionsManager
      basePath="/secretary/exam-sessions"
      roleTitle="Sessions d'Examens & Partiels"
    />
  );
}
