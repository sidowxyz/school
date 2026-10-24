import { useEffect, useState } from 'react';
import { FloppyDisk, SpinnerGap, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCan } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { monthlyFeesApi, apiError } from '../api/monthlyFeesApi';
import { money, type ClassFee } from '../monthlyTypes';

/** Setup → the monthly fee each class (grade) pays. */
export default function ClassFeesPanel() {
  const canEdit = useCan('fees-setup', 'edit');
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = () => monthlyFeesApi.getClassFees().then((list) => {
    setClasses(list);
    setDrafts(Object.fromEntries(list.map((c) => [c._id, c.monthly_fee === null ? '' : String(c.monthly_fee)])));
  }).catch((err) => showToast(apiError(err, 'Could not load classes.'), 'error')).finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const save = async (c: ClassFee) => {
    const amount = Number(drafts[c._id]);
    if (drafts[c._id] === '' || Number.isNaN(amount) || amount < 0) { showToast('Enter a monthly fee of 0 or more.', 'error'); return; }
    setSaving(c._id);
    try {
      await monthlyFeesApi.setClassFee(c._id, amount);
      setSaved(c._id);
      setTimeout(() => setSaved((s) => (s === c._id ? null : s)), 2000);
      await load();
    } catch (err) {
      showToast(apiError(err, 'Could not save the fee.'), 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Monthly fee per class</CardTitle>
        <CardDescription className="text-xs">
          Every active student is charged their class’s fee on the 1st of each month (sibling, scholarship and personal discounts are taken off automatically).
          A new amount applies from the next month charged; months already charged keep their amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="w-56">Monthly fee</TableHead>
              <TableHead className="text-right">Per month (all students)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || classes.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading classes…' : 'No classes yet. Add classes under Academic Structure first.'}
                </TableCell>
              </TableRow>
            )}
            {classes.map((c) => {
              const dirty = drafts[c._id] !== (c.monthly_fee === null ? '' : String(c.monthly_fee));
              return (
                <TableRow key={c._id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.level}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.students}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save(c); }}>
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <Input type="number" min={0} step="0.01" value={drafts[c._id] ?? ''} placeholder="Not set"
                            onChange={(e) => setDrafts((d) => ({ ...d, [c._id]: e.target.value }))}
                            className="h-9 pl-6 tabular-nums" aria-label={`Monthly fee for ${c.name}`} />
                        </div>
                        {dirty && (
                          <Button type="submit" size="sm" disabled={saving === c._id} className="h-9 gap-1.5">
                            {saving === c._id ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />} Save
                          </Button>
                        )}
                        {saved === c._id && !dirty && <Check size={16} className="text-success" aria-label="Saved" />}
                      </form>
                    ) : (
                      <span className="tabular-nums">{c.monthly_fee === null ? <span className="text-muted-foreground">Not set</span> : money(c.monthly_fee)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.monthly_fee === null ? '—' : money(c.monthly_fee * c.students)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
