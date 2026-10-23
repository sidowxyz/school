import { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

/**
 * Renders a tool result as stat tiles and tables rather than prose.
 *
 * The server returns each tool's own shape, so this maps the handful of shapes
 * Phase 1 actually produces and falls back to a compact key/value view for
 * anything else. It deliberately does not try to render arbitrary nested JSON —
 * an unreadable auto-table would be worse than a clear summary line.
 */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const titleCase = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString();
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') {
    // ISO date → readable date
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return new Date(v).toLocaleDateString();
    return v;
  }
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? '' : 's'}`;
  if (isRecord(v)) {
    const named = v.name ?? v.title ?? v.label ?? v.cl_name ?? v.sub_name;
    if (typeof named === 'string') return named;
    return '—';
  }
  return String(v);
};

function StatTile({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{formatValue(value)}</p>
    </div>
  );
}

function StatGrid({ data }: { data: Record<string, unknown> }) {
  const scalars = Object.entries(data).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean'
  );
  if (scalars.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {scalars.map(([k, v]) => (
        <StatTile key={k} label={titleCase(k)} value={v} />
      ))}
    </div>
  );
}

const MAX_ROWS = 8;
const MAX_COLS = 5;

function RecordTable({ rows, caption }: { rows: Record<string, unknown>[]; caption?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) return <EmptyResult />;

  // Prefer human-meaningful columns; skip ids and internals.
  const skip = /^(_id|id|__v|isDeleted|createdAt|updatedAt|password|refreshToken)$/i;
  const columns = Object.keys(rows[0])
    .filter((k) => !skip.test(k))
    .filter((k) => {
      const v = rows[0][k];
      return v === null || typeof v !== 'object' || isRecord(v);
    })
    .slice(0, MAX_COLS);

  const visible = expanded ? rows : rows.slice(0, MAX_ROWS);

  return (
    <div>
      {caption && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{caption}</p>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className="w-full text-left text-xs">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((c) => (
                <TableHead
                  key={c}
                  scope="col"
                  className="whitespace-nowrap px-2.5 py-2 font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {titleCase(c)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, i) => (
              <TableRow key={i} className="border-t border-border">
                {columns.map((c) => (
                  <TableCell key={c} className="whitespace-nowrap px-2.5 py-2 text-foreground/80">
                    {formatValue(row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > MAX_ROWS && (
        <Button variant="plain"
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 text-xs font-medium text-primary hover:text-primary"
        >
          {expanded ? 'Show less' : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
  );
}

/** Arrays of records anywhere in the payload become tables. */
function TableSections({ data }: { data: Record<string, unknown> }) {
  const tables = Object.entries(data).filter(
    ([, v]) => Array.isArray(v) && v.length > 0 && isRecord(v[0])
  ) as [string, Record<string, unknown>[]][];

  if (tables.length === 0) return null;

  return (
    <div className="space-y-3">
      {tables.map(([key, rows]) => (
        <RecordTable key={key} rows={rows} caption={titleCase(key)} />
      ))}
    </div>
  );
}

/**
 * An empty result is a real answer, not a failure. Several tools legitimately
 * return nothing — no attendance taken yet today, no overdue books — and a bare
 * "No results." reads like something broke.
 */
function EmptyResult() {
  return (
    <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      Nothing to show — there are no records matching that yet.
    </p>
  );
}

export default function ResultRenderer({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) return <EmptyResult />;
    return isRecord(data[0]) ? (
      <RecordTable rows={data as Record<string, unknown>[]} />
    ) : (
      <p className="text-sm text-muted-foreground">{data.map(formatValue).join(', ')}</p>
    );
  }

  if (!isRecord(data)) {
    return <p className="text-sm text-foreground/80">{formatValue(data)}</p>;
  }

  // Nested summary objects (e.g. { summary: {...}, totals: {...} }) read better
  // flattened into one tile grid than as separate sections.
  const nestedScalarGroups = Object.entries(data).filter(
    ([, v]) => isRecord(v) && Object.values(v).some((x) => typeof x === 'number')
  ) as [string, Record<string, unknown>][];

  const merged: Record<string, unknown> = { ...data };
  for (const [key, group] of nestedScalarGroups) {
    delete merged[key];
    for (const [k, v] of Object.entries(group)) {
      if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
        merged[k] = v;
      }
    }
  }

  return (
    <div className="space-y-3">
      <StatGrid data={merged} />
      <TableSections data={data} />
    </div>
  );
}
