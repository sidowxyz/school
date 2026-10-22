import { useEffect, useState } from 'react';
import { usePortal } from '../context/PortalContext';

// Fetches a portal resource for the active student (self routes for a logged-in
// student, id routes for an admin viewing a specific student) and tracks
// loading/error state. Refetches whenever the target student changes.
export function usePortalResource<T>(fetcher: (studentId?: string) => Promise<T>) {
  const { studentId } = usePortal();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await fetcher(studentId);
        if (!cancelled) { setData(result); setError(''); }
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load data.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // fetcher is passed inline; we intentionally key the refetch on studentId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return { data, loading, error };
}
