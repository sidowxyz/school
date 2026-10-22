import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../api/aiApi';
import type { ConversationSummary } from '../types/ai.types';

/**
 * The signed-in user's past assistant threads.
 *
 * Ownership is enforced server-side by making the user id part of the query, so
 * this never needs to filter — a conversation belonging to someone else simply
 * does not resolve.
 */
export function useConversations(enabled: boolean) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.conversations();
      if (mounted.current) setItems(data);
    } catch {
      if (mounted.current) setError('Could not load past conversations.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // Only fetch when the history view is actually opened — no cost otherwise.
  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const remove = useCallback(async (id: string) => {
    // Optimistic: the row disappears immediately, and is restored if the
    // request fails, so deleting never feels laggy.
    const previous = items;
    setItems((list) => list.filter((c) => c._id !== id));
    try {
      await aiApi.deleteConversation(id);
    } catch {
      if (mounted.current) {
        setItems(previous);
        setError('Could not delete that conversation.');
      }
    }
  }, [items]);

  return { items, loading, error, reload: load, remove };
}
