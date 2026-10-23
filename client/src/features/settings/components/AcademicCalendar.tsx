import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WarningCircle, CalendarBlank, CalendarPlus, CaretLeft, CaretRight, Clock, SpinnerGap, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import {
  settingsApi,
  type AcademicCalendarData,
  type AcademicCalendarEvent,
  type CalendarEventType,
  type CalendarItemPayload,
  type ManagedCalendarItem,
} from '../api/settingsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const EVENT_STYLE: Record<CalendarEventType, { dot: string; badge: string; label: string }> = {
  session: { dot: 'bg-success', badge: 'bg-success/10 text-success', label: 'Academic session' },
  term: { dot: 'bg-info', badge: 'bg-info/10 text-info', label: 'Term' },
  holiday: { dot: 'bg-violet', badge: 'bg-violet/10 text-violet', label: 'Holiday' },
  event: { dot: 'bg-info', badge: 'bg-info/10 text-info', label: 'Event' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateOnly(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoDate(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return 'Something went wrong. Please try again.';
}

function itemStatus(item: ManagedCalendarItem) {
  const today = dateOnly(new Date());
  const start = dateOnly(item.date);
  const end = dateOnly(item.endDate || item.date);
  if (today < start) return 'Upcoming';
  if (today <= end) return 'Ongoing';
  return 'Completed';
}

interface ItemModalProps {
  kind: 'holiday' | 'event';
  item?: ManagedCalendarItem | null;
  academicYearId?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: CalendarItemPayload) => Promise<void>;
}

function ItemModal({ kind, item, academicYearId, saving, onClose, onSave }: ItemModalProps) {
  const [title, setTitle] = useState(item?.name || item?.title || '');
  const [date, setDate] = useState(isoDate(item?.date));
  const [endDate, setEndDate] = useState(isoDate(item?.endDate));
  const [description, setDescription] = useState(item?.description || '');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !date) {
      setError(`${kind === 'holiday' ? 'Holiday name' : 'Event title'} and date are required.`);
      return;
    }
    if (endDate && endDate < date) {
      setError('End date cannot be before the start date.');
      return;
    }
    await onSave({ title: title.trim(), date, endDate: endDate || undefined, description: description.trim(), academicYearId });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} {kind === 'holiday' ? 'Holiday' : 'School Event'}</DialogTitle>
          <DialogDescription>This date will appear on the academic calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2">
          {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <div>
            <Label htmlFor="item-title" className="mb-1 block">{kind === 'holiday' ? 'Holiday name' : 'Event title'}</Label>
            <Input id="item-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'holiday' ? 'e.g. Independence Day' : 'e.g. Parents Meeting'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="item-date" className="mb-1 block">Start date</Label>
              <Input id="item-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="item-end-date" className="mb-1 block">End date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="item-end-date" type="date" min={date} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="inline-flex items-center gap-2">
              {saving && <SpinnerGap size={15} className="animate-spin" />}{item ? 'Save changes' : `Add ${kind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CalendarMonth({ month, events, onPrevious, onNext }: { month: Date; events: AcademicCalendarEvent[]; onPrevious: () => void; onNext: () => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cells = Array.from({ length: Math.ceil((first.getDay() + last.getDate()) / 7) * 7 }, (_, index) => {
    const day = index - first.getDay() + 1;
    return day > 0 && day <= last.getDate() ? day : null;
  });
  const today = dateOnly(new Date());

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Calendar</h3>
          <p className="text-xs text-muted-foreground">All scheduled academic dates in one view</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="plain" onClick={onPrevious} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted/50" aria-label="Previous month"><CaretLeft size={17} /></Button>
          <span className="min-w-32 text-center text-sm font-semibold text-foreground">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <Button variant="plain" onClick={onNext} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted/50" aria-label="Next month"><CaretRight size={17} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-l border-t border-border">
        {WEEKDAYS.map((day) => <div key={day} className="border-b border-r border-border bg-muted/50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>)}
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-24 border-b border-r border-border bg-muted/40" />;
          const cellDate = new Date(month.getFullYear(), month.getMonth(), day);
          const dayEvents = events.filter((event) => {
            const start = dateOnly(event.date);
            const end = dateOnly(event.endDate || event.date);
            return cellDate >= start && cellDate <= end;
          });
          const isToday = cellDate.getTime() === today.getTime();
          return (
            <div key={day} className={`min-h-24 border-b border-r border-border p-2 ${dayEvents.length ? 'bg-primary/10' : ''}`}>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground/80'}`}>{day}</span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event) => <div key={event.id} title={event.title} className={`truncate rounded px-1.5 py-1 text-[10px] font-medium ${EVENT_STYLE[event.type].badge}`}><span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${EVENT_STYLE[event.type].dot}`} />{event.title}</div>)}
                {dayEvents.length > 2 && <p className="pl-1 text-[10px] font-medium text-muted-foreground">+{dayEvents.length - 2} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AcademicCalendar() {
  const [data, setData] = useState<AcademicCalendarData | null>(null);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<{ kind: 'holiday' | 'event'; item?: ManagedCalendarItem } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'holiday' | 'event'; item: ManagedCalendarItem } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (yearId?: string, preserveMonth = false) => {
    setLoading(true);
    setError('');
    try {
      const calendar = await settingsApi.getAcademicCalendar(yearId);
      setData(calendar);
      const resolvedYearId = calendar.selectedAcademicYear?._id || '';
      setSelectedYearId(resolvedYearId);
      if (!preserveMonth) {
        const next = calendar.events.find((event) => dateOnly(event.date) >= dateOnly(new Date())) || calendar.events[0];
        if (next) {
          const nextDate = new Date(next.date);
          setMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const upcoming = useMemo(() => data?.events
    .filter((event) => dateOnly(event.endDate || event.date) >= dateOnly(new Date()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [], [data]);

  const managedItems = useMemo(() => [
    ...(data?.holidays || []).map((item) => ({ ...item, kind: 'holiday' as const })),
    ...(data?.schoolEvents || []).map((item) => ({ ...item, kind: 'event' as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [data]);

  const saveItem = async (payload: CalendarItemPayload) => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.kind === 'holiday') {
        if (modal.item) await settingsApi.updateHoliday(modal.item._id, payload);
        else await settingsApi.createHoliday(payload);
      } else if (modal.item) await settingsApi.updateEvent(modal.item._id, payload);
      else await settingsApi.createEvent(payload);
      setModal(null);
      setNotice(`${modal.kind === 'holiday' ? 'Holiday' : 'Event'} ${modal.item ? 'updated' : 'added'} successfully.`);
      await load(selectedYearId, true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      if (deleting.kind === 'holiday') await settingsApi.deleteHoliday(deleting.item._id);
      else await settingsApi.deleteEvent(deleting.item._id);
      setNotice(`${deleting.kind === 'holiday' ? 'Holiday' : 'Event'} deleted successfully.`);
      setDeleting(null);
      await load(selectedYearId, true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <div className="flex min-h-96 items-center justify-center"><SpinnerGap className="animate-spin text-primary" size={28} /><span className="ml-3 text-sm text-muted-foreground">Loading academic calendar…</span></div>;

  return (
    <div className="space-y-7">
      <div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Academic Calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Terms are synchronized automatically; manage school holidays and events here.</p>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"><WarningCircle size={17} />{error}<Button variant="plain" className="ml-auto font-medium" onClick={() => setError('')}>Dismiss</Button></div>}
      {notice && <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}

      {!data?.academicYears.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center"><CalendarBlank className="mx-auto text-muted-foreground" size={34} /><h3 className="mt-3 font-semibold text-foreground">No academic year configured</h3><p className="mt-1 text-sm text-muted-foreground">Create an academic year and its terms under Academic Structure. Calendar dates will appear here automatically.</p></div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-foreground">Academic Session</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">The calendar is created automatically from your academic year and dated terms.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/academic-structure">Edit Years & Terms</Link>
                </Button>
                <Button variant="plain"
                  onClick={() => setModal({ kind: 'event' })}
                  className="inline-flex items-center gap-2 h-10 rounded-xl border border-primary bg-card px-4 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  <Plus size={16} /> Add Event
                </Button>
                <Button variant="plain"
                  onClick={() => setModal({ kind: 'holiday' })}
                  className="inline-flex items-center gap-2 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <CalendarPlus size={16} /> Add Holiday
                </Button>
              </div>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm font-medium text-foreground/80">
                Academic Year
                <NativeSelect
                  value={selectedYearId}
                  onChange={(event) => void load(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-muted/40 px-3.5 text-sm font-medium text-foreground"
                >
                  {data?.academicYears.map((year) => <option key={year._id} value={year._id}>{year.y_name}</option>)}
                </NativeSelect>
              </label>
              <div>
                <p className="text-sm font-medium text-foreground/80">Current Term</p>
                <div className="mt-2 flex min-h-11 items-center rounded-xl bg-tile-green px-3.5 py-2.5 text-sm font-semibold text-tile-foreground">
                  {data?.activeTerm?.name || 'No active term'}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80">Session Start Date</p>
                <div className="mt-2 flex min-h-11 items-center rounded-xl bg-tile-blue px-3.5 py-2.5 text-sm font-semibold text-tile-foreground">
                  {formatDate(data?.sessionStart)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80">Session End Date</p>
                <div className="mt-2 flex min-h-11 items-center rounded-xl bg-tile-yellow px-3.5 py-2.5 text-sm font-semibold text-tile-foreground">
                  {formatDate(data?.sessionEnd)}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <CalendarMonth month={month} events={data?.events || []} onPrevious={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Clock size={18} className="text-primary" /><div><h3 className="font-semibold text-foreground">Upcoming dates</h3><p className="text-xs text-muted-foreground">Next important academic activities</p></div></div>
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {upcoming.length ? upcoming.slice(0, 12).map((event) => (
                  <div key={`${event.type}-${event.id}`} className="rounded-xl border border-border bg-muted/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-9 w-1 shrink-0 rounded-full ${EVENT_STYLE[event.type].dot}`} />
                      <div className="min-w-0"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${EVENT_STYLE[event.type].badge}`}>Upcoming {EVENT_STYLE[event.type].label}</span><p className="mt-2 text-sm font-semibold text-foreground">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(event.date)}{event.endDate ? ` – ${formatDate(event.endDate)}` : ''}</p></div>
                    </div>
                  </div>
                )) : <p className="rounded-xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">No upcoming dates for this academic year.</p>}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">{(Object.keys(EVENT_STYLE) as CalendarEventType[]).map((type) => <span key={type} className="inline-flex items-center gap-2 text-xs text-muted-foreground"><span className={`h-2.5 w-2.5 rounded-full ${EVENT_STYLE[type].dot}`} />{EVENT_STYLE[type].label}</span>)}</div>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-border p-5 sm:flex-row sm:items-center">
              <div><h3 className="text-lg font-semibold text-foreground">Holidays & school events</h3><p className="mt-1 text-sm text-muted-foreground">Create and maintain dates that are specific to your school.</p></div>
              <div className="flex gap-2"><Button variant="plain" onClick={() => setModal({ kind: 'event' })} className="inline-flex items-center gap-2 h-10 rounded-xl border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/10"><Plus size={16} />Add Event</Button><Button variant="plain" onClick={() => setModal({ kind: 'holiday' })} className="inline-flex items-center gap-2 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><CalendarPlus size={16} />Add Holiday</Button></div>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[720px] text-left text-sm">
                <TableHeader className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><TableRow><TableHead className="px-5 py-3.5">Name</TableHead><TableHead className="px-5 py-3.5">Type</TableHead><TableHead className="px-5 py-3.5">Date</TableHead><TableHead className="px-5 py-3.5">Status</TableHead><TableHead className="px-5 py-3.5 text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border">
                  {managedItems.map((item) => { const status = itemStatus(item); return <TableRow key={`${item.kind}-${item._id}`} className="hover:bg-muted/50"><TableCell className="px-5 py-4"><p className="font-medium text-foreground">{item.name || item.title}</p>{item.description && <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{item.description}</p>}</TableCell><TableCell className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${EVENT_STYLE[item.kind].badge}`}>{EVENT_STYLE[item.kind].label}</span></TableCell><TableCell className="px-5 py-4 text-muted-foreground">{formatDate(item.date)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}</TableCell><TableCell className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === 'Upcoming' ? 'bg-warning/10 text-warning' : status === 'Ongoing' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{status}</span></TableCell><TableCell className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="plain" onClick={() => setModal({ kind: item.kind, item })} className="rounded-lg p-2 text-info hover:bg-info/10" aria-label={`Edit ${item.name || item.title}`}><PencilSimple size={17} /></Button><Button variant="plain" onClick={() => setDeleting({ kind: item.kind, item })} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" aria-label={`Delete ${item.name || item.title}`}><Trash size={17} /></Button></div></TableCell></TableRow>; })}
                  {!managedItems.length && <TableRow><TableCell colSpan={5} className="px-5 py-12 text-center"><CalendarBlank className="mx-auto text-muted-foreground/70" size={28} /><p className="mt-2 text-sm font-medium text-muted-foreground">No holidays or events added</p><p className="mt-1 text-xs text-muted-foreground">Use the buttons above to add the first real calendar date.</p></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      {modal && <ItemModal kind={modal.kind} item={modal.item} academicYearId={selectedYearId || undefined} saving={saving} onClose={() => setModal(null)} onSave={saveItem} />}
      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent centered className="max-w-md">
          <DialogHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <Trash size={20} />
            </div>
            <DialogTitle>Delete {deleting?.kind}?</DialogTitle>
            <DialogDescription>
              “{deleting?.item.name || deleting?.item.title}” will be removed from the academic calendar. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={() => void deleteItem()} className="inline-flex items-center gap-2">
              {saving && <SpinnerGap size={15} className="animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
