import type { SubmissionStatus } from '../../types';

const STYLES: Record<SubmissionStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-purple-100 text-purple-700',
  returned: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
};

export default function SubmissionStatusPill({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
