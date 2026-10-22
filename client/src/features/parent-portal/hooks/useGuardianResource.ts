import { useEffect, useState } from 'react';
import { useParentPortal } from '../context/ParentContext';

// Fetches a guardian-scoped resource (notices, messages) for the active parent —
// self routes for a logged-in parent, guardian-id routes for an admin viewing a
// parent. Refetches when the guardian changes.
export function useGuardianResource<T>(fetcher: (guardianId?: string) => Promise<T>) {
  const { guardianId } = useParentPortal();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await fetcher(guardianId);
        if (!cancelled) { setData(result); setError(''); }
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load data.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // fetcher passed inline; refetch keyed on the guardian only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardianId]);

  return { data, loading, error };
}
