import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Copy, Crown, Key, LockSimple, Plus, ShieldCheck, Trash, UserCircle, Users, type Icon,
} from '@phosphor-icons/react';
import PageHeader from '@/components/common/PageHeader';
import StatStrip from '@/components/shared/StatStrip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DashboardError, DashboardLoading } from '../../dashboard/components/DashboardKit';
import {
  rolesApi, type AppRole, type PermissionMap, type RoleAction, type RoleColor, type RoleInput, type RolesResponse,
} from '../api/rolesApi';

const FILL: Record<RoleColor, string> = {
  pink: 'bg-tile-pink', yellow: 'bg-tile-yellow', blue: 'bg-tile-blue', violet: 'bg-tile-violet', green: 'bg-tile-green',
};
const COLORS = Object.keys(FILL) as RoleColor[];
const ACTION_LABEL: Record<RoleAction, string> = { view: 'View', create: 'Add', edit: 'Edit', delete: 'Delete' };

const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const pageCount = (p: PermissionMap) => Object.values(p).filter((a) => a.length).length;

type Draft = RoleInput & { id?: string };
const EMPTY: Draft = { name: '', description: '', color: 'blue', permissions: {} };

/** Turn one action on or off; any action needs "view", and no "view" means nothing. */
function toggle(permissions: PermissionMap, module: string, action: RoleAction, on: boolean, all: RoleAction[]): PermissionMap {
  const current = new Set(permissions[module] ?? []);
  if (on) { current.add(action); current.add('view'); } else if (action === 'view') current.clear(); else current.delete(action);
  return { ...permissions, [module]: all.filter((a) => current.has(a)) };
}

function RoleAvatar({ role, size = 'md' }: { role: Pick<AppRole, 'name' | 'color'>; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-tile-foreground', FILL[role.color],
      size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs')}>
      {initials(role.name)}
    </span>
  );
}

/** What a role can reach: a pill for admin/portal roles, otherwise pages plus how many allow each action. */
function AccessSummary({ role, actions }: { role: AppRole; actions: RoleAction[] }) {
  if (role.allAccess) return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tile-pink px-2.5 py-1 text-xs font-medium text-tile-foreground"><Crown size={12} /> Every page</span>;
  if (role.portal) return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tile-blue px-2.5 py-1 text-xs font-medium text-tile-foreground"><UserCircle size={12} /> Own portal only</span>;
  const pages = pageCount(role.permissions);
  const count = (a: RoleAction) => Object.values(role.permissions).filter((list) => list.includes(a)).length;
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{pages} page{pages === 1 ? '' : 's'}</p>
      <div className="flex gap-1">
        {actions.filter((a) => a !== 'view').map((a) => (
          <span key={a} className={cn('whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', count(a) ? 'bg-muted text-foreground/80' : 'bg-muted/40 text-muted-foreground/60 line-through')}>
            {ACTION_LABEL[a]} {count(a) || ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Every role in one table: custom roles first, then the built-in ones. */
function RolesTable({ roles, actions, onOpen, onDuplicate, onNew }: {
  roles: AppRole[]; actions: RoleAction[]; onOpen: (role: AppRole) => void; onDuplicate: (role: AppRole) => void; onNew: () => void;
}) {
  const custom = roles.filter((r) => !r.builtIn);
  const builtIn = roles.filter((r) => r.builtIn);
  const row = (r: AppRole) => (
    <TableRow key={r.key} className="cursor-pointer" onClick={() => onOpen(r)}>
      <TableCell className="py-3.5 pl-5">
        <div className="flex items-center gap-3">
          <RoleAvatar role={r} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
            <p className="max-w-xs truncate text-xs text-muted-foreground">{r.description || 'No description'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {r.builtIn
          ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><LockSimple size={11} /> Built-in</span>
          : <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tile-green px-2.5 py-1 text-xs font-medium text-tile-foreground"><ShieldCheck size={11} /> Custom</span>}
      </TableCell>
      <TableCell><AccessSummary role={r} actions={actions} /></TableCell>
      <TableCell className="text-right">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground">
          <Users size={14} className="text-muted-foreground" /> {r.userCount}
        </span>
      </TableCell>
      <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1">
          {!r.allAccess && !r.portal && (
            <Button variant="ghost" size="icon-sm" onClick={() => onDuplicate(r)} aria-label={`Duplicate ${r.name}`} title="Duplicate"><Copy size={15} /></Button>
          )}
          <Button variant="outline" size="xs" onClick={() => onOpen(r)}>{r.builtIn ? 'View' : 'Edit'}</Button>
        </div>
      </TableCell>
    </TableRow>
  );
  const group = (label: string, icon: Icon) => {
    const GroupIcon = icon;
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={5} className="bg-muted/30 py-2 pl-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><GroupIcon size={12} /> {label}</span>
        </TableCell>
      </TableRow>
    );
  };
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
              <TableHead className="pl-5 font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="min-w-[190px] font-semibold">Access</TableHead>
              <TableHead className="text-right font-semibold">People</TableHead>
              <TableHead className="pr-5 text-right font-semibold"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group('Custom roles', ShieldCheck)}
            {custom.length ? custom.map(row) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-5 pl-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
                    <p className="text-sm text-muted-foreground">No custom roles yet. Create one, or duplicate a built-in role below.</p>
                    <Button size="xs" variant="soft" onClick={onNew}><Plus size={13} /> New role</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {group('Built-in roles', LockSimple)}
            {builtIn.map(row)}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/** The page × action grid. Read-only for built-in roles. */
function PermissionMatrix({ data, permissions, readOnly, onChange }: {
  data: RolesResponse; permissions: PermissionMap; readOnly?: boolean; onChange?: (next: PermissionMap) => void;
}) {
  const { modules, actions } = data;
  const groups = useMemo(() => [...new Set(modules.map((m) => m.group))], [modules]);
  const has = (module: string, action: RoleAction) => !!permissions[module]?.includes(action);
  const columnFull = (action: RoleAction) => modules.every((m) => has(m.key, action));

  const setColumn = (action: RoleAction, on: boolean) => {
    let next = permissions;
    for (const m of modules) next = toggle(next, m.key, action, on, actions);
    onChange?.(next);
  };
  const setRow = (module: string, on: boolean) => onChange?.({ ...permissions, [module]: on ? [...actions] : [] });

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="min-w-[180px]">Page</TableHead>
            {actions.map((a) => (
              <TableHead key={a} className="w-20 text-center">
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <span>{ACTION_LABEL[a]}</span>
                  {!readOnly && (
                    <Checkbox checked={columnFull(a)} onCheckedChange={(v) => setColumn(a, v === true)} aria-label={`${ACTION_LABEL[a]} on every page`} />
                  )}
                </div>
              </TableHead>
            ))}
            {!readOnly && <TableHead className="w-24 text-center">Full access</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <GroupRows key={group} group={group} span={actions.length + (readOnly ? 1 : 2)}>
              {modules.filter((m) => m.group === group).map((m) => {
                const full = actions.every((a) => has(m.key, a));
                return (
                  <TableRow key={m.key}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    {actions.map((a) => (
                      <TableCell key={a} className="text-center">
                        {readOnly ? (
                          has(m.key, a)
                            ? <Check size={16} weight="bold" className="mx-auto text-success" aria-label="Allowed" />
                            : <span className="text-muted-foreground/50" aria-label="Not allowed">—</span>
                        ) : (
                          <Checkbox className="mx-auto" checked={has(m.key, a)} aria-label={`${ACTION_LABEL[a]} ${m.label}`}
                            onCheckedChange={(v) => onChange?.(toggle(permissions, m.key, a, v === true, actions))} />
                        )}
                      </TableCell>
                    ))}
                    {!readOnly && (
                      <TableCell className="text-center">
                        <Button variant="plain" type="button" onClick={() => setRow(m.key, !full)}
                          className={cn('h-7 rounded-full px-3 text-xs font-medium', full ? 'bg-tile-green text-tile-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                          {full ? 'Full' : 'Give all'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </GroupRows>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRows({ group, span, children }: { group: string; span: number; children: React.ReactNode }) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={span} className="bg-muted/20 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</TableCell>
      </TableRow>
      {children}
    </>
  );
}

function Notice({ icon: NoticeIcon, fill, children }: { icon: Icon; fill: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-tile-foreground', fill)}>
      <NoticeIcon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function RolesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<RolesResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async (select?: string) => {
    try {
      const res = await rolesApi.list();
      setData(res);
      setError('');
      // The drawer stays on the role it shows (e.g. after "Undo changes").
      if (select !== undefined) setSelectedKey(select);
    } catch (err) {
      setError(apiError(err, 'Could not load roles.'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = data?.roles.find((r) => r.key === selectedKey) ?? null;

  // Editing state follows the selected custom role; built-in roles are read-only.
  useEffect(() => {
    setConfirmDelete(false);
    if (selected && !selected.builtIn) {
      setDraft({ id: selected._id, name: selected.name, description: selected.description, color: selected.color, permissions: selected.permissions });
    } else if (selectedKey !== '__new') {
      setDraft(null);
    }
  }, [selected, selectedKey]);

  if (error) return <DashboardError message={error} />;
  if (!data) return <DashboardLoading />;

  const builtIn = data.roles.filter((r) => r.builtIn);
  const custom = data.roles.filter((r) => !r.builtIn);
  const peopleOnCustom = custom.reduce((n, r) => n + r.userCount, 0);

  const startNew = (from?: AppRole) => {
    setSelectedKey('__new');
    setDraft({
      ...EMPTY,
      name: from ? `${from.name} (copy)` : '',
      description: from?.description ?? '',
      color: from?.color ?? 'blue',
      permissions: from ? { ...from.permissions } : {},
    });
  };

  const dirty = !!draft && (!draft.id || !selected || JSON.stringify({
    name: selected.name, description: selected.description, color: selected.color, permissions: selected.permissions,
  }) !== JSON.stringify({ name: draft.name, description: draft.description, color: draft.color, permissions: draft.permissions }));

  const save = async () => {
    if (!draft) return;
    if (draft.name.trim().length < 2) { showToast('Give the role a name.', 'error'); return; }
    if (pageCount(draft.permissions) === 0) { showToast('Tick at least one page this role can open.', 'error'); return; }
    setSaving(true);
    try {
      const input: RoleInput = { name: draft.name.trim(), description: draft.description.trim(), color: draft.color, permissions: draft.permissions };
      const saved = draft.id ? await rolesApi.update(draft.id, input) : await rolesApi.create(input);
      showToast(draft.id ? `${saved.name} saved. Changes apply right away.` : `${saved.name} created. Give it to people on User Accounts.`);
      await load('');
    } catch (err) {
      showToast(apiError(err, 'Could not save the role.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await rolesApi.remove(draft.id);
      showToast(`${draft.name} deleted.`);
      setSelectedKey('');
      await load();
    } catch (err) {
      showToast(apiError(err, 'Could not delete the role.'), 'error');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Access"
        subtitle="Choose what each role can see and change."
        action={<Button onClick={() => startNew()}><Plus size={16} /> New role</Button>}
      />

      <StatStrip items={[
        { label: 'Roles', value: data.roles.length, icon: Key, tone: 'sky', hint: `${builtIn.length} built-in, ${custom.length} custom` },
        { label: 'Custom roles', value: custom.length, icon: ShieldCheck, tone: 'violet', hint: 'Made by your school' },
        { label: 'People on custom roles', value: peopleOnCustom, icon: Users, tone: 'emerald', hint: 'Using a custom role' },
      ]} />

      <RolesTable roles={data.roles} actions={data.actions} onOpen={(r) => setSelectedKey(r.key)} onDuplicate={startNew} onNew={() => startNew()} />

      {/* Details (built-in) or the editor (custom / new) open in the side drawer. */}
      <Dialog open={!!selectedKey && (!!draft || !!selected)} onOpenChange={(open) => { if (!open) setSelectedKey(''); }}>
        <DialogContent className="max-w-3xl">
        {draft ? (
          <>
            <DialogHeader icon={draft.id ? Key : Plus} tint={draft.color}>
              <DialogTitle>{draft.id ? draft.name || 'Role' : 'New role'}</DialogTitle>
              <DialogDescription>
                {draft.id && selected ? `${selected.userCount} ${selected.userCount === 1 ? 'person has' : 'people have'} this role. Changes apply right away.` : 'Name it, choose its pages, then save.'}
              </DialogDescription>
              {draft.id && selected && (
                <div className="pt-2">
                  <Button variant="outline" size="xs" onClick={() => startNew(selected)}><Copy size={13} /> Duplicate</Button>
                </div>
              )}
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role-name" className="text-xs font-semibold">Role name *</Label>
                <Input id="role-name" value={draft.name} maxLength={50} placeholder="e.g. Front Desk"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-description" className="text-xs font-semibold">What this role is for</Label>
                <Input id="role-description" value={draft.description} maxLength={200} placeholder="e.g. Registers new students and answers parents"
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold">Colour</p>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <Button key={c} variant="plain" type="button" onClick={() => setDraft({ ...draft, color: c })} aria-label={c} aria-pressed={draft.color === c}
                    className={cn('h-8 w-8 rounded-full p-0', FILL[c], draft.color === c && 'ring-2 ring-primary ring-offset-2 ring-offset-card')} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Page access</p>
                  <p className="text-xs text-muted-foreground">Ticking Add, Edit or Delete also ticks View. User accounts, roles and settings stay with admins.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button"
                    onClick={() => setDraft({ ...draft, permissions: Object.fromEntries(data.modules.map((m) => [m.key, ['view' as RoleAction]])) })}>
                    View everything
                  </Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => setDraft({ ...draft, permissions: {} })}>Clear</Button>
                </div>
              </div>
              <PermissionMatrix data={data} permissions={draft.permissions} onChange={(permissions) => setDraft({ ...draft, permissions })} />
            </div>

            <DialogFooter className="items-center sm:justify-between">
              <div>
                {draft.id && (confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Delete {draft.name}?</span>
                    <Button variant="destructive" size="sm" onClick={remove} disabled={saving}>Delete</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Keep</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} disabled={!!selected?.userCount}
                    title={selected?.userCount ? 'Give the people on this role another role first' : undefined}
                    className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash size={14} /> Delete role
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                {selectedKey === '__new' && <Button variant="outline" onClick={() => setSelectedKey('')}>Cancel</Button>}
                {draft.id && dirty && <Button variant="outline" onClick={() => void load(selectedKey)}>Undo changes</Button>}
                <Button onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create role'}</Button>
              </div>
            </DialogFooter>
          </>
        ) : selected ? (
          <>
            <DialogHeader icon={selected.allAccess ? Crown : selected.portal ? UserCircle : LockSimple} tint={selected.color}>
              <DialogTitle className="flex items-center gap-2">
                {selected.name}
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><LockSimple size={11} /> Built-in</span>
              </DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
              {!selected.allAccess && !selected.portal && (
                <div className="pt-2">
                  <Button variant="outline" size="xs" onClick={() => startNew(selected)}><Copy size={13} /> Duplicate as custom role</Button>
                </div>
              )}
            </DialogHeader>

            {selected.allAccess ? (
              <Notice icon={Crown} fill="bg-tile-pink">
                <p className="font-semibold">Full access</p>
                <p className="opacity-80">Admins can open every page and do everything, including managing user accounts, roles and settings.</p>
              </Notice>
            ) : selected.portal ? (
              <Notice icon={UserCircle} fill="bg-tile-blue">
                <p className="font-semibold">Own portal only</p>
                <p className="opacity-80">
                  {selected.key === 'student' ? 'Students see their own profile, attendance, timetable and fees.' : "Parents see their own children's profile, attendance and fees."} They never see other people's records.
                </p>
              </Notice>
            ) : (
              <>
                <Notice icon={LockSimple} fill="bg-tile-yellow">
                  Built-in roles can't be changed because parts of the system depend on them. To give someone different access, duplicate this role and change the copy.
                </Notice>
                <PermissionMatrix data={data} permissions={selected.permissions} readOnly />
              </>
            )}

            <DialogFooter className="items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {selected.userCount} {selected.userCount === 1 ? 'person has' : 'people have'} this role.
              </p>
              <Button asChild variant="outline"><Link to="/users">Manage user accounts</Link></Button>
            </DialogFooter>
          </>
        ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
