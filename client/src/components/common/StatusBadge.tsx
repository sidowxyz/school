const variants: Record<string, string> = {
  active:      'bg-green-100 text-green-700',
  suspended:   'bg-yellow-100 text-yellow-700',
  graduated:   'bg-blue-100 text-blue-700',
  transferred: 'bg-gray-100 text-gray-600',
  published:   'bg-green-100 text-green-700',
  draft:       'bg-gray-100 text-gray-600',
  submitted:   'bg-blue-100 text-blue-700',
  approved:    'bg-purple-100 text-purple-700',
  paid:        'bg-green-100 text-green-700',
  unpaid:      'bg-red-100 text-red-700',
  partial:     'bg-yellow-100 text-yellow-700',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = variants[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
