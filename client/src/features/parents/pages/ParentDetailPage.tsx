import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Percent, Plus, Trash, ArrowLeft, UserPlus } from '@phosphor-icons/react';

import { parentsApi, siblingRulesApi } from "../api/parentsApi";
import type { ParentDetail, UnassignedStudent, SiblingRule } from "../types";
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
      <DialogContent className="max-w-md">
        <DialogHeader>
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
                  {s.firstName} {s.lastName} â€” {s.admissionNumber}
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

function SiblingRulesPanel() {
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
    await siblingRulesApi.update(rule._id, { is_active: !rule.is_active });
    load();
  }

  async function remove(rule: SiblingRule) {
    await siblingRulesApi.remove(rule._id);
    load();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Percent size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">Sibling Discount Rules</h3>
        </div>
        <Button variant="plain" onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800">
          <Plus size={14} /> Add Rule
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="grid grid-cols-3 gap-3 mb-4 bg-gray-50 rounded-lg p-3">
          <Input required placeholder="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)}
            className="col-span-3 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="text-xs text-gray-500">Min. siblings</label>
            <Input required type="number" min={2} value={minSiblings} onChange={(e) => setMinSiblings(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Discount %</label>
            <Input required type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <Button variant="plain" type="submit" disabled={submitting} className="self-end bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg px-3 py-2">
            {submitting ? "Saving..." : "Save"}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-gray-400">No sibling discount rules configured yet.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r._id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{r.rule_name}</p>
                <p className="text-xs text-gray-400">{r.minimum_siblings}+ siblings â†’ {r.discount_percentage}% off</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="plain" onClick={() => toggleActive(r)} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {r.is_active ? "Active" : "Inactive"}
                </Button>
                <Button variant="plain" onClick={() => remove(r)} className="text-gray-400 hover:text-red-500"><Trash size={15} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAssign, setShowAssign] = useState(false);

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
    await parentsApi.unassignStudent(id, studentId);
    load();
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>;
  if (error || !detail) return <div className="text-center py-12 text-red-500 text-sm">{error || "Not found"}</div>;

  const { parent, children, discountPercent } = detail;

  return (
    <div className="space-y-6">
      <Button variant="plain" onClick={() => navigate("/parents")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to Parents
      </Button>

      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{parent.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{parent.relationship} â€¢ {parent.phone}{parent.email ? ` â€¢ ${parent.email}` : ""}</p>
          {discountPercent > 0 && (
            <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              {discountPercent}% sibling discount applies to this household
            </span>
          )}
        </div>
        <Button variant="plain"
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
        >
          <UserPlus size={16} /> Assign a Student
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Children ({children.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50">
                <TableHead className="text-left font-semibold text-gray-600 px-6 py-3">Name</TableHead>
                <TableHead className="text-left font-semibold text-gray-600 px-4 py-3">Admission No.</TableHead>
                <TableHead className="text-left font-semibold text-gray-600 px-4 py-3">Class</TableHead>
                <TableHead className="text-left font-semibold text-gray-600 px-4 py-3">Status</TableHead>
                <TableHead className="text-left font-semibold text-gray-600 px-4 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {children.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400 text-sm">No students assigned yet.</TableCell></TableRow>
              ) : (
                children.map((child) => (
                  <TableRow key={child._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <TableCell className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      <Link to={`/students/${child._id}`} className="hover:text-green-600">{child.firstName} {child.lastName}</Link>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-gray-600 whitespace-nowrap">{child.admissionNumber}</TableCell>
                    <TableCell className="px-4 py-4 text-gray-600 whitespace-nowrap">{child.classId?.cl_name || "â€”"}</TableCell>
                    <TableCell className="px-4 py-4 text-gray-600 whitespace-nowrap">{child.status}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap">
                      <Button variant="plain" onClick={() => handleRemoveChild(child._id)} className="text-gray-500 hover:text-red-600 text-sm font-medium">
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SiblingRulesPanel />

      {showAssign && id && (
        <AssignStudentModal parentId={id} onClose={() => setShowAssign(false)} onAssigned={load} />
      )}
    </div>
  );
}