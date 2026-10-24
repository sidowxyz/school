import { UsersThree, CheckCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { parentsApi } from "../api/parentsApi";
import CredentialsReveal from "../../../components/common/CredentialsReveal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function AddParentModal({ onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createPortalUser, setCreatePortalUser] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    try {
      const result = await parentsApi.create({
        name: String(form.get("name") || ""),
        relationship: String(form.get("relationship") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || "") || undefined,
        createPortalUser,
      });
      if (result.user && result.temporaryPassword) {
        setCreated({ email: result.user.email, password: result.temporaryPassword });
      } else {
        onCreated();
        onClose();
        return;
      }
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create parent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader icon={created ? CheckCircle : UsersThree} tint={created ? "green" : "pink"}>
          <DialogTitle>
            {created ? "Parent Registered" : "Add New Parent"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "The account has been created and can log in now."
              : "Register a parent/guardian who can then be assigned students"}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <CredentialsReveal
            title="Parent account created"
            email={created.email}
            password={created.password}
            onDone={onClose}
          />
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="parent-name" className="text-xs font-medium">
                Full Name *
              </Label>
              <Input
                id="parent-name"
                name="name"
                type="text"
                required
                placeholder="Enter full name"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="parent-rel" className="text-xs font-medium">
                  Relationship *
                </Label>
                <NativeSelect id="parent-rel" name="relationship" required defaultValue="">
                  <option value="" disabled>Select relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="parent-phone" className="text-xs font-medium">
                  Phone *
                </Label>
                <Input
                  id="parent-phone"
                  name="phone"
                  type="text"
                  required
                  placeholder="+252..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent-email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="parent-email"
                name="email"
                type="email"
                placeholder="parent@example.com"
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-portal-acc"
                  checked={createPortalUser}
                  onCheckedChange={(v) => setCreatePortalUser(v === true)}
                />
                <Label htmlFor="create-portal-acc" className="text-xs font-medium cursor-pointer">
                  Create a portal login account for this parent
                </Label>
              </div>
              {createPortalUser && (
                <p className="text-[11px] text-muted-foreground pl-6">
                  Requires a valid email address. A temporary password will be generated automatically.
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Parent"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
