import { ReactNode } from 'react';
import { Label } from './label';

export function FormField({ label, htmlFor, hint, error, children }: { label: string; htmlFor?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-[var(--school-muted)]">{hint}</p> : null}
    </div>
  );
}
