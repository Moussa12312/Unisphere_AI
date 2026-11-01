'use client';

import GuardScannerModal from '@/components/guard/GuardScannerModal';
import { useRouter } from 'next/navigation';

export default function AdminScannerPage() {
  const router = useRouter();
  return (
    <GuardScannerModal
      isOpen={true}
      onClose={() => router.push('/admin/dashboard')}
      onScanComplete={() => {}}
    />
  );
}
