import { Warning, CheckCircle } from '@phosphor-icons/react';
import type { ExamUploadReviewResult } from '../types/ai.types';

const SEVERITY_STYLE: Record<string, string> = {
  high: 'text-red-700 bg-red-50 border-red-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-gray-600 bg-gray-50 border-gray-200',
};

export default function ExamUploadReviewCard({ result }: { result: ExamUploadReviewResult }) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-3">
      <div
        className={`flex items-start gap-2 rounded-lg border p-2.5 ${
          result.redoRecommended
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-green-200 bg-green-50 text-green-800'
        }`}
      >
        {result.redoRecommended ? (
          <Warning size={15} className="mt-0.5 shrink-0" />
        ) : (
          <CheckCircle size={15} className="mt-0.5 shrink-0" />
        )}
        <div className="text-xs">
          <p className="font-semibold">
            {result.redoRecommended ? 'Recommend redoing this paper' : 'Originality looks fine'}
          </p>
          <p className="mt-0.5">
            {result.redoReason ??
              `${result.repeatedFromArchivePercent}% of questions match earlier papers (below the ${result.redoThresholdPercent}% threshold).`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 py-2">
          <p className="text-base font-semibold text-gray-900">{result.questionsDetected}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Questions</p>
        </div>
        <div className="rounded-lg bg-gray-50 py-2">
          <p className="text-base font-semibold text-gray-900">
            {result.quality.totalMarks}
            {result.quality.expectedTotalMarks ? ` / ${result.quality.expectedTotalMarks}` : ''}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Marks</p>
        </div>
        <div className="rounded-lg bg-gray-50 py-2">
          <p
            className={`text-base font-semibold ${
              result.quality.structureValid ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {result.quality.structureValid ? 'Valid' : 'Issues'}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Structure</p>
        </div>
      </div>

      {result.quality.issues.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Structural issues
          </p>
          {result.quality.issues.map((issue, i) => (
            <p
              key={i}
              className={`rounded-lg border px-2 py-1.5 text-xs ${SEVERITY_STYLE[issue.severity]}`}
            >
              {issue.message}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Grammar &amp; clarity
        </p>
        {!result.grammar.available ? (
          <p className="text-xs text-gray-400">
            {result.grammar.note ?? 'Not available — no AI provider key is configured.'}
          </p>
        ) : result.grammar.issues.length === 0 ? (
          <p className="text-xs text-gray-500">No issues found.</p>
        ) : (
          result.grammar.issues.map((issue, i) => (
            <p key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              <span className="font-semibold">Q{issue.questionNumber}:</span> "{issue.quote}" —{' '}
              {issue.suggestion}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
