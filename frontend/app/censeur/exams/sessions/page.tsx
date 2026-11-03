'use client';

import ExamSessionsManager from '@/components/academic/ExamSessionsManager';

export default function CenseurExamsSessionsPage() {
  return (
    <ExamSessionsManager
      basePath="/censeur/exams/sessions"
      roleTitle="Sessions d'Examens & Partiels"
    />
  );
}
