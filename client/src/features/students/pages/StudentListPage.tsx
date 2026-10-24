import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useCan } from "../../../hooks/usePermission";
import {
  Plus,
  MagnifyingGlass,
  DownloadSimple,
  Eye,
  Users,
  UserCheck,
  UserCircle,
  Warning,
  PencilSimple,
  Trash,
  UserPlus,
  UserList,
  GraduationCap,
  Phone,
  UsersThree,
  Key,
  CheckCircle,
  Student as StudentIcon,
} from '@phosphor-icons/react';

import { studentsApi } from "../api/studentsApi";
import type { Student, CreateStudentPayload, RefClass, RefGuardian, RefSection, StudentStatus } from "../types";
import CredentialsReveal from "../../../components/common/CredentialsReveal";
import { useAcademicYearStore } from "../../../store/academicYearStore";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormSection } from '@/components/ui/drawer-kit';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/common/PageHeader';
import StatStrip from '@/components/shared/StatStrip';
import { downloadCSV } from '../../reports/utils/csv';
import { TableEmptyRow, TableLoadingRows, ErrorState } from "@/components/common/EmptyState";

// Helpers

function refId(ref: string | { _id: string } | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

function refLabel(ref: string | { _id: string } | null | undefined, field: string): string {
  if (!ref || typeof ref === "string") return "—";
  return (ref as unknown as Record<string, string>)[field] ?? "—";
}

function assignedGuardian(student: Student) {
  const link = student.guardians?.[0]?.guardianId;
  if (!link || typeof link === "string") return null;
  return link;
}

function getStatusBadgeVariant(status: StudentStatus): "success" | "destructive" | "warning" | "secondary" {
  if (status === "Active") return "success";
  if (status === "Suspended") return "destructive";
  if (status === "Inactive") return "warning";
  return "secondary";
}

// Add / Edit Student Modal

function StudentFormModal({
  mode, initial, classes, sections, guardians, onClose, onSaved,
}: {
  mode: "add" | "edit";
  initial?: Student;
  classes: RefClass[];
  sections: RefSection[];
  guardians: RefGuardian[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialClassId = initial ? refId(initial.classId) : "";
  const initialSectionId = initial ? refId(initial.sectionId) : "";

  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [gender, setGender] = useState<"Male" | "Female" | "">(initial?.gender ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate?.slice(0, 10) ?? "");
  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const currentGuardian = initial ? assignedGuardian(initial) : null;
  const [guardianMode, setGuardianMode] = useState<"new" | "existing">("new");
  const [guardianId, setGuardianId] = useState("");
  const [guardianName, setGuardianName] = useState(initial?.parentName ?? "");
  const [guardianRelationship, setGuardianRelationship] = useState("Parent");
  const [guardianPhone, setGuardianPhone] = useState(initial?.parentPhoneNumber ?? "");
  const [guardianEmail, setGuardianEmail] = useState(currentGuardian?.email ?? "");
  const [createParentAccount, setCreateParentAccount] = useState(false);
  const [status, setStatus] = useState<StudentStatus>(initial?.status ?? "Active");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [createAccount, setCreateAccount] = useState(mode === "add" && !initial?.userId);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<Array<{ title: string; email: string; password: string }>>([]);
  const [credentialIndex, setCredentialIndex] = useState(0);

  const classSections = useMemo(
    () => sections.filter((section) => refId(section.class) === classId),
    [classId, sections],
  );
  const selectedGuardian = guardians.find((guardian) => guardian._id === guardianId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const parentName = mode === "add" ? (selectedGuardian?.name || guardianName) : initial?.parentName || guardianName;
    const parentPhoneNumber = mode === "add" ? (selectedGuardian?.phone || guardianPhone) : initial?.parentPhoneNumber || guardianPhone;
    const payload: CreateStudentPayload = {
      firstName, lastName, gender: gender as "Male" | "Female", birthDate,
      classId, sectionId: sectionId || null, phoneNumber, address, parentName, parentPhoneNumber,
      email: email || undefined,
      status: mode === "edit" ? status : undefined,
      guardian: mode === "add" ? (guardianMode === "existing"
        ? { mode: "existing", guardianId }
        : {
            mode: "new", name: guardianName, relationship: guardianRelationship,
            phone: guardianPhone, email: guardianEmail || undefined,
            createPortalUser: createParentAccount,
          }) : undefined,
    };

    try {
      if (mode === "add") {
        const student = await studentsApi.create(payload);
        const issuedCredentials: Array<{ title: string; email: string; password: string }> = [];
        if (student.parentPortalCredentials) {
          issuedCredentials.push({
            title: "Parent portal account created",
            email: student.parentPortalCredentials.email,
            password: student.parentPortalCredentials.temporaryPassword,
          });
        }
        if (createAccount) {
          const result = await studentsApi.createAccount(student._id, { email });
          issuedCredentials.push({ title: "Student portal account created", email: result.account.email, password: result.temporaryPassword });
        }
        onSaved();
        if (issuedCredentials.length) {
          setCredentials(issuedCredentials);
          setCredentialIndex(0);
          return;
        }
        onClose();
      } else if (initial) {
        await studentsApi.update(initial._id, payload);
        onSaved();
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save student record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader
          icon={credentials.length ? CheckCircle : mode === "add" ? UserPlus : PencilSimple}
          tint={credentials.length ? "green" : "blue"}
        >
          <DialogTitle>
            {credentials.length ? "Registration Complete" : mode === "add" ? "Register Student" : "Edit Student Information"}
          </DialogTitle>
          <DialogDescription>
            {credentials.length
              ? "Save the generated portal credentials before closing."
              : mode === "add" ? "Fill in the student's details, class and family contact." : "Update the student's details and status."}
          </DialogDescription>
        </DialogHeader>

          {credentials.length ? (
            <CredentialsReveal
              title={credentials[credentialIndex].title}
              email={credentials[credentialIndex].email}
              password={credentials[credentialIndex].password}
              onDone={() => {
                if (credentialIndex < credentials.length - 1) setCredentialIndex((index) => index + 1);
                else onClose();
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
              <FormSection title="Personal details" icon={UserList}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ahmed" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mohamed" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gender</Label>
                  <NativeSelect value={gender} onChange={(e) => setGender(e.target.value as "Male" | "Female")} required className="w-full">
                    <option value="" disabled>Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <DatePicker value={birthDate} onChange={setBirthDate} max={new Date().toLocaleDateString('en-CA')} placeholder="Pick date of birth" required aria-label="Date of birth" />
                </div>
              </div>
              </FormSection>

              <FormSection title="Class" icon={GraduationCap}>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Class</Label>
                  <NativeSelect value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }} required className="w-full">
                    <option value="" disabled>Select class</option>
                    {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Section {classId && classSections.length === 0 && <span className="font-normal text-muted-foreground">(optional)</span>}
                  </Label>
                  <NativeSelect value={sectionId} onChange={(e) => setSectionId(e.target.value)} required={classSections.length > 0} disabled={!classId || classSections.length === 0} className="w-full">
                    <option value="">{!classId ? "Select class first" : classSections.length ? "Select section" : "No section assigned"}</option>
                    {classSections.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </NativeSelect>
                </div>
              </div>
              </FormSection>

              <FormSection title="Contact" icon={Phone}>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+252..." required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Residential Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, District" required />
              </div>
              </FormSection>

              {/* Guardian section */}
              {mode === "add" ? (
                <FormSection title="Guardian / family" description="Add a new guardian or link a family already registered." icon={UsersThree}>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    <Button
                      variant={guardianMode === "new" ? "default" : "ghost"}
                      size="xs"
                      type="button"
                      onClick={() => { setGuardianMode("new"); setGuardianId(""); }}
                      className="rounded-lg"
                    >
                      New Parent
                    </Button>
                    <Button
                      variant={guardianMode === "existing" ? "default" : "ghost"}
                      size="xs"
                      type="button"
                      onClick={() => setGuardianMode("existing")}
                      className="rounded-lg"
                    >
                      Existing Parent
                    </Button>
                  </div>

                  {guardianMode === "existing" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Select Parent from Database</Label>
                      <NativeSelect value={guardianId} onChange={(e) => setGuardianId(e.target.value)} required className="w-full">
                        <option value="">Select registered guardian</option>
                        {guardians.map((guardian) => (
                          <option key={guardian._id} value={guardian._id}>
                            {guardian.name} · {guardian.phone} ({guardian.childrenCount} children)
                          </option>
                        ))}
                      </NativeSelect>
                      {selectedGuardian && (
                        <p className="mt-1 rounded-xl bg-tile-green p-2.5 text-[11px] text-tile-foreground">
                          Enrolling into {selectedGuardian.name}'s family profile. Sibling discounts update automatically.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Parent name" required /></div>
                        <div className="space-y-1"><Label className="text-xs">Relationship</Label><NativeSelect value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)} required className="w-full"><option>Parent</option><option>Father</option><option>Mother</option><option>Guardian</option><option>Brother</option><option>Sister</option></NativeSelect></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} placeholder="+252..." required /></div>
                        <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="parent@email.com" required={createParentAccount} /></div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox id="createParent" checked={createParentAccount} onCheckedChange={(v) => setCreateParentAccount(v === true)} />
                        <Label htmlFor="createParent" className="text-xs text-muted-foreground cursor-pointer font-normal">
                          Issue parent portal credentials
                        </Label>
                      </div>
                    </div>
                  )}
                </FormSection>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned Parent</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{currentGuardian?.name || initial?.parentName || "—"}</p>
                  <p className="text-xs text-muted-foreground">{currentGuardian?.phone || initial?.parentPhoneNumber || "—"}</p>
                </div>
              )}

              {mode === "edit" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Enrollment Status</Label>
                  <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)} className="w-full">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Graduated">Graduated</option>
                  </NativeSelect>
                </div>
              )}

              {mode === "add" && !initial?.userId && (
                <FormSection title="Student portal" icon={Key}>
                  <div className="flex items-center gap-2">
                    <Checkbox id="createStudentAcc" checked={createAccount} onCheckedChange={(v) => setCreateAccount(v === true)} />
                    <Label htmlFor="createStudentAcc" className="text-xs font-medium text-foreground cursor-pointer">
                      Create student portal login account
                    </Label>
                  </div>
                  {createAccount && (
                    <div className="pl-6 pt-1 space-y-1">
                      <Label className="text-xs">Student Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@school.edu"
                        required={createAccount}
                      />
                    </div>
                  )}
                </FormSection>
              )}

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <Warning size={14} />
                  <span>{error}</span>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : mode === "add" ? "Register Student" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Modal

function DeleteModal({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete student record.");
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent centered className="max-w-md">
        <DialogHeader icon={Trash} tint="pink">
          <DialogTitle>Delete Student Record</DialogTitle>
          <DialogDescription>
            Permanently remove <span className="font-semibold text-foreground">{name}</span> from the student registry? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Student List Page

export default function StudentListPage() {
  const navigate = useNavigate();
  const canCreate = useCan("students", "create");
  const canEdit = useCan("students", "edit");
  const canDelete = useCan("students", "delete");
  const location = useLocation();
  const selectedYearId = useAcademicYearStore((s) => s.selectedYearId);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<RefClass[]>([]);
  const [sections, setSections] = useState<RefSection[]>([]);
  const [guardians, setGuardians] = useState<RefGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ students: list }, refData] = await Promise.all([
        studentsApi.getAll({ limit: 1000, yearId: selectedYearId || undefined }),
        studentsApi.getReferenceData(),
      ]);
      setStudents(list);
      setClasses(refData.classes);
      setSections(refData.sections);
      setGuardians(refData.guardians);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setShowAdd(true);
    }
  }, [location.state]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === "Active").length;
    const male = students.filter((s) => s.gender === "Male").length;
    const female = students.filter((s) => s.gender === "Female").length;
    return { total, active, male, female };
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const haystack = [
        `${s.firstName} ${s.lastName}`,
        s.admissionNumber,
        s.phoneNumber,
        s.parentName,
        s.parentPhoneNumber,
      ].join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(q);
      const matchesClass = !classFilter || refId(s.classId) === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, search, classFilter]);

  async function handleDelete() {
    if (!deleteTarget) return;
    await studentsApi.delete(deleteTarget._id);
    await load();
    setDeleteTarget(null);
  }

  const exportStudents = () => {
    const rows = filtered.map(s => ({
      AdmissionNumber: s.admissionNumber,
      Name: `${s.firstName} ${s.lastName}`,
      Gender: s.gender,
      Class: refLabel(s.classId, "cl_name"),
      Phone: s.phoneNumber,
      Parent: s.parentName || "—",
      Status: s.status,
    }));
    downloadCSV(`students-list-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Students"
        subtitle="Every enrolled student, their class and family."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportStudents}>
              <DownloadSimple size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            {canCreate && (
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={15} />
                Register Student
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <StatStrip
        items={[
          { label: "Total Students", value: stats.total, icon: Users, tone: "sky", hint: "Total registered in database" },
          { label: "Active Enrolled", value: stats.active, icon: UserCheck, tone: "emerald", hint: "Active class attendees" },
          { label: "Male Students", value: stats.male, icon: UserCircle, tone: "violet", hint: `${stats.total ? Math.round((stats.male / stats.total) * 100) : 0}% of student body` },
          { label: "Female Students", value: stats.female, icon: UserCircle, tone: "rose", hint: `${stats.total ? Math.round((stats.female / stats.total) * 100) : 0}% of student body` },
        ]}
      />

      {/* Combined search + Data Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-semibold whitespace-nowrap">
                Registry Records ({filtered.length})
              </CardTitle>
              <Badge variant="outline" className="text-[11px]">
                Academic Year Filtered
              </Badge>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative flex-1 max-w-xs">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by name, admission #, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <NativeSelect
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-9 text-xs w-[160px]"
              >
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
              </NativeSelect>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-semibold text-xs">Admission No.</TableHead>
                <TableHead className="font-semibold text-xs">Student Name</TableHead>
                <TableHead className="font-semibold text-xs">Class & Section</TableHead>
                <TableHead className="font-semibold text-xs">Gender</TableHead>
                <TableHead className="font-semibold text-xs">Phone</TableHead>
                <TableHead className="font-semibold text-xs">Guardian</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="text-right font-semibold text-xs pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRows columns={8} avatar />
              ) : error ? (
                <TableEmptyRow colSpan={8}><ErrorState text={error} onRetry={load} /></TableEmptyRow>
              ) : filtered.length === 0 ? (
                search || classFilter ? (
                  <TableEmptyRow
                    colSpan={8}
                    icon={MagnifyingGlass}
                    tint="violet"
                    title="No students match"
                    text="Try another name or admission number, or show all classes."
                    action={<Button variant="outline" size="sm" onClick={() => { setSearch(""); setClassFilter(""); }}>Clear filters</Button>}
                  />
                ) : (
                  <TableEmptyRow
                    colSpan={8}
                    icon={StudentIcon}
                    tint="blue"
                    title="No students yet"
                    text="Register your first student to see them here with their class, guardian and status."
                    action={canCreate && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Register Student</Button>}
                  />
                )
              ) : (
                filtered.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <span className="font-medium text-xs text-foreground">
                          {student.firstName} {student.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {refLabel(student.classId, "cl_name")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-normal">
                        {student.gender}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {student.phoneNumber}
                    </TableCell>
                    <TableCell className="text-xs">
                      {assignedGuardian(student) ? (
                        <Link to={`/parents/${assignedGuardian(student)!._id}`} className="text-primary hover:underline font-medium">
                          {assignedGuardian(student)!.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize text-[10px]">
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => navigate(`/students/${student._id}`)}
                          className="px-2"
                        >
                          <Eye size={13} /> View
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setEditTarget(student)}
                            className="px-2"
                          >
                            <PencilSimple size={13} /> Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteTarget(student)}
                            aria-label={`Delete ${student.firstName} ${student.lastName}`}
                            className="px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash size={13} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modals */}
      {showAdd && (
        <StudentFormModal
          mode="add"
          classes={classes}
          sections={sections}
          guardians={guardians}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}
      {editTarget && (
        <StudentFormModal
          mode="edit"
          initial={editTarget}
          classes={classes}
          sections={sections}
          guardians={guardians}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          name={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}