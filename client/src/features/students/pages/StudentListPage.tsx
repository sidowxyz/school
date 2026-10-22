import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Plus,
  MagnifyingGlass,
  DownloadSimple,
  X,
  Eye,
  Users,
  UserCheck,
  UserCircle,
  CircleUser,
  Warning,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react';

import { studentsApi } from "../api/studentsApi";
import type { Student, CreateStudentPayload, RefClass, RefGuardian, RefSection, StudentStatus } from "../types";
import CredentialsReveal from "../../../components/common/CredentialsReveal";
import { useAcademicYearStore } from "../../../store/academicYearStore";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/common/PageHeader';
import StatStrip from '@/components/shared/StatStrip';
import { downloadCSV } from '../../reports/utils/csv';

// Helpers

function refId(ref: string | { _id: string } | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

function refLabel(ref: string | { _id: string } | null | undefined, field: string): string {
  if (!ref || typeof ref === "string") return "â€”";
  return (ref as unknown as Record<string, string>)[field] ?? "â€”";
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
    () => sections.Funnel((section) => refId(section.class) === classId),
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
      setError(err?.response?.data?.message || "Failed to FloppyDisk student record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-lg shadow-xl border-border animate-in fade-in-50 zoom-in-95 my-8 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-start justify-between pb-4 border-b border-border">
          <div>
            <CardTitle className="text-lg font-bold">
              {credentials.length ? "Registration Complete" : mode === "add" ? "Register Student" : "Edit Student Information"}
            </CardTitle>
            <CardDescription className="text-xs">
              {credentials.length
                ? "Save the generated portal credentials before closing."
                : mode === "add" ? "Fill in the required academic and demographic details" : "Update student profile and status"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto p-6 space-y-4 flex-1">
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                </div>
              </div>

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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+252..." required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Residential Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, District" required />
              </div>

              {/* Guardian section */}
              {mode === "add" ? (
                <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Guardian / Family Contact</h3>
                    <p className="text-[11px] text-muted-foreground">Attach a new guardian or link an existing family profile</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-md">
                    <Button
                      variant={guardianMode === "new" ? "default" : "ghost"}
                      size="sm"
                      type="button"
                      onClick={() => { setGuardianMode("new"); setGuardianId(""); }}
                      className="text-xs h-7"
                    >
                      New Parent
                    </Button>
                    <Button
                      variant={guardianMode === "existing" ? "default" : "ghost"}
                      size="sm"
                      type="button"
                      onClick={() => setGuardianMode("existing")}
                      className="text-xs h-7"
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
                            {guardian.name} Â· {guardian.phone} ({guardian.childrenCount} children)
                          </option>
                        ))}
                      </NativeSelect>
                      {selectedGuardian && (
                        <p className="text-[11px] text-primary bg-primary/10 p-2 rounded-md mt-1">
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
                </div>
              ) : (
                <div className="rounded-lg border border-border p-3 bg-muted/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned Parent</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{currentGuardian?.name || initial?.parentName || "â€”"}</p>
                  <p className="text-xs text-muted-foreground">{currentGuardian?.phone || initial?.parentPhoneNumber || "â€”"}</p>
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
                <div className="border-t border-border pt-3 space-y-2">
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
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <Warning size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : mode === "add" ? "Register Student" : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <Card className="w-full max-w-md shadow-xl border-border animate-in fade-in-50 zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Warning size={18} /> Delete Student Record
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              This action is permanent and cannot be undone.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <X size={15} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Are you sure you want to permanently remove <span className="font-semibold text-foreground">{name}</span> from the student registry?
          </p>
          {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" onClick={confirm} disabled={deleting}>
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Student List Page

export default function StudentListPage() {
  const navigate = useNavigate();
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
        studentsApi.getAll({ limit: 200, yearId: selectedYearId || undefined }),
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
    const active = students.Funnel((s) => s.status === "Active").length;
    const male = students.Funnel((s) => s.gender === "Male").length;
    const female = students.Funnel((s) => s.gender === "Female").length;
    return { total, active, male, female };
  }, [students]);

  const filtered = useMemo(() => {
    return students.Funnel((s) => {
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
  }, [students, MagnifyingGlass, classFilter]);

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
      Parent: s.parentName || "â€”",
      Status: s.status,
    }));
    downloadCSV(`students-list-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Students"
        subtitle="Manage enrolled students, academic placement, and portal credentials."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportStudents} className="gap-2">
              <DownloadSimple size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
              <Plus size={15} />
              Register Student
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <StatStrip
        items={[
          { label: "Total Students", value: stats.total, icon: Users, tone: "sky", hint: "Total registered in database" },
          { label: "Active Enrolled", value: stats.active, icon: UserCheck, tone: "emerald", hint: "Active class attendees" },
          { label: "Male Students", value: stats.male, icon: UserCircle, tone: "violet", hint: `${stats.total ? Math.round((stats.male / stats.total) * 100) : 0}% of student body` },
          { label: "Female Students", value: stats.female, icon: CircleUser, tone: "rose", hint: `${stats.total ? Math.round((stats.female / stats.total) * 100) : 0}% of student body` },
        ]}
      />

      {/* Combined MagnifyingGlass + Data Table */}
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
                  value={MagnifyingGlass}
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
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                    Loading student records...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                    No students match the selected criteria.
                  </TableCell>
                </TableRow>
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
                          size="sm"
                          onClick={() => navigate(`/students/${student._id}`)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Eye size={13} /> View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditTarget(student)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <PencilSimple size={13} /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(student)}
                          className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash size={13} />
                        </Button>
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