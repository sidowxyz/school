import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { PageContext } from '../types/ai.types';

/**
 * Derives the whitelisted page context the assistant is allowed to receive.
 *
 * Deliberately only { pageType, entityId } — never page state, form values or
 * loaded records. The server rejects anything else (aiValidator.js uses a strict
 * schema), so widening this would fail loudly rather than leak silently.
 */
export function usePageContext(): PageContext | undefined {
  const { pathname } = useLocation();
  const params = useParams();

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return undefined;

    const entityId = params.id;
    const pageType = entityId ? `${segments[0]}-detail` : segments[0];

    return { pageType, ...(entityId ? { entityId } : {}) };
  }, [pathname, params.id]);
}
