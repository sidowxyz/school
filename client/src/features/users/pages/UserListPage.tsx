import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise, CaretLeft, CaretRight, Key, MagnifyingGlass, Plus, ShieldCheck, UserCheck, UserMinus, Users,
  CheckCircle,
  UserPlus,
  UsersThree,
} from '@phosphor-icons/react';

import PageHeader from "../../../components/common/PageHeader";
import CredentialsReveal from "../../../components/common/CredentialsReveal";
import StatStrip from "../../../components/shared/StatStrip";
import { useAuth } from "../../../hooks/useAuth";
import { usersApi } from "../api/usersApi";
import { rolesApi, type AppRole } from "../../roles/api/rolesApi";
import type { AppUser, UserRole } from "../types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableEmptyRow, TableLoadingRows } from "@/components/common/EmptyState";

// Roles come from the Roles page (built-in ones first, then the school's own).
type RoleOption = Pick<AppRole, "key" | "name" | "color" | "builtIn" | "userCount">;

// Pastel avatar fills, by the role's colour, so a role is recognisable at a glance.
const FILL: Record<AppRole["color"], string> = {
  pink: "bg-tile-pink", yellow: "bg-tile-yellow", blue: "bg-tile-blue", violet: "bg-tile-violet", green: "bg-tile-green",
};

// Staff roles that sign in to the main app (not teachers, students or parents).
const STAFF_ROLES = ["admin", "principal", "academic_officer", "accountant"];
// These logins come with a profile and are made on their own pages.
const PROFILE_ROLES = ["teacher", "student", "parent"];

const roleName = (roles: RoleOption[], key: string) => roles.find((r) => r.key === key)?.name ?? key.replace(/_/g, " ");

function RoleOptions({ roles }: { roles: RoleOption[] }) {
  const custom = roles.filter((r) => !r.builtIn);
  return (
    <>
      <optgroup label="Built-in roles">
        {roles.filter((r) => r.builtIn && !PROFILE_ROLES.includes(r.key)).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
      </optgroup>
      {custom.length > 0 && (
        <optgroup label="Custom roles">
          {custom.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </optgroup>
      )}
    </>
  );
}

const PAGE_SIZE = 15;
// Counts and the open page are re-read this often while the tab is visible,
// and again whenever the window regains focus, so changes made by anyone else
// show up without a manual refresh.
const POLL_MS = 30_000;

type StatusFilter = "" | "active" | "inactive";
type Counts = { total: number; active: number };

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

function timeAgo(value?: string): string {
  if (!value) return "Never";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

const isRecent = (value?: string) => !!value && Date.now() - new Date(value).getTime() < 15 * 60 * 1000;

function AddUserModal({ roles, onClose, onCreated }: { roles: RoleOption[]; onClose: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    try {
      const result = await usersApi.create({
        firstName: String(form.get("firstName") || ""),
        lastName: String(form.get("lastName") || ""),
        email: String(form.get("email") || ""),
        role: form.get("role") as UserRole,
      });
      setCreated({ email: result.user.email, password: result.temporaryPassword });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader icon={created ? CheckCircle : UserPlus} tint={created ? "green" : "blue"}>
          <DialogTitle>{created ? "User Created" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {created
              ? "The account has been created and can log in now."
              : "For staff accounts, including custom roles. Teachers, students and parents get accounts from their own pages."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <CredentialsReveal
            title="User account created"
            email={created.email}
            password={created.password}
            onDone={onClose}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-first-name" className="text-xs font-semibold">First Name *</Label>
                <Input id="user-first-name" name="firstName" required placeholder="First name" className="h-11 rounded-xl bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-last-name" className="text-xs font-semibold">Last Name *</Label>
                <Input id="user-last-name" name="lastName" required placeholder="Last name" className="h-11 rounded-xl bg-muted/40" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-semibold">Email *</Label>
              <Input id="user-email" name="email" type="email" required placeholder="user@school.edu" className="h-11 rounded-xl bg-muted/40" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-semibold">Role *</Label>
              <NativeSelect id="user-role" name="role" required defaultValue="" className="h-11 rounded-xl bg-muted/40">
                <option value="" disabled>Select a role</option>
                <RoleOptions roles={roles} />
              </NativeSelect>
              <p className="text-[11px] text-muted-foreground">
                Need different access? <Link to="/roles" className="font-medium text-primary hover:underline">Create a role</Link> first.
              </p>
            </div>

            <p className="rounded-xl bg-tile-yellow px-3.5 py-2.5 text-xs text-tile-foreground">
              A temporary login password is generated automatically. You'll see it once, right after saving.
            </p>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A small on/off switch for the account status. */
function StatusSwitch({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <Button
      variant="plain"
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        on ? "bg-success" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </Button>
  );
}

export default function UserListPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetFor, setResetFor] = useState<{ email: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [showAdd, setShowAdd] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const requestId = useRef(0);

  // Search as you type, but only hit the server once typing pauses.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadCounts = useCallback(async () => {
    // The Roles API also says how many people have each role.
    const [all, active, roleList] = await Promise.all([
      usersApi.getAll({ limit: 1 }),
      usersApi.getAll({ limit: 1, status: true }),
      rolesApi.list(),
    ]);
    setRoles(roleList.roles);
    setCounts({ total: all.total, active: active.total });
  }, []);

  const loadPage = useCallback(async () => {
    const result = await usersApi.getAll({
      page,
      limit: PAGE_SIZE,
      search: debounced || undefined,
      role: roleFilter || undefined,
      status: statusFilter ? statusFilter === "active" : undefined,
    });
    setUsers(result.users);
    setTotal(result.total);
  }, [page, debounced, roleFilter, statusFilter]);

  // `silent` refreshes keep the current rows on screen (poll / focus / after a change).
  const load = useCallback(async (silent = false) => {
    const id = ++requestId.current;
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      await Promise.all([loadPage(), loadCounts()]);
      if (id !== requestId.current) return;
      setError("");
      setUpdatedAt(new Date());
    } catch (err) {
      if (id !== requestId.current) return;
      console.error(err);
      if (!silent) setError("Failed to load users.");
    } finally {
      if (id === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [loadPage, loadCounts]);

  useEffect(() => { void load(); }, [load]);

  // Keep the page live: poll while visible, refresh on focus, and re-render the relative times.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    const poll = setInterval(refresh, POLL_MS);
    const clock = setInterval(() => setTick((n) => n + 1), 15_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(poll); clearInterval(clock);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Changes show instantly; the server answer then confirms them or rolls them back.
  async function handleRoleChange(user: AppUser, role: UserRole) {
    const previous = user.role;
    setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, role } : u)));
    try {
      await usersApi.updateRole(user._id, role);
      setNotice(`${user.name} is now ${roleName(roles, role)}.`);
      void load(true);
    } catch (err: any) {
      setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, role: previous } : u)));
      setError(err?.response?.data?.message || "Could not change the role.");
    }
  }

  // There is no email delivery: an admin sets a temporary password and hands it over.
  async function handleResetPassword(user: AppUser) {
    if (!window.confirm(`Reset the password for ${user.name}? They will be signed out everywhere and get a new temporary password.`)) return;
    setResettingId(user._id);
    try {
      const result = await usersApi.resetPassword(user._id);
      setResetFor({ email: result.email, password: result.temporaryPassword });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not reset the password.");
    } finally {
      setResettingId(null);
    }
  }

  async function handleStatusToggle(user: AppUser) {
    const next = !user.status;
    setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, status: next } : u)));
    try {
      await usersApi.updateStatus(user._id, next);
      setNotice(`${user.name} ${next ? "activated" : "deactivated"}.`);
      void load(true);
    } catch (err: any) {
      setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, status: !next } : u)));
      setError(err?.response?.data?.message || "Could not change the status.");
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const staffCount = useMemo(
    () => roles.filter((r) => STAFF_ROLES.includes(r.key) || !r.builtIn).reduce((n, r) => n + r.userCount, 0),
    [roles],
  );
  const filtered = !!(search || roleFilter || statusFilter);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="User Accounts"
        subtitle="Sign-in accounts for office staff and custom roles."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className={cn("h-2 w-2 rounded-full", refreshing ? "animate-pulse bg-warning" : "bg-success")} />
              {updatedAt ? `Live · updated ${timeAgo(updatedAt.toISOString())}` : "Connecting…"}
            </span>
            <Button variant="outline" size="icon" onClick={() => void load(true)} disabled={refreshing || loading} aria-label="Refresh users" className="h-10 w-10">
              <ArrowsClockwise size={16} className={refreshing ? "animate-spin" : ""} />
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add User
            </Button>
          </div>
        }
      />

      <StatStrip
        items={[
          { label: "Total users", value: counts?.total ?? "—", icon: Users, tone: "sky", hint: "All accounts" },
          { label: "Active", value: counts?.active ?? "—", icon: UserCheck, tone: "emerald", hint: "Can sign in", onClick: () => { setStatusFilter("active"); setPage(1); }, active: statusFilter === "active" },
          { label: "Deactivated", value: counts ? counts.total - counts.active : "—", icon: UserMinus, tone: "rose", hint: "Sign-in blocked", onClick: () => { setStatusFilter("inactive"); setPage(1); }, active: statusFilter === "inactive" },
          { label: "Admin & staff", value: counts ? staffCount : "—", icon: ShieldCheck, tone: "amber", hint: "Admin, office staff and custom roles" },
        ]}
      />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="plain" type="button" className="h-auto p-0 text-xs font-semibold underline" onClick={() => setError("")}>Dismiss</Button>
        </div>
      )}
      {notice && <div className="rounded-xl bg-tile-green px-4 py-3 text-sm font-medium text-tile-foreground">{notice}</div>}

      <Card className="rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl bg-muted/40 pl-9"
            />
          </div>
          <NativeSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            aria-label="Filter by status"
            className="h-10 min-w-[150px] rounded-xl bg-muted/40 px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </NativeSelect>
          {filtered && (
            <Button variant="ghost" className="text-muted-foreground" onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[{ id: "", label: "All", count: counts?.total }, ...roles.map((r) => ({ id: r.key, label: r.name, count: r.userCount }))].map((chip) => {
            const selected = roleFilter === chip.id;
            return (
              <Button
                variant="plain"
                key={chip.id || "all"}
                type="button"
                onClick={() => { setRoleFilter(chip.id); setPage(1); }}
                className={cn(
                  "inline-flex h-auto items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {chip.label}
                <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", selected ? "bg-primary/15" : "bg-muted")}>{chip.count ?? "–"}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
                <TableHead className="px-6 font-semibold">User</TableHead>
                <TableHead className="px-4 font-semibold">Role</TableHead>
                <TableHead className="px-4 font-semibold">Status</TableHead>
                <TableHead className="px-4 font-semibold">Last login</TableHead>
                <TableHead className="px-4 text-right font-semibold">Joined</TableHead>
                <TableHead className="px-6 text-right font-semibold"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRows columns={6} avatar />
              ) : users.length === 0 ? (
                filtered ? (
                  <TableEmptyRow
                    colSpan={6}
                    icon={MagnifyingGlass}
                    tint="violet"
                    title="No users match"
                    text="Try another name or email, or clear the role and status filters."
                    action={<Button variant="outline" size="sm" onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); setPage(1); }}>Clear filters</Button>}
                  />
                ) : (
                  <TableEmptyRow colSpan={6} icon={UsersThree} tint="blue" title="No users yet" text="Staff accounts you add here appear in this list." />
                )
              ) : (
                users.map((user) => {
                  const isMe = !!me && me.id === user._id;
                  return (
                    <TableRow key={user._id} className="hover:bg-muted/40">
                      <TableCell className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-tile-foreground", FILL[roles.find((r) => r.key === user.role)?.color ?? "blue"])}>
                            {initials(user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {user.name}
                              {isMe && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">You</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        {PROFILE_ROLES.includes(user.role) ? (
                          <span className="inline-flex h-9 items-center rounded-xl bg-muted/40 px-3 text-xs" title="Managed from the Teachers, Students or Parents page">
                            {roleName(roles, user.role)}
                          </span>
                        ) : (
                        <NativeSelect
                          value={user.role}
                          disabled={isMe}
                          aria-label={`Role for ${user.name}`}
                          title={isMe ? "You can't change your own role" : undefined}
                          onChange={(e) => void handleRoleChange(user, e.target.value as UserRole)}
                          className="h-9 min-w-[150px] rounded-xl bg-muted/40 px-2.5 text-xs"
                        >
                          {!roles.some((r) => r.key === user.role) && <option value={user.role}>{roleName(roles, user.role)}</option>}
                          <RoleOptions roles={roles} />
                        </NativeSelect>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <StatusSwitch
                            on={user.status}
                            disabled={isMe}
                            label={`${user.status ? "Deactivate" : "Activate"} ${user.name}`}
                            onChange={() => void handleStatusToggle(user)}
                          />
                          <span className={cn("text-xs font-medium", user.status ? "text-success" : "text-muted-foreground")}>
                            {user.status ? "Active" : "Deactivated"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5" title={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : undefined}>
                          {isRecent(user.lastLogin) && <span className="h-2 w-2 rounded-full bg-success" />}
                          {timeAgo(user.lastLogin)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5 text-right text-xs text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-6 py-3.5 text-right">
                        <Button variant="ghost" size="xs" onClick={() => void handleResetPassword(user)} disabled={resettingId === user._id}>
                          <Key size={14} /> Reset password
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground sm:flex-row">
          <span>
            {total === 0 ? "0 users" : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <CaretLeft size={14} />
            </Button>
            <span className="min-w-16 text-center font-medium text-foreground">Page {page} of {pageCount}</span>
            <Button variant="outline" size="icon-sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <CaretRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {showAdd && <AddUserModal roles={roles} onClose={() => setShowAdd(false)} onCreated={() => void load(true)} />}
      {resetFor && (
        <Dialog open onOpenChange={(open) => !open && setResetFor(null)}>
          <DialogContent>
            <DialogHeader icon={Key} tint="yellow">
              <DialogTitle>Password reset</DialogTitle>
              <DialogDescription>Give these sign-in details to the person. They can change the password under My account.</DialogDescription>
            </DialogHeader>
            <CredentialsReveal title="New temporary password" email={resetFor.email} password={resetFor.password} onDone={() => setResetFor(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
