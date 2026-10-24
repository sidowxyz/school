import { useState, type FormEvent } from 'react';
import { Check, PencilSimple, Plus, SpinnerGap, Trash, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCan } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { financeApi } from '../api/financeApi';
import { apiError } from '../api/monthlyFeesApi';
import type { PaymentMethod } from '../types';

/** Setup → the ways a family can pay (Cash, EVC Plus, bank transfer, …). */
export default function PaymentMethodsPanel({ methods, onChanged }: { methods: PaymentMethod[]; onChanged: () => void }) {
  const canEdit = useCan('fees-setup', 'edit');
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, task: () => Promise<unknown>, failure: string) => {
    setBusy(key);
    try {
      await task();
      onChanged();
      return true;
    } catch (err) {
      showToast(apiError(err, failure), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (methods.some((m) => m.payment_method_name.toLowerCase() === value.toLowerCase())) {
      showToast(`“${value}” is already a payment method.`, 'error');
      return;
    }
    const ok = await run('new', () => financeApi.createPaymentMethod({ payment_method_no: `PM-${Date.now()}`, payment_method_name: value }), 'Could not add the payment method.');
    if (ok) setName('');
  };

  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    const ok = await run(editing.id, () => financeApi.updatePaymentMethod(editing.id, { payment_method_name: editing.name.trim() }), 'Could not rename it.');
    if (ok) setEditing(null);
  };

  const remove = (m: PaymentMethod) => {
    if (confirmDelete !== m._id) { setConfirmDelete(m._id); return; }
    setConfirmDelete(null);
    run(m._id, () => financeApi.deletePaymentMethod(m._id), 'It is in use on past payments, so it cannot be deleted.');
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Payment methods</CardTitle>
        <CardDescription className="text-xs">The choices in “Paid by” when you take a payment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment methods yet. Add “Cash” to start taking payments.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {methods.map((m) => (
              <li key={m._id} className="flex min-h-12 items-center gap-2 px-3 py-1.5">
                {editing?.id === m._id ? (
                  <form onSubmit={rename} className="flex flex-1 items-center gap-2">
                    <Input autoFocus value={editing.name} onChange={(e) => setEditing({ id: m._id, name: e.target.value })} className="h-9" aria-label="Payment method name" />
                    <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={busy === m._id} aria-label="Save">
                      {busy === m._id ? <SpinnerGap size={15} className="animate-spin" /> : <Check size={15} />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setEditing(null)} aria-label="Cancel"><X size={15} /></Button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{m.payment_method_name}</span>
                    {canEdit && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ id: m._id, name: m.payment_method_name })} aria-label={`Rename ${m.payment_method_name}`}>
                          <PencilSimple size={15} />
                        </Button>
                        <Button size={confirmDelete === m._id ? 'sm' : 'icon'} variant={confirmDelete === m._id ? 'destructive' : 'ghost'}
                          className={confirmDelete === m._id ? 'h-8 text-xs' : 'h-8 w-8 text-muted-foreground hover:text-destructive'}
                          onClick={() => remove(m)} onBlur={() => setConfirmDelete((c) => (c === m._id ? null : c))}
                          disabled={busy === m._id} aria-label={`Delete ${m.payment_method_name}`}>
                          {busy === m._id ? <SpinnerGap size={15} className="animate-spin" /> : confirmDelete === m._id ? 'Delete?' : <Trash size={15} />}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <form onSubmit={add} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. EVC Plus" className="h-9" aria-label="New payment method" />
            <Button type="submit" size="sm" className="h-9 shrink-0 gap-1.5" disabled={!name.trim() || busy === 'new'}>
              {busy === 'new' ? <SpinnerGap size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
