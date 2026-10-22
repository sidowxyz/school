import { TeachingLogStatus } from '../../types/teachingLog.types';

interface StatusBadgeProps {
  status: TeachingLogStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<TeachingLogStatus, string> = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-gray-100 text-gray-650 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] ?? 'bg-gray-50 text-gray-500 border-gray-100'
      } capitalize`}
    >
      {status}
    </span>
  );
}
