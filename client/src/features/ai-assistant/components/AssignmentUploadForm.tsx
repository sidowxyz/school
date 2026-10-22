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
    <form onSubmit={submit} className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <MagnifyingGlass size={14} className="text-green-600" />
          UploadSimple a student assignment for review
        </p>
        <Button variant="plain"
          type="button"
          onClick={onCancel}
          className="rounded p-0.5 text-gray-400 hover:text-gray-600"
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
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <Input
        value={assignmentTitle}
        onChange={(e) => setAssignmentTitle(e.target.value)}
        placeholder="Assignment title (optional)"
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <Textarea
        value={rubric}
        onChange={(e) => setRubric(e.target.value)}
        placeholder="Marking criteria / rubric (optional, improves the feedback)"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
      />

      <Button variant="plain"
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white py-3 text-xs font-medium text-gray-500 hover:border-green-400 hover:text-green-700"
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
        className="w-full rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Reviewing…' : 'Review assignment'}
      </Button>
    </form>
  );
}
