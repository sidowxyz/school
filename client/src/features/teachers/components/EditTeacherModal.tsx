import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { teachersApi } from "../api/teachersApi";
import type { Teacher } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FormSection } from "@/components/ui/drawer-kit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEPARTMENTS = ["Mathematics", "Science", "English", "ICT", "Business"];

/** Change a teacher's name, email, department, qualifications or status. */
export default function EditTeacherModal({ teacher, onClose, onSaved }: { teacher: Teacher; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(teacher.userId?.name ?? "");
  const [email, setEmail] = useState(teacher.userId?.email ?? "");
  const [department, setDepartment] = useState(teacher.department ?? "");
  const [qualifications, setQualifications] = useState(teacher.qualifications ?? "");
  const [status, setStatus] = useState<Teacher["status"]>(teacher.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Keep a department that isn't in the standard list (set elsewhere) selectable.
  const departments = department && !DEPARTMENTS.includes(department) ? [department, ...DEPARTMENTS] : DEPARTMENTS;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await teachersApi.update(teacher._id, { name: name.trim(), email: email.trim(), department, qualifications: qualifications.trim(), status });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save the teacher.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader icon={PencilSimple} tint="green">
          <DialogTitle>Edit teacher</DialogTitle>
          <DialogDescription>Changes to the name and email also change how they sign in.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <FormSection title="Teacher">
            <div className="space-y-1.5">
              <Label htmlFor="et-name" className="text-xs font-semibold">Full name *</Label>
              <Input id="et-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et-email" className="text-xs font-semibold">Email *</Label>
              <Input id="et-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="et-dept" className="text-xs font-semibold">Department</Label>
                <NativeSelect id="et-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="et-status" className="text-xs font-semibold">Status</Label>
                <NativeSelect id="et-status" value={status} onChange={(e) => setStatus(e.target.value as Teacher["status"])}>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et-qual" className="text-xs font-semibold">Qualifications</Label>
              <Input id="et-qual" value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="e.g. Master of Education" />
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
