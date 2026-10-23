import { Eye, Info } from '@phosphor-icons/react';
import type { AssignmentReviewResult } from '../types/ai.types';

/**
 * Deliberately no percentage or verdict anywhere in this component — see
 * utils/writingStyleSignals.js server-side for why. Signals are shown as
 * named, individually-readable indicators, always alongside the disclaimer.
 */
export default function AssignmentReviewCard({ result }: { result: AssignmentReviewResult }) {
  const { writingIntegrity } = result;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-foreground">{result.student.name}</p>
        <p className="text-[11px] text-muted-foreground">{result.wordCount} words</p>
      </div>
      {result.assignmentTitle && <p className="text-xs text-muted-foreground">{result.assignmentTitle}</p>}

      <div
        className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
          writingIntegrity.reviewRecommended
            ? 'border-warning/20 bg-warning/10 text-warning'
            : 'border-border bg-muted/50 text-muted-foreground'
        }`}
      >
        <Eye size={14} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">
            {writingIntegrity.reviewRecommended ? 'Review recommended' : 'No notable indicators'}
          </p>
          {writingIntegrity.signals.map((s, i) => (
            <p key={i} className="mt-1">
              {s.detail}
            </p>
          ))}
          {writingIntegrity.comparedAgainstSubmissions > 0 && (
            <p className="mt-1 text-[11px] opacity-75">
              Compared against {writingIntegrity.comparedAgainstSubmissions} earlier submission
              {writingIntegrity.comparedAgainstSubmissions === 1 ? '' : 's'} from this student.
            </p>
          )}
        </div>
      </div>

      {result.feedback ? (
        <div className="space-y-2">
          {result.feedback.strengths.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Doing well
              </p>
              <ul className="mt-0.5 list-inside list-disc text-xs text-muted-foreground">
                {result.feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.feedback.weaknesses.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-warning">
                Needs work
              </p>
              <ul className="mt-0.5 list-inside list-disc text-xs text-muted-foreground">
                {result.feedback.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.feedback.focusAreas.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested focus
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{result.feedback.focusAreas.join(', ')}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Draft feedback for the student
            </p>
            <p className="mt-0.5 rounded-lg bg-muted/50 p-2 text-xs text-foreground/80">
              {result.feedback.suggestedFeedback}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Concept-level feedback isn't available right now — no AI provider key is configured, or
          it's temporarily unavailable. The writing-integrity check above still ran without one.
        </p>
      )}

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info size={12} className="mt-0.5 shrink-0" />
        {result.disclaimer}
      </p>
    </div>
  );
}
