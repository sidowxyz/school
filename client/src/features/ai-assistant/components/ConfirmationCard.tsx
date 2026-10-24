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
        settled ? 'border-border bg-muted/50' : 'border-warning/20 bg-warning/10'
      } p-3`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
            state === 'confirmed'
              ? 'bg-primary/15 text-primary'
              : state === 'cancelled'
                ? 'bg-muted text-muted-foreground'
                : 'bg-warning/15 text-warning'
          }`}
          aria-hidden="true"
        >
          {state === 'confirmed' ? <Check size={13} /> : state === 'cancelled' ? <X size={13} /> : <Warning size={13} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{preview.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{preview.summary}</p>

          {preview.impact && !settled && (
            <p className="mt-2 inline-block rounded-lg bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">
              {preview.impact}
            </p>
          )}

          {Object.keys(preview.details ?? {}).length > 0 && (
            <dl className="mt-2.5 space-y-1">
              {Object.entries(preview.details).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <dt className="w-32 shrink-0 text-muted-foreground">{formatDetailKey(key)}</dt>
                  <dd className="min-w-0 flex-1 break-words text-foreground/80">
                    {formatDetailValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {state === 'awaiting' || busy ? (
            <div className="mt-3 flex items-center gap-2">
              <Button variant="default" size="xs"
                type="button"
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? 'Working…' : 'Confirm'}
              </Button>
              <Button variant="outline" size="xs"
                type="button"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="mt-2.5 text-xs font-medium text-muted-foreground">
              {state === 'confirmed' ? 'Done.' : 'Cancelled — nothing was changed.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
