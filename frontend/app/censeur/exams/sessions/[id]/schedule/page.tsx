'use client';

import { use } from 'react';
import SecretaryExamSchedulePage from '@/app/secretary/exam-sessions/[id]/schedule/page.tsx';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CenseurExamSchedulePage({ params }: PageProps) {
  return <SecretaryExamSchedulePage params={params} />;
}

