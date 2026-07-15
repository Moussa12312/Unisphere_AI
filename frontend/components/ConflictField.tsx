import { AlertCircle } from 'lucide-react';

interface ConflictFieldProps {
  hasConflict: boolean;
  message: string;
  children: React.ReactNode;
}

export default function ConflictField({ hasConflict, message, children }: ConflictFieldProps) {
  return (
    <div>
      {children}
      {hasConflict && (
        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}