import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarBlank, CalendarCheck, CalendarPlus, CaretLeft, CaretRight, Confetti, Flag, PencilSimple, Plus, SpinnerGap, Trash, WarningCircle,
  SunHorizon,
} from '@phosphor-icons/react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import StatStrip from '@/components/shared/StatStrip';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardLoading } from '../../dashboard/components/DashboardKit';
import { SettingsSection } from './SettingsSection';
import { EmptyState } from '@/components/common/EmptyState';

// Each kind of date has its own pastel colour, everywhere it appears.
const EVENT_STYLE: Record<CalendarEventType, { fill: string; label: string }> = {
  session: { fill: 'bg-tile-green', label: 'School year' },
  term: { fill: 'bg-tile-blue', label: 'Term' },
  holiday: { fill: 'bg-tile-pink', label: 'Holiday' },
  event: { fill: 'bg-tile-yellow', label: 'School event' },
};

// The school week starts on Saturday.
const WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function dateOnly(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoDate(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

const formatRange = (start: string, end?: string | null) => (end && isoDate(end) !== isoDate(start) ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start));

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
  if (today <= end) return 'Happening now';
  return 'Past';
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
      <DialogContent>
        <DialogHeader icon={kind === 'holiday' ? SunHorizon : CalendarPlus} tint={kind === 'holiday' ? 'yellow' : 'blue'}>
          <DialogTitle>{item ? 'Edit' : 'Add'} {kind === 'holiday' ? 'Holiday' : 'School Event'}</DialogTitle>
          <DialogDescription>This date will appear on the school calendar and the dashboards.</DialogDescription>
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
              <DatePicker id="item-date" value={date} onChange={setDate} required />
            </div>
            <div>
              <Label htmlFor="item-end-date" className="mb-1 block">End date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <DatePicker id="item-end-date" value={endDate} min={date || undefined} onChange={setEndDate} clearable placeholder="Same day" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <SpinnerGap size={15} className="animate-spin" />}{item ? 'Save changes' : `Add ${kind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A month grid (Saturday first) with each day's dates as pastel chips. */
function CalendarMonth({ month, events, onPrevious, onNext, onToday }: {
  month: Date; events: AcademicCalendarEvent[]; onPrevious: () => void; onNext: () => void; onToday: () => void;
}) {
  const lead = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 1) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day > 0 && day <= days ? day : null;
  });
  const today = dateOnly(new Date());
  const isThisMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();

  return (
    <SettingsSection
      icon={CalendarBlank}
      tint="blue"
      title={month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      description="Terms, holidays and school events"
      className="lg:col-span-2"
      action={
        <div className="flex items-center gap-1">
          {!isThisMonth && <Button variant="ghost" size="xs" onClick={onToday}>Today</Button>}
          <Button variant="outline" size="icon-sm" onClick={onPrevious} aria-label="Previous month"><CaretLeft size={14} /></Button>
          <Button variant="outline" size="icon-sm" onClick={onNext} aria-label="Next month"><CaretRight size={14} /></Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-7 overflow-hidden rounded-xl border border-border">
          {WEEKDAYS.map((day) => (
            <div key={day} className={cn('border-b border-border bg-muted/40 py-2 text-center text-[11px] font-medium text-muted-foreground', day === 'Fri' && 'text-muted-foreground/60')}>{day}</div>
          ))}
          {cells.map((day, index) => {
            const border = cn('border-border', index % 7 !== 0 && 'border-l', index >= 7 && 'border-t');
            if (!day) return <div key={`empty-${index}`} className={cn('min-h-24 bg-muted/30', border)} />;
            const cellDate = new Date(month.getFullYear(), month.getMonth(), day);
            const dayEvents = events.filter((event) => cellDate >= dateOnly(event.date) && cellDate <= dateOnly(event.endDate || event.date));
            const isToday = cellDate.getTime() === today.getTime();
            const isFriday = cellDate.getDay() === 5;
            return (
              <div key={day} className={cn('min-h-24 p-1.5', border, isFriday && 'bg-muted/30')}>
                <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums', isToday ? 'bg-primary text-primary-foreground' : 'text-foreground/80')}>{day}</span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div key={event.id} title={event.title} className={cn('truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-tile-foreground', EVENT_STYLE[event.type].fill)}>
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <p className="pl-1 text-[10px] font-medium text-muted-foreground">+{dayEvents.length - 2} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {(Object.keys(EVENT_STYLE) as CalendarEventType[]).map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2.5 w-2.5 rounded-sm', EVENT_STYLE[type].fill)} />{EVENT_STYLE[type].label}
          </span>
        ))}
      </div>
    </SettingsSection>
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
      setSelectedYearId(calendar.selectedAcademicYear?._id || '');
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

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

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
      setNotice(`${modal.kind === 'holiday' ? 'Holiday' : 'Event'} ${modal.item ? 'updated' : 'added'}.`);
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
      setNotice(`${deleting.kind === 'holiday' ? 'Holiday' : 'Event'} deleted.`);
      setDeleting(null);
      await load(selectedYearId, true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <DashboardLoading />;

  const addButtons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'event' })} className="gap-1.5" aria-label="Add event"><Plus size={14} /> Event</Button>
      <Button size="sm" onClick={() => setModal({ kind: 'holiday' })} className="gap-1.5" aria-label="Add holiday"><CalendarPlus size={14} /> Holiday</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <WarningCircle size={17} className="shrink-0" />{error}
          <Button variant="plain" className="ml-auto h-auto p-0 text-xs font-medium underline" onClick={() => setError('')}>Dismiss</Button>
        </div>
      )}
      {notice && <div className="rounded-xl bg-tile-green px-4 py-3 text-sm font-medium text-tile-foreground">{notice}</div>}

      {!data?.academicYears.length ? (
        <SettingsSection icon={CalendarBlank} tint="yellow" title="No school year yet" description="The calendar is built from your school years and terms">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Create a school year and its terms first. Their dates appear here automatically, then you can add holidays and events.</p>
            <Button asChild size="sm"><Link to="/settings?tab=structure">Set up school years</Link></Button>
          </div>
        </SettingsSection>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-56 space-y-1.5">
              <Label htmlFor="cal-year" className="text-xs">School year</Label>
              <NativeSelect id="cal-year" value={selectedYearId} onChange={(event) => void load(event.target.value)}>
                {data?.academicYears.map((year) => <option key={year._id} value={year._id}>{year.y_name}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm"><Link to="/settings?tab=structure">Edit years &amp; terms</Link></Button>
              {addButtons}
            </div>
          </div>

          <StatStrip items={[
            { label: 'Current term', value: data?.activeTerm?.name || 'None', icon: Flag, tone: 'emerald', hint: data?.activeTerm ? 'Set as active' : 'Mark a term active' },
            { label: 'Year starts', value: formatDate(data?.sessionStart), icon: CalendarCheck, tone: 'sky', hint: 'First term begins' },
            { label: 'Year ends', value: formatDate(data?.sessionEnd), icon: CalendarCheck, tone: 'amber', hint: 'Last term ends' },
            { label: 'Holidays & events', value: managedItems.length, icon: Confetti, tone: 'rose', hint: `${upcoming.filter((e) => e.type === 'holiday' || e.type === 'event').length} still to come` },
          ]} />

          <div className="grid gap-6 lg:grid-cols-3">
            <CalendarMonth
              month={month}
              events={data?.events || []}
              onPrevious={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              onToday={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            />
            <SettingsSection icon={CalendarCheck} tint="green" title="Coming up" description="The next dates on the calendar" flush>
              {upcoming.length ? (
                <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
                  {upcoming.slice(0, 12).map((event) => (
                    <li key={`${event.type}-${event.id}`} className="flex items-start gap-3 px-5 py-3">
                      <span className={cn('mt-0.5 h-9 w-1.5 shrink-0 rounded-full', EVENT_STYLE[event.type].fill)} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{EVENT_STYLE[event.type].label} · {formatRange(event.date, event.endDate)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing else this school year.</p>
              )}
            </SettingsSection>
          </div>

          <SettingsSection icon={Confetti} tint="pink" title="Holidays & school events" description="Dates your school adds on top of the terms" action={addButtons} flush>
            {managedItems.length ? (
              <ul className="divide-y divide-border">
                {managedItems.map((item) => {
                  const status = itemStatus(item);
                  const name = item.name || item.title;
                  return (
                    <li key={`${item.kind}-${item._id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-tile-foreground', EVENT_STYLE[item.kind].fill)}>
                        {item.kind === 'holiday' ? <Confetti size={18} /> : <CalendarBlank size={18} />}
                      </span>
                      <div className="min-w-[160px] flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">{formatRange(item.date, item.endDate)}{item.description ? ` · ${item.description}` : ''}</p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        status === 'Upcoming' ? 'bg-warning/10 text-warning' : status === 'Happening now' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                        {status}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => setModal({ kind: item.kind, item })} aria-label={`Edit ${name}`}>
                          <PencilSimple size={15} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting({ kind: item.kind, item })} aria-label={`Delete ${name}`}>
                          <Trash size={15} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Confetti} tint="pink" title="No holidays or events yet" text="Add holidays and school events with the buttons above. They show on the calendar and dashboards." />
            )}
          </SettingsSection>
        </>
      )}

      {modal && <ItemModal kind={modal.kind} item={modal.item} academicYearId={selectedYearId || undefined} saving={saving} onClose={() => setModal(null)} onSave={saveItem} />}
      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent centered className="max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash size={20} />
            </div>
            <DialogTitle>Delete {deleting?.kind}?</DialogTitle>
            <DialogDescription>
              “{deleting?.item.name || deleting?.item.title}” will be removed from the calendar. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={() => void deleteItem()}>
              {saving && <SpinnerGap size={15} className="animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
