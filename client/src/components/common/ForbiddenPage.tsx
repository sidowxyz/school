import { Link } from 'react-router-dom';
import { ShieldWarning } from '@phosphor-icons/react';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
        <ShieldWarning size={30} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
      <p className="text-sm text-gray-500 mt-2 max-w-sm">
        You don't have permission to view this page. If you think this is a mistake, contact your administrator.
      </p>
      <Link to="/" className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition">
        Back to dashboard
      </Link>
    </div>
  );
}
