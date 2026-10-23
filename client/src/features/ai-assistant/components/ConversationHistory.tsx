import { Chat, Trash } from '@phosphor-icons/react';
import { useConversations } from '../hooks/useConversations';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenConversation: (id: string) => void;
}

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

/**
 * Past threads, so a question asked yesterday can be picked back up.
 *
 * Threads expire server-side after 30 days — transcripts are not retained
 * indefinitely — so this list is deliberately short-lived rather than an
 * archive.
 */
export default function ConversationHistory({ open, onOpenConversation }: Props) {
  const { items, loading, error, remove } = useConversations(open);

  if (!open) return null;

  if (loading) {
    return <p className="px-1 py-4 text-center text-xs text-muted-foreground">Loading…</p>;
  }

  if (error) {
    return <p className="px-1 py-4 text-center text-xs text-destructive">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
        No past conversations yet. They appear here once you ask something.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((conversation) => (
        <li key={conversation._id} className="group flex items-center gap-1">
          <Button variant="plain"
            type="button"
            onClick={() => onOpenConversation(conversation._id)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Chat size={13} className="shrink-0 text-muted-foreground/70" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground/80">
                {conversation.title}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {relativeTime(conversation.lastActivityAt)}
              </span>
            </span>
          </Button>

          <Button variant="plain"
            type="button"
            onClick={() => remove(conversation._id)}
            aria-label={`Delete conversation: ${conversation.title}`}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground/70 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          >
            <Trash size={13} />
          </Button>
        </li>
      ))}
    </ul>
  );
}
