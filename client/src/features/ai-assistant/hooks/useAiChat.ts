import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { aiApi, type AssignmentUploadMeta } from '../api/aiApi';
import type { ChatTurn, PageContext, QuickAction } from '../types/ai.types';


let turnSeq = 0;
const nextId = () => `turn-${++turnSeq}`;

const errorText = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;

    if (err.response?.status === 403) {
      return 'That action is not available for your role.';
    }

    // A 429 is either this server's own rate limit or the AI provider's quota,
    // which are different problems with different fixes. The server explains
    // which, so prefer its message and only fall back to the generic one.
    if (err.response?.status === 429) {
      return msg ?? 'Too many requests just now. Please wait a few minutes and try again.';
    }

    if (msg) return msg;
  }
  return 'Something went wrong reaching the assistant. Please try again.';
};

/**
 * Owns one assistant conversation.
 *
 * Quick actions and typed questions both funnel through `send`, which posts to
 * the same endpoint — matching the server, where a button and a sentence
 * resolve to the same registry entry. There is no separate button code path.
 */
export function useAiChat(pageContext?: PageContext) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    aiApi
      .quickActions()
      .then((actions) => {
        if (mounted.current) setQuickActions(actions);
      })
      .catch(() => {
        /* A failure here only costs the shortcut row; chat still works. */
      });
  }, []);

  const send = useCallback(
    async ({ message, tool, label }: { message?: string; tool?: string; label?: string }) => {
      if (busy) return;
      const prompt = message ?? label ?? tool ?? '';

      const userTurn: ChatTurn = { id: nextId(), author: 'user', text: prompt };
      const pendingTurn: ChatTurn = { id: nextId(), author: 'assistant', text: '', pending: true };
      setTurns((t) => [...t, userTurn, pendingTurn]);
      setBusy(true);

      try {
        const res = await aiApi.chat({
          message,
          tool,
          conversationId: conversationId.current,
          pageContext,
        });
        // Never store a null id — the API only accepts a string or an absent
        // field, so resending null would 400 the very next request.
        conversationId.current = res.conversationId ?? undefined;
        if (!mounted.current) return;

        setLlmAvailable(res.llmAvailable);
        setTurns((t) =>
          t.map((turn) => {
            if (turn.id !== pendingTurn.id) return turn;

            const base = { ...turn, pending: false, tool: res.tool };

            if (res.type === 'confirmation_required') {
              return {
                ...base,
                text: '',
                confirmation: {
                  actionId: res.actionId,
                  preview: res.preview,
                  expiresAt: res.expiresAt,
                  state: 'awaiting' as const,
                },
              };
            }

            if (res.type === 'needs_input') {
              // Not an error — the assistant is mid-conversation, so show the
              // question plainly and hint at the shape of a good answer.
              const hint = res.missing.map((m) => `${m.label} (e.g. ${m.example})`).join(', ');
              return { ...base, text: `${res.text}\n\nFor example: ${hint}` };
            }

            if (res.type === 'text') {
              return { ...base, text: res.text, suggestions: res.suggestions };
            }

            return { ...base, text: res.text ?? '', data: res.data };
          })
        );
      } catch (err) {
        if (!mounted.current) return;
        setTurns((t) =>
          t.map((turn) =>
            turn.id === pendingTurn.id
              ? { ...turn, pending: false, error: true, text: errorText(err) }
              : turn
          )
        );
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [busy, pageContext]
  );

  const setConfirmationState = (
    turnId: string,
    state: NonNullable<ChatTurn['confirmation']>['state']
  ) =>
    setTurns((t) =>
      t.map((turn) =>
        turn.id === turnId && turn.confirmation
          ? { ...turn, confirmation: { ...turn.confirmation, state } }
          : turn
      )
    );

  /**
   * Executes a prepared action. Deliberately its own request against the
   * server-stored action id — the assistant never self-confirms.
   */
  const confirm = useCallback(async (turnId: string, actionId: string) => {
    setConfirmationState(turnId, 'confirming');
    try {
      const res = await aiApi.confirmAction(actionId);
      if (!mounted.current) return;
      setConfirmationState(turnId, 'confirmed');
      setTurns((t) => [
        ...t,
        { id: nextId(), author: 'assistant', text: 'Done.', tool: res.tool, data: res.data },
      ]);
    } catch (err) {
      if (!mounted.current) return;
      setConfirmationState(turnId, 'awaiting');
      setTurns((t) => [
        ...t,
        { id: nextId(), author: 'assistant', text: errorText(err), error: true },
      ]);
    }
  }, []);

  const cancel = useCallback(async (turnId: string, actionId: string) => {
    setConfirmationState(turnId, 'cancelled');
    try {
      await aiApi.cancelAction(actionId);
    } catch {
      /* The action expires on its own; a failed cancel is not worth surfacing. */
    }
  }, []);

  /**
   * Uploads share the send() turn-management shape (push user + pending turn,
   * fill in on success/failure) but call a different endpoint entirely — the
   * upload routes bypass /api/ai/chat and its conversation persistence, since
   * a multipart file doesn't fit that JSON shape. A review therefore doesn't
   * appear in "past conversations" history; it exists only for this session.
   */
  const runUpload = useCallback(
    async <TResult>(
      label: string,
      attachment: ChatTurn['attachment'],
      call: () => Promise<TResult>,
      toTurn: (result: TResult) => Partial<ChatTurn>
    ) => {
      if (busy) return;
      const userTurn: ChatTurn = { id: nextId(), author: 'user', text: label, attachment };
      const pendingTurn: ChatTurn = { id: nextId(), author: 'assistant', text: '', pending: true };
      setTurns((t) => [...t, userTurn, pendingTurn]);
      setBusy(true);

      try {
        const result = await call();
        if (!mounted.current) return;
        setTurns((t) =>
          t.map((turn) =>
            turn.id === pendingTurn.id ? { ...turn, pending: false, ...toTurn(result) } : turn
          )
        );
      } catch (err) {
        if (!mounted.current) return;
        setTurns((t) =>
          t.map((turn) =>
            turn.id === pendingTurn.id
              ? { ...turn, pending: false, error: true, text: errorText(err) }
              : turn
          )
        );
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [busy]
  );

  // The filename moves out of the sentence and onto the attachment chip, so it
  // stays readable when it is long and doesn't get truncated mid-name by the
  // bubble's max width.
  const uploadAssignment = useCallback(
    (file: File, meta: AssignmentUploadMeta) =>
      runUpload(
        'Sent for assignment review',
        { name: file.name, sizeBytes: file.size, kind: 'assignment' },
        () => aiApi.reviewAssignmentUpload(file, meta),
        (data) => ({ text: '', upload: { kind: 'assignment', data } })
      ),
    [runUpload]
  );

  const reset = useCallback(() => {
    conversationId.current = undefined;
    setTurns([]);
  }, []);

  /**
   * Reopen a stored thread and continue it.
   *
   * Only the recent turns survive server-side — older ones are folded into a
   * rolling summary to keep context bounded — so this restores the tail of the
   * conversation, not all of it. Structured tool results are not persisted
   * either, so reopened turns show the text rather than the original tables.
   */
  const openConversation = useCallback(async (id: string) => {
    setBusy(true);
    try {
      const stored = await aiApi.conversation(id);
      if (!mounted.current) return;

      conversationId.current = stored._id;
      setTurns(
        stored.messages.map((message) => ({
          id: nextId(),
          author: message.role,
          text: message.content,
          tool: message.tool,
        }))
      );
    } catch (err) {
      if (!mounted.current) return;
      setTurns([{ id: nextId(), author: 'assistant', text: errorText(err), error: true }]);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, []);

  return {
    turns,
    quickActions,
    busy,
    llmAvailable,
    send,
    reset,
    confirm,
    cancel,
    openConversation,
    uploadAssignment,
  };
}
