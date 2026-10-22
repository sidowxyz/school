import { WarningCircle, FileText, Sparkle } from '@phosphor-icons/react';
import type { ChatTurn, QuickAction } from '../types/ai.types';
import ResultRenderer from './ResultRenderer';
import ConfirmationCard from './ConfirmationCard';
import ExamUploadReviewCard from './ExamUploadReviewCard';
import AssignmentReviewCard from './AssignmentReviewCard';
import { Button } from '@/components/ui/button';

interface Props {
  turn: ChatTurn;
  onSuggestion: (action: QuickAction) => void;
  onConfirm: (turnId: string, actionId: string) => void;
  onCancel: (turnId: string, actionId: string) => void;
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" role="status" aria-label="Thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** Bytes as a short human label — 1 decimal only where it adds information. */
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * The uploaded file, shown as an attachment rather than described in prose.
 * `break-all` on the name because uploaded filenames are frequently long and
 * unspaced, and a normal wrap would overflow the bubble instead of breaking.
 */
function AttachmentChip({ attachment }: { attachment: NonNullable<ChatTurn['attachment']> }) {
  return (
    <span className="flex items-center gap-2 rounded-lg bg-green-700/40 px-2 py-1.5 text-left">
      <FileText size={15} className="shrink-0 text-white/90" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block break-all text-xs font-medium leading-snug text-white">
          {attachment.name}
        </span>
        <span className="block text-[11px] text-white/70">
          {formatSize(attachment.sizeBytes)}
        </span>
      </span>
    </span>
  );
}

export default function ChatMessage({ turn, onSuggestion, onConfirm, onCancel }: Props) {
  if (turn.author === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-1.5 rounded-xl rounded-br-sm bg-green-600 px-3 py-2">
          {turn.attachment && <AttachmentChip attachment={turn.attachment} />}
          {turn.text && <p className="text-sm text-white">{turn.text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
          turn.error ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
        }`}
        aria-hidden="true"
      >
        {turn.error ? <WarningCircle size={13} /> : <Sparkle size={13} />}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        {turn.pending ? (
          <TypingDots />
        ) : (
          <>
            {turn.text && (
              // whitespace-pre-line so follow-up questions can put their
              // example on its own line instead of running into the question.
              <p
                className={`whitespace-pre-line text-sm ${
                  turn.error ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {turn.text}
              </p>
            )}

            {turn.confirmation && (
              <ConfirmationCard
                confirmation={turn.confirmation}
                onConfirm={() => onConfirm(turn.id, turn.confirmation!.actionId)}
                onCancel={() => onCancel(turn.id, turn.confirmation!.actionId)}
              />
            )}

            {turn.upload?.kind === 'exam' && <ExamUploadReviewCard result={turn.upload.data} />}
            {turn.upload?.kind === 'assignment' && (
              <AssignmentReviewCard result={turn.upload.data} />
            )}

            {turn.data !== undefined && <ResultRenderer data={turn.data} />}

            {turn.suggestions && turn.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {turn.suggestions.map((s) => (
                  <Button variant="plain"
                    key={s.tool}
                    type="button"
                    onClick={() => onSuggestion(s)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
