import { useRef, useState } from 'react';
import { FileText, UploadSimple, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  busy: boolean;
  onSubmit: (file: File, meta: { subjectName?: string; expectedTotalMarks?: number }) => void;
  onCancel: () => void;
}

const ACCEPTED = '.pdf,.docx,.txt';

/**
 * Subject and expected marks are both optional — the review still runs
 * without them, just without narrowing originality checks to one subject and
 * without a mark-total mismatch check. Nothing here is required to make the
 * UploadSimple useful; it only sharpens it.
 */
export default function ExamUploadForm({ busy, onSubmit, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [expectedTotalMarks, setExpectedTotalMarks] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || busy) return;
    onSubmit(file, {
      subjectName: subjectName.trim() || undefined,
      expectedTotalMarks: expectedTotalMarks ? Number(expectedTotalMarks) : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <FileText size={14} className="text-green-600" />
          UploadSimple an exam paper for review
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

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="Subject (optional)"
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
        />
        <Input
          value={expectedTotalMarks}
          onChange={(e) => setExpectedTotalMarks(e.target.value.replace(/\D/g, ''))}
          placeholder="Total marks (optional)"
          inputMode="numeric"
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
        />
      </div>

      <Button variant="plain"
        type="submit"
        disabled={!file || busy}
        className="w-full rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Reviewing…' : 'Review paper'}
      </Button>
    </form>
  );
}
