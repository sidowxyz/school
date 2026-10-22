import { Warning, Check, X } from '@phosphor-icons/react';
import type { ChatTurn } from '../types/ai.types';
import { Button } from '@/components/ui/button';

interface Props {
  confirmation: NonNullable<ChatTurn['confirmation']>;
  onConfirm: () => void;
  onCancel: () => void;
}

const formatDetailKey = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const formatDetailValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

/**
 * Shows exactly what will happen before anything happens.
 *
 * Everything rendered here came from the server's buildPreview() reading live
 * data — not from the model — so the user is approving the real action, not a
 * description of it. Confirming posts to a dedicated endpoint; the assistant
 * cannot proceed on its own.
 */
export default function ConfirmationCard({ confirmation, onConfirm, onCancel }: Props) {
  const { preview, state } = confirmation;
  const settled = state === 'confirmed' || state === 'cancelled';
  const busy = state === 'confirming';

  return (
    <div
      className={`rounded-xl border ${
        settled ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50'
      } p-3`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
            state === 'confirmed'
              ? 'bg-green-100 text-green-700'
              : state === 'cancelled'
                ? 'bg-gray-200 text-gray-500'
                : 'bg-amber-100 text-amber-700'
          }`}
          aria-hidden="true"
        >
          {state === 'confirmed' ? <Check size={13} /> : state === 'cancelled' ? <X size={13} /> : <Warning size={13} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{preview.title}</p>
          <p className="mt-0.5 text-xs text-gray-600">{preview.summary}</p>

          {preview.impact && !settled && (
            <p className="mt-2 inline-block rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              {preview.impact}
            </p>
          )}

          {Object.keys(preview.details ?? {}).length > 0 && (
            <dl className="mt-2.5 space-y-1">
              {Object.entries(preview.details).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <dt className="w-32 shrink-0 text-gray-400">{formatDetailKey(key)}</dt>
                  <dd className="min-w-0 flex-1 break-words text-gray-700">
                    {formatDetailValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {state === 'awaiting' || busy ? (
            <div className="mt-3 flex items-center gap-2">
              <Button variant="plain"
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {busy ? 'Working…' : 'Confirm'}
              </Button>
              <Button variant="plain"
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="mt-2.5 text-xs font-medium text-gray-500">
              {state === 'confirmed' ? 'Done.' : 'Cancelled — nothing was changed.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
