import { useEffect, useRef, useState } from 'react';
import { FileText, ClockCounterClockwise, ArrowCounterClockwise, PaperPlaneRight, Sparkle, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useAiChat } from '../hooks/useAiChat';
import { usePageContext } from '../hooks/usePageContext';
import { useAuth } from '../../../hooks/useAuth';
import type { QuickAction } from '../types/ai.types';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';
import ConversationHistory from './ConversationHistory';
import ExamUploadForm from './ExamUploadForm';
import AssignmentUploadForm from './AssignmentUploadForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Mirrors the server's role gates for the two UploadSimple routes (aiUploadService.js).
// Purely a UI convenience — the server remains the actual authority, so a stale
// or wrong list here only ever hides a button, never grants access.
const UPLOAD_ROLES = ['admin', 'principal', 'academic_officer', 'teacher'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AIAssistantPanel({ open, onClose }: Props) {
  const pageContext = usePageContext();
  const {
    turns,
    quickActions,
    busy,
    llmAvailable,
    PaperPlaneRight,
    reset,
    confirm,
    cancel,
    openConversation,
    uploadExam,
    uploadAssignment,
  } = useAiChat(pageContext);
  const { role } = useAuth();
  const canUpload = Boolean(role && UPLOAD_ROLES.includes(role));
  const [draft, setDraft] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [activeForm, setActiveForm] = useState<'exam' | 'assignment' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape, matching the dropdown behaviour elsewhere in the shell.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft('');
    void send({ message });
  };

  /**
   * Some tools need a detail a button cannot supply — the question text to
   * check, the subject of an announcement. Firing those with no arguments
   * produced a raw schema error ("text: Required"), so instead the composer
   * opens seeded with the action's prompt and the user finishes the sentence.
   */
  const runAction = (action: QuickAction) => {
    if (action.prompt) {
      setDraft(action.prompt);
      inputRef.current?.focus();
      return;
    }
    void send({ tool: action.tool, label: action.label });
  };

  return (
    <>
      {/* Scrim — mobile only; on desktop the panel sits beside the content. */}
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="School assistant"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-gray-200 bg-white shadow-xl sm:w-[420px]"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-white">
              <Sparkle size={14} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">School Assistant</p>
              <p className="text-[11px] text-gray-400">
                {llmAvailable === false ? 'Structured results' : 'Reads live Buildings data'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="plain"
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              title={showHistory ? 'Back to chat' : 'Past conversations'}
              aria-pressed={showHistory}
              className={`rounded-lg p-1.5 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                showHistory ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ClockCounterClockwise size={15} />
              <span className="sr-only">{showHistory ? 'Back to chat' : 'Past conversations'}</span>
            </Button>

            {turns.length > 0 && (
              <Button variant="plain"
                type="button"
                onClick={() => {
                  reset();
                  setShowHistory(false);
                }}
                title="Start a new conversation"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                <ArrowCounterClockwise size={15} />
                <span className="sr-only">Start a new conversation</span>
              </Button>
            )}
            <Button variant="plain"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <X size={16} />
              <span className="sr-only">Close assistant</span>
            </Button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {showHistory ? (
            <ConversationHistory
              open={showHistory}
              onOpenConversation={(id) => {
                setShowHistory(false);
                void openConversation(id);
              }}
            />
          ) : (
            <>
              {turns.length === 0 && !activeForm && (
                <QuickActions actions={quickActions} disabled={busy} onRun={runAction} />
              )}
              {turns.map((turn) => (
                <ChatMessage
                  key={turn.id}
                  turn={turn}
                  onSuggestion={runAction}
                  onConfirm={confirm}
                  onCancel={cancel}
                />
              ))}
              {activeForm === 'exam' && (
                <ExamUploadForm
                  busy={busy}
                  onCancel={() => setActiveForm(null)}
                  onSubmit={(file, meta) => {
                    setActiveForm(null);
                    void uploadExam(file, meta);
                  }}
                />
              )}
              {activeForm === 'assignment' && (
                <AssignmentUploadForm
                  busy={busy}
                  onCancel={() => setActiveForm(null)}
                  onSubmit={(file, meta) => {
                    setActiveForm(null);
                    void uploadAssignment(file, meta);
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Composer and UploadSimple shortcuts are hidden while browsing ClockCounterClockwise or
            filling in an UploadSimple form — there is nothing to PaperPlaneRight to either way. */}
        {!showHistory && !activeForm && (
          <div className="border-t border-gray-100">
            {canUpload && (
              <div className="flex gap-2 px-3 pt-2">
                <Button variant="plain"
                  type="button"
                  onClick={() => setActiveForm('exam')}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <FileText size={12} />
                  UploadSimple exam
                </Button>
                <Button variant="plain"
                  type="button"
                  onClick={() => setActiveForm('assignment')}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <MagnifyingGlass size={12} />
                  UploadSimple assignment
                </Button>
              </div>
            )}
            <form onSubmit={submit} className="p-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask about attendance, fees, students…"
                  aria-label="Ask the assistant"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                />
                <Button variant="plain"
                  type="submit"
                  disabled={busy || draft.trim().length === 0}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  <PaperPlaneRight size={15} />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
