import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCan } from "../../../hooks/usePermission";
import { Envelope, Percent, Phone, Plus, Trash, UserPlus, Student, PencilSimple, UsersThree, IdentificationCard, Key } from '@phosphor-icons/react';
import { InfoGrid, ProfileHero, ProfileSection } from "@/components/shared/ProfileKit";
import StatStrip from "@/components/shared/StatStrip";
import { FormSection } from "@/components/ui/drawer-kit";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/common/EmptyState";

import { parentsApi, siblingRulesApi } from "../api/parentsApi";
import type { Parent, ParentDetail, UnassignedStudent, SiblingRule } from "../types";
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TableEmptyRow, EmptyState, ListLoading } from "@/components/common/EmptyState";
import { confirmAction } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

function AssignStudentModal({ parentId, onClose, onAssigned }: { parentId: string; onClose: () => void; onAssigned: () => void }) {
  const [students, setStudents] = useState<UnassignedStudent[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    parentsApi.getUnassignedStudents()
      .then(setStudents)
      .catch(() => setError("Failed to load unassigned students."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAssign() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      await parentsApi.assignStudent(parentId, selected);
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to assign student.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader icon={UserPlus} tint="pink">
          <DialogTitle>Assign a Student</DialogTitle>
          <DialogDescription>
            Only students without a parent already assigned are listed.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Every student already has a parent assigned.</p>
        ) : (
          <div className="py-2">
            <Label className="mb-1 block">Select Student</Label>
            <NativeSelect
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full"
            >
              <option value="" disabled>Select a student</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName} — {s.admissionNumber}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selected || submitting}
          >
            {submitting ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sibling discount rules are a fee policy: admins change them, others see them.
function SiblingRulesPanel() {
  const canEdit = useCan("fees-setup", "edit");
  const [rules, setRules] = useState<SiblingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [minSiblings, setMinSiblings] = useState("2");
  const [discountPct, setDiscountPct] = useState("10");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await siblingRulesApi.getAll());
    } catch {
      setError("Failed to load sibling discount rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const appliesTo = await siblingRulesApi.getDefaultAppliesTo();
      if (!appliesTo) throw new Error("No fee category configured to attach this rule to.");
      await siblingRulesApi.create({
        rule_id: `SIB-${Date.now()}`,
        rule_name: ruleName,
        minimum_siblings: Number(minSiblings),
        discount_percentage: Number(discountPct),
        applies_to_id: appliesTo._id,
        is_active: true,
      });
      setRuleName(""); setMinSiblings("2"); setDiscountPct("10"); setShowAdd(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to create rule.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(rule: SiblingRule) {
    setError("");
    try {
      await siblingRulesApi.update(rule._id, { is_active: !rule.is_active });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not change the rule.");
    }
  }

  async function remove(rule: SiblingRule) {
    if (!(await confirmAction({ title: `Delete the rule "${rule.rule_name}"?`, text: "Families it applies to lose this discount on new bills.", confirmLabel: "Delete rule", tone: "danger" }))) return;
    setError("");
    try {
      await siblingRulesApi.remove(rule._id);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not delete the rule.");
    }
  }

  return (
    <ProfileSection icon={Percent} tint="yellow" title="Sibling discount rules" description="School-wide: families with several children get these discounts."
      action={canEdit && <Button variant="soft" size="xs" onClick={() => setShowAdd((v) => !v)}><Plus size={14} /> Add Rule</Button>}>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 grid grid-cols-3 gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3">
          <Input required placeholder="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)}
            className="col-span-3 border border-border rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="text-xs text-muted-foreground">Min. siblings</label>
            <Input required type="number" min={2} value={minSiblings} onChange={(e) => setMinSiblings(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Discount %</label>
            <Input required type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <Button variant="default" type="submit" disabled={submitting} className="self-end">
            {submitting ? "Saving..." : "Save"}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      {loading ? (
        <ListLoading rows={2} />
      ) : rules.length === 0 ? (
        <EmptyState compact icon={Percent} tint="green" title="No sibling discount rules" text="Add a rule to give families with several children a discount." />
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{r.rule_name}</p>
                <p className="text-xs text-muted-foreground">{r.minimum_siblings}+ siblings → {r.discount_percentage}% off</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="plain" onClick={() => toggleActive(r)} disabled={!canEdit} className={`text-xs font-semibold px-2.5 py-1 rounded-full disabled:opacity-100 ${r.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {r.is_active ? "Active" : "Inactive"}
                </Button>
                {canEdit && <Button variant="ghost" size="icon-sm" onClick={() => remove(r)} aria-label={`Delete ${r.rule_name}`} className="hover:bg-destructive/10 hover:text-destructive"><Trash size={15} /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

function EditParentModal({ parent, onClose, onSaved }: { parent: Parent; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(parent.name);
  const [relationship, setRelationship] = useState(parent.relationship);
  const [phone, setPhone] = useState(parent.phone);
  const [email, setEmail] = useState(parent.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await parentsApi.update(parent._id, { name: name.trim(), relationship, phone: phone.trim(), email: email.trim() || undefined });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save the parent.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader icon={PencilSimple} tint="pink">
          <DialogTitle>Edit parent</DialogTitle>
          <DialogDescription>Their children's records show the new name and phone.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <FormSection title="Parent or guardian">
            <div className="space-y-1.5">
              <Label htmlFor="ep-name" className="text-xs font-semibold">Full name *</Label>
              <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ep-rel" className="text-xs font-semibold">Relationship *</Label>
                <NativeSelect id="ep-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                  {[...new Set([relationship, "Parent", "Father", "Mother", "Guardian", "Brother", "Sister"])].map((r) => <option key={r}>{r}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-phone" className="text-xs font-semibold">Phone *</Label>
                <Input id="ep-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-email" className="text-xs font-semibold">Email</Label>
              <Input id="ep-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
            </div>
          </FormSection>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ParentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEditParent = useCan("parents", "edit");
  const canDeleteParent = useCan("parents", "delete");
  const { showToast } = useToast();
  const [detail, setDetail] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setDetail(await parentsApi.getById(id));
      setError("");
    } catch {
      setError("Failed to load parent.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleRemoveChild(studentId: string) {
    if (!id) return;
    if (!(await confirmAction({ title: "Remove this child from the parent?", text: "The student record stays; only the link to this family is removed.", confirmLabel: "Remove child", tone: "danger" }))) return;
    try {
      await parentsApi.unassignStudent(id, studentId);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Could not remove the child.", "error");
    }
  }

  async function handleDelete() {
    if (!id || !detail) return;
    const ok = await confirmAction({
      title: `Delete ${detail.parent.name}?`,
      text: "Their contact details are removed and their portal login stops. This can't be undone.",
      confirmLabel: "Delete parent",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await parentsApi.remove(id);
      showToast(`${detail.parent.name} deleted.`);
      navigate("/parents");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Could not delete the parent.", "error");
    }
  }

  if (loading) return <Card className="rounded-2xl"><ListLoading rows={5} /></Card>;
  if (error || !detail) {
    return (
      <Card className="rounded-2xl">
        <ErrorState text={error || "This parent couldn't be found."} onRetry={error ? load : undefined} />
        <div className="-mt-8 pb-8 text-center"><Button variant="outline" onClick={() => navigate("/parents")}>Back to Parents</Button></div>
      </Card>
    );
  }

  const { parent, children, discountPercent } = detail;
  const portal = parent.userId && typeof parent.userId !== "string" ? parent.userId : null;
  const owing = children.filter((c) => c.status === "Active").length;

  return (
    <div className="space-y-6">
      <ProfileHero
        name={parent.name}
        kind={`${parent.relationship} · ${children.length} ${children.length === 1 ? "child" : "children"}`}
        onBack={() => navigate("/parents")}
        backLabel="Parents"
        chips={[
          { icon: Phone, label: parent.phone },
          ...(parent.email ? [{ icon: Envelope, label: parent.email }] : []),
          { icon: Key, label: portal ? (portal.status ? "Has a portal login" : "Portal login switched off") : "No portal login" },
        ]}
        actions={canEditParent && <>
          <Button variant="outline" className="border-transparent bg-card/80" onClick={() => setEditing(true)}><PencilSimple size={16} /> Edit</Button>
          <Button onClick={() => setShowAssign(true)}><UserPlus size={16} /> Assign a Student</Button>
        </>}
      />

      <StatStrip items={[
        { label: "Children", value: children.length, icon: UsersThree, tone: "sky", hint: `${owing} in school now` },
        { label: "Sibling discount", value: `${discountPercent}%`, icon: Percent, tone: discountPercent > 0 ? "emerald" : "muted", hint: discountPercent > 0 ? "Off every child's monthly fee" : "Needs more children in school" },
        { label: "Portal", value: portal ? (portal.status ? "On" : "Off") : "None", icon: IdentificationCard, tone: "violet", hint: portal ? portal.email : "Create one when registering a child" },
      ]} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ProfileSection icon={Student} tint="blue" title={`Children (${children.length})`} description="Open a child to see their profile, fees and results." flush>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
                  <TableHead className="pl-5 font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Admission no.</TableHead>
                  <TableHead className="font-semibold">Class</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="pr-5 text-right font-semibold"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.length === 0 ? (
                  <TableEmptyRow
                    colSpan={5}
                    icon={Student}
                    tint="pink"
                    title="No children linked"
                    text="Link this parent's children so their fees, attendance and sibling discount show up together."
                    action={canEditParent && <Button variant="outline" size="sm" onClick={() => setShowAssign(true)}><UserPlus size={15} /> Assign a Student</Button>}
                  />
                ) : (
                  children.map((child) => (
                    <TableRow key={child._id}>
                      <TableCell className="py-3 pl-5 font-medium">
                        <Link to={`/students/${child._id}`} className="text-foreground hover:text-primary">{child.firstName} {child.lastName}</Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{child.admissionNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{child.classId?.cl_name || "—"}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${child.status === "Active" ? "bg-tile-green text-tile-foreground" : "bg-muted text-muted-foreground"}`}>{child.status}</span>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {canEditParent && (
                          <Button variant="ghost" size="xs" onClick={() => handleRemoveChild(child._id)} className="hover:bg-destructive/10 hover:text-destructive">Remove</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ProfileSection>

        <ProfileSection icon={IdentificationCard} tint="pink" title="Details">
          <InfoGrid items={[
            { label: "Full name", value: parent.name, wide: true },
            { label: "Relationship", value: parent.relationship },
            { label: "Phone", value: parent.phone, icon: Phone },
            { label: "Email", value: parent.email, icon: Envelope, wide: true },
            { label: "Portal login", value: portal ? portal.email : "", empty: "None", wide: true },
          ]} />
          {canDeleteParent && (
            <div className="mt-5 border-t border-border pt-4">
              {children.length === 0 ? (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void handleDelete()}>
                  <Trash size={15} /> Delete parent
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">To delete this parent, remove their children first (or move them to another parent).</p>
              )}
            </div>
          )}
        </ProfileSection>
      </div>

      <SiblingRulesPanel />

      {editing && <EditParentModal parent={parent} onClose={() => setEditing(false)} onSaved={load} />}
      {showAssign && id && (
        <AssignStudentModal parentId={id} onClose={() => setShowAssign(false)} onAssigned={load} />
      )}
    </div>
  );
}