'use client';

import GuardScannerModal from '@/components/guard/GuardScannerModal';
import { useRouter } from 'next/navigation';

export default function GuardScannerPage() {
  const router = useRouter();
  return (
    <GuardScannerModal
      isOpen={true}
      onClose={() => router.push('/guard/dashboard')}
      onScanComplete={() => {}}
    />
  );
}
