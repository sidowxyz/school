import { useRef, useState } from 'react';
import { UploadSimple, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  busy: boolean;
  onSubmit: (
    file: File,
    meta: { studentQuery: string; assignmentTitle?: string; rubric?: string }
  ) => void;
  onCancel: () => void;
}

const ACCEPTED = '.pdf,.docx,.txt';

/**
 * The student is looked up by name or admission number rather than picked
 * from a dropdown — building a searchable student-select control was more
 * frontend than this feature needed, and typing a name is no slower. The
 * server requires an exact single match and says so if the query is
 * ambiguous, rather than guessing which student was meant.
 */
export default function AssignmentUploadForm({ busy, onSubmit, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [rubric, setRubric] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = file && studentQuery.trim().length >= 2 && !busy;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !file) return;
    onSubmit(file, {
      studentQuery: studentQuery.trim(),
      assignmentTitle: assignmentTitle.trim() || undefined,
      rubric: rubric.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2.5 rounded-xl border border-border bg-muted/50 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
          <MagnifyingGlass size={14} className="text-primary" />
          Upload a student assignment for review
        </p>
        <Button variant="plain"
          type="button"
          onClick={onCancel}
          className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground"
        >
          <X size={14} />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>

      <Input
        value={studentQuery}
        onChange={(e) => setStudentQuery(e.target.value)}
        placeholder="Student name or admission number"
        required
        className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      <Input
        value={assignmentTitle}
        onChange={(e) => setAssignmentTitle(e.target.value)}
        placeholder="Assignment title (optional)"
        className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      <Textarea
        value={rubric}
        onChange={(e) => setRubric(e.target.value)}
        placeholder="Marking criteria / rubric (optional, improves the feedback)"
        rows={2}
        className="w-full resize-none rounded-lg border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
      />

      <Button variant="plain"
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card py-3 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        <UploadSimple size={14} />
        {file ? file.name : 'Choose a .pdf, .docx, or .txt file'}
      </Button>
      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <Button variant="plain"
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Reviewing…' : 'Review assignment'}
      </Button>
    </form>
  );
}
