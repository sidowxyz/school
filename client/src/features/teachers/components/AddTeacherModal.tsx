import { useState } from "react";
import { teachersApi } from "../api/teachersApi";
import CredentialsReveal from "../../../components/common/CredentialsReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function AddTeacherModal({ onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    try {
      const result = await teachersApi.create({
        name: String(form.get("fullName") || ""),
        email: String(form.get("email") || ""),
        department: String(form.get("department") || "") || undefined,
        qualifications: String(form.get("qualification") || "") || undefined,
        status: (form.get("status") as "Active" | "On Leave" | "Inactive") || undefined,
      });
      setCreated({ email: result.user.email, password: result.temporaryPassword });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create teacher.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {created ? "Teacher Registered" : "Add New Teacher"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "The account has been created and can log in now."
              : "Register a new faculty member into the school management system"}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <CredentialsReveal
            title="Teacher account created"
            email={created.email}
            password={created.password}
            onDone={onClose}
          />
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div className="space-y-3">
              <div className="border-b pb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Personal Information
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-fullname" className="text-xs font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="teacher-fullname"
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Smith"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="teacher-email" className="text-xs font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="teacher-email"
                    name="email"
                    type="email"
                    required
                    placeholder="teacher@school.edu"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Staff ID and temporary login password will be generated automatically.
              </p>
            </div>

            {/* Academic Information */}
            <div className="space-y-3">
              <div className="border-b pb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Academic Information
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-dept" className="text-xs font-medium">
                    Department
                  </Label>
                  <NativeSelect id="teacher-dept" name="department" defaultValue="">
                    <option value="">Select Department</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="ICT">ICT</option>
                    <option value="Business">Business</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="teacher-qual" className="text-xs font-medium">
                    Qualification
                  </Label>
                  <Input
                    id="teacher-qual"
                    name="qualification"
                    type="text"
                    placeholder="e.g. Master of Education"
                  />
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div className="space-y-3">
              <div className="border-b pb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Employment Status
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-status" className="text-xs font-medium">
                    Status
                  </Label>
                  <NativeSelect id="teacher-status" name="status" defaultValue="Active">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </NativeSelect>
                </div>
              </div>
            </div>

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
                {submitting ? "Saving..." : "Save Teacher"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
