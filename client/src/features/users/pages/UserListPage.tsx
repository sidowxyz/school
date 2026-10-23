import { useEffect, useState, useCallback } from "react";
import { Plus, MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react';

import PageHeader from "../../../components/common/PageHeader";
import CredentialsReveal from "../../../components/common/CredentialsReveal";
import { usersApi } from "../api/usersApi";
import type { AppUser, UserRole } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLES: UserRole[] = ["admin", "principal", "academic_officer", "teacher", "accountant", "student", "parent"];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  principal: "Principal",
  academic_officer: "Academic Officer",
  teacher: "Teacher",
  accountant: "Accountant",
  student: "Student",
  parent: "Parent",
};

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{created ? "User Created" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {created
              ? "The account has been created and can log in now."
              : "For staff roles without their own creation flow (principal, accountant, academic officer, admin)"}
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
                <Label htmlFor="user-first-name" className="text-xs font-medium">First Name *</Label>
                <Input id="user-first-name" name="firstName" required placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-last-name" className="text-xs font-medium">Last Name *</Label>
                <Input id="user-last-name" name="lastName" required placeholder="Last name" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-medium">Email *</Label>
              <Input id="user-email" name="email" type="email" required placeholder="user@school.edu" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-medium">System Role *</Label>
              <NativeSelect id="user-role" name="role" required defaultValue="">
                <option value="" disabled>Select a role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </NativeSelect>
            </div>

            <p className="text-[11px] text-muted-foreground">
              A temporary login password is generated automatically — you'll see it once, right after saving.
            </p>

            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="pt-2">
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

export default function UserListPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { users: list } = await usersApi.getAll({ limit: 200, search: search || undefined, role: roleFilter || undefined });
      setUsers(list);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  async function handleRoleChange(user: AppUser, role: string) {
    await usersApi.updateRole(user._id, role);
    load();
  }

  async function handleStatusToggle(user: AppUser) {
    await usersApi.updateStatus(user._id, !user.status);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage all system accounts and their roles — teachers, parents, and students already get accounts through their own pages; use this for principal, accountant, academic officer, and admin accounts"
        action={
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus size={16} /> Add User
          </Button>
        }
      />

      <div className="bg-card rounded-xl border p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        <NativeSelect
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 text-xs min-w-[160px]"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </NativeSelect>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table className="w-full text-sm min-w-[750px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-3">Name</TableHead>
              <TableHead className="px-4 py-3">Email</TableHead>
              <TableHead className="px-4 py-3">Role</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3">Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">Loading users...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-destructive text-xs">{error}</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">No users found.</TableCell></TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="px-6 py-4 font-semibold text-foreground whitespace-nowrap flex items-center gap-2">
                    <ShieldCheck size={14} className="text-muted-foreground" /> {user.name}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-muted-foreground whitespace-nowrap">{user.email}</TableCell>
                  <TableCell className="px-4 py-4 whitespace-nowrap">
                    <NativeSelect
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="px-4 py-4 whitespace-nowrap">
                    <Button
                      variant={user.status ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleStatusToggle(user)}
                      className="text-xs h-7 px-2.5"
                    >
                      {user.status ? "Active" : "Deactivated"}
                    </Button>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-muted-foreground text-xs whitespace-nowrap">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </div>
  );
}