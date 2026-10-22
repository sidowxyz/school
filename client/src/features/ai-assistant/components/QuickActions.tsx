import type { QuickAction } from '../types/ai.types';
import { Button } from '@/components/ui/button';

interface Props {
  actions: QuickAction[];
  disabled: boolean;
  onRun: (action: QuickAction) => void;
}

/**
 * Role-aware shortcuts, laid out as a single wrapping row.
 *
 * Previously these were stacked in labelled vertical sections, which pushed
 * most of the list below the fold in a 420px panel. A flat wrap fits roughly
 * three times as many in the same height; the group name moves into each
 * chip's tooltip rather than costing a heading line each.
 *
 * The list comes from the server's registry, so a user only ever sees actions
 * their role can run — and clicking one posts to the same endpoint a typed
 * question would.
 */
export default function QuickActions({ actions, disabled, onRun }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Ask a question, or start with one of these:</p>

      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <Button variant="plain"
            key={action.tool}
            type="button"
            disabled={disabled}
            onClick={() => onRun(action)}
            title={`${action.group}${action.prompt ? ' — needs a detail from you' : ''}`}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            {action.label}
            {/* Signals that this one opens the composer rather than running
                immediately, so a click that "does nothing" is not a surprise. */}
            {action.prompt && <span className="ml-1 text-gray-300">…</span>}
          </Button>
        ))}
      </div>
    </div>
  );
}
