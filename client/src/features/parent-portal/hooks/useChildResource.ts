import { useEffect, useState } from 'react';
import { useParentPortal } from '../context/ParentContext';

// Fetches a resource for the currently selected child (self routes for a parent,
// guardian-id routes for an admin viewing a parent). Refetches when the selected
// child or guardian changes.
export function useChildResource<T>(fetcher: (studentId: string, guardianId?: string) => Promise<T>) {
  const { childId, guardianId } = useParentPortal();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!childId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await fetcher(childId, guardianId);
        if (!cancelled) { setData(result); setError(''); }
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load data.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // fetcher passed inline; refetch keyed on the selected child/guardian only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, guardianId]);

  return { data, loading, error };
}
