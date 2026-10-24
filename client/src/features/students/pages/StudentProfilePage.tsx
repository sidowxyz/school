import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    DownloadSimple, PencilSimple, User, Users, Envelope, Phone, MapPin,
    CurrencyDollar, CheckCircle, WarningCircle,
    XCircle, Clock, FileText, UploadSimple, Shield, GraduationCap,
    Calendar, Trash, BookOpen,
  FileArrowUp,
  PencilSimpleLine,
  CalendarCheck,
  Receipt,
  Exam,
  Cake,
  IdentificationCard,
  House,
} from '@phosphor-icons/react';
import { studentsApi } from "../api/studentsApi";
import { academicApi } from "../../academic-structure/api/academicApi";
import { useCan, usePermission } from "../../../hooks/usePermission";
import { examsApi } from "../../exams/api/examsApi";
import { ReportCardPanel } from "../../exams/components/ReportCard";
import type {
    Student as ApiStudent, RefClass, RefSection, AssignedGuardian,
    AttendanceRecord, Invoice, StudentDocument as ApiDocument,
} from "../types";
import type { Subject } from "../../academic-structure/types";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState, ErrorState, ListLoading } from "@/components/common/EmptyState";
import StatStrip from "@/components/shared/StatStrip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoGrid, ProfileHero, ProfileSection } from "@/components/shared/ProfileKit";
import { confirmAction } from '@/components/common/ConfirmDialog';

// Types

/** Term report cards, from the marks teachers entered (published or not). */
function ResultsTab({ studentId }: { studentId: string }) {
    const load = useCallback((termId?: string) => examsApi.reportCard(studentId, termId), [studentId]);
    return (
        <Card className="rounded-2xl p-5">
            <ReportCardPanel load={load} emptyText="No marks have been entered for this student yet." />
        </Card>
    );
}

type ProfileTab = "Personal" | "Academic" | "Attendance" | "Results" | "Fees" | "Documents";

interface StudentBase {
    id: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    gender: string;
    dob: string;
    classId: string;
    classRefId: string;
    section: string;
    classAdvisor: string;
    phone: string;
    address: string;
    email: string;
    parentName: string;
    parentPhone: string;
    status: string;
    photo?: string;
    bloodGroup: string;
    city: string;
    country: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    previousSchool: string;
    house: string;
}

// Helpers

function calcAge(dob: string) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function pctColor(pct: number) {
    if (pct >= 90) return "text-success";
    if (pct >= 80) return "text-warning";
    return "text-destructive";
}

function formatBytes(bytes: number): string {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function personName(ref: { firstName: string; lastName: string } | string | null | undefined): string {
    if (!ref || typeof ref === "string") return "—";
    return `${ref.firstName} ${ref.lastName}`;
}

function toStudentBase(s: ApiStudent): StudentBase {
    const section = s.sectionId && typeof s.sectionId !== "string" ? s.sectionId : null;
    const classTeacher = section?.classTeacherId && typeof section.classTeacherId !== "string" ? section.classTeacherId : null;
    return {
        id: s._id,
        rollNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        dob: s.birthDate?.slice(0, 10) ?? "",
        classId: s.classId && typeof s.classId !== "string" ? s.classId.cl_name : "—",
        classRefId: s.classId && typeof s.classId !== "string" ? s.classId._id : "",
        section: section?.name ?? "—",
        classAdvisor: classTeacher ? personName(classTeacher.userId) : "Not assigned yet",
        phone: s.phoneNumber,
        address: s.address,
        email: s.email ?? "",
        parentName: s.parentName,
        parentPhone: s.parentPhoneNumber,
        status: s.status,
        bloodGroup: s.bloodGroup ?? "",
        city: s.city ?? "",
        country: s.country ?? "",
        emergencyContactName: s.emergencyContactName ?? "",
        emergencyContactPhone: s.emergencyContactPhone ?? "",
        previousSchool: s.previousSchool ?? "",
        house: s.house ?? "",
    };
}

// Edit Profile Modal

function EditProfileModal({
    student, classes, sections, onClose, onSaved,
}: {
    student: ApiStudent;
    classes: RefClass[];
    sections: RefSection[];
    onClose: () => void;
    onSaved: (updated: ApiStudent) => void;
}) {
    const currentClassId = !student.classId ? "" : typeof student.classId === "string" ? student.classId : student.classId._id;
    const currentSectionId = !student.sectionId ? "" : typeof student.sectionId === "string" ? student.sectionId : student.sectionId._id;

    const [firstName, setFirstName] = useState(student.firstName);
    const [lastName, setLastName] = useState(student.lastName);
    const [gender, setGender] = useState<"Male" | "Female">(student.gender);
    const [dob, setDob] = useState(student.birthDate?.slice(0, 10) ?? "");
    const [classId, setClassId] = useState(currentClassId);
    const [sectionId, setSectionId] = useState(currentSectionId);
    const [phone, setPhone] = useState(student.phoneNumber);
    const [address, setAddress] = useState(student.address);
    const [parentName, setParentName] = useState(student.parentName);
    const [parentPhone, setParentPhone] = useState(student.parentPhoneNumber);
    const [email, setEmail] = useState(student.email ?? "");
    const [bloodGroup, setBloodGroup] = useState(student.bloodGroup ?? "");
    const [city, setCity] = useState(student.city ?? "");
    const [country, setCountry] = useState(student.country ?? "");
    const [emergencyContactName, setEmergencyContactName] = useState(student.emergencyContactName ?? "");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(student.emergencyContactPhone ?? "");
    const [previousSchool, setPreviousSchool] = useState(student.previousSchool ?? "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const sectionsForClass = sections.filter((section) => section.class === classId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const updated = await studentsApi.update(student._id, {
                firstName, lastName, gender, birthDate: dob, classId, sectionId: sectionId || null,
                phoneNumber: phone, address, parentName, parentPhoneNumber: parentPhone,
                email: email || undefined, bloodGroup: bloodGroup || undefined,
                city: city || undefined, country: country || undefined,
                emergencyContactName: emergencyContactName || undefined,
                emergencyContactPhone: emergencyContactPhone || undefined,
                previousSchool: previousSchool || undefined,
            });
            onSaved(updated);
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to save changes.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader icon={PencilSimpleLine} tint="blue">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/20 bg-primary/5">
                            Student Information
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {student.admissionNumber}
                        </Badge>
                    </div>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update personal, academic, contact, and guardian details.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
                    {/* Section 1: Basic Information */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <User size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Basic Information
                                </h3>
                                <p className="text-[11px] text-muted-foreground">Legal name, gender, and birth record</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">First Name <span className="text-destructive">*</span></Label>
                                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="First Name" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Last Name <span className="text-destructive">*</span></Label>
                                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Last Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Gender <span className="text-destructive">*</span></Label>
                                <NativeSelect value={gender} onChange={(e) => setGender(e.target.value as "Male" | "Female")}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </NativeSelect>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Date of Birth <span className="text-destructive">*</span></Label>
                                <DatePicker value={dob} onChange={setDob} max={new Date().toLocaleDateString('en-CA')} placeholder="Pick date of birth" required aria-label="Date of birth" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Blood Group</Label>
                                <NativeSelect value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                                    <option value="">Unknown</option>
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                                </NativeSelect>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Academic Placement */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10 text-info">
                                <GraduationCap size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Academic Placement
                                </h3>
                                <p className="text-[11px] text-muted-foreground">Classroom enrollment and history</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Class <span className="text-destructive">*</span></Label>
                                <NativeSelect value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }}>
                                    <option value="" disabled>Select class</option>
                                    {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
                                </NativeSelect>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Section</Label>
                                <NativeSelect value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!classId || sectionsForClass.length === 0} required={sectionsForClass.length > 0}>
                                    <option value="">{!classId ? "Select a class first" : sectionsForClass.length ? "Select section" : "No section for this class"}</option>
                                    {sectionsForClass.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </NativeSelect>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">Previous School</Label>
                            <Input value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} placeholder="Previous school name (optional)" />
                        </div>
                    </div>

                    {/* Section 3: Contact & Address */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
                                <MapPin size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Contact & Location
                                </h3>
                                <p className="text-[11px] text-muted-foreground">Phone number and residential address</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Student Phone Number <span className="text-destructive">*</span></Label>
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="e.g. 0615123456" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Email Address</Label>
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground">Street Address <span className="text-destructive">*</span></Label>
                            <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Street address or neighborhood" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">City</Label>
                                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Country</Label>
                                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Parent & Guardian Information */}
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success">
                                <Users size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Parent / Guardian Information
                                </h3>
                                <p className="text-[11px] text-muted-foreground">Primary guardian & emergency contacts</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Parent/Guardian Name <span className="text-destructive">*</span></Label>
                                <Input value={parentName} onChange={(e) => setParentName(e.target.value)} required placeholder="Full guardian name" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Parent Phone Number <span className="text-destructive">*</span></Label>
                                <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required placeholder="e.g. 0615123456" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Emergency Contact Name</Label>
                                <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Optional contact name" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-foreground">Emergency Contact Phone</Label>
                                <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="Optional contact phone" />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="min-w-32">
                            {submitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Upload Document Modal

function UploadDocumentModal({ onClose, onUpload }: { onClose: () => void; onUpload: (file: File, name: string) => Promise<void> }) {
    const [docName, setDocName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            if (!docName) setDocName(f.name.replace(/\.[^/.]+$/, ""));
        }
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("Please choose a file.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await onUpload(file, docName);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to upload document.");
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent>
                <DialogHeader icon={FileArrowUp} tint="violet">
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Add a new document to the student profile.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4 py-2">
                    <div>
                        <Label className="mb-1 block">Document Name</Label>
                        <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g., Birth Certificate" required />
                    </div>
                    <div>
                        <Label className="mb-1 block">File</Label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                            <UploadSimple size={24} className="text-muted-foreground mb-2" />
                            {file
                                ? <span className="text-sm text-primary font-medium">{file.name}</span>
                                : <><span className="text-sm text-muted-foreground">Click to browse or drag & drop</span><span className="text-xs text-muted-foreground/70 mt-1">PDF, JPG, PNG, DOC</span></>
                            }
                            <Input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} />
                        </label>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Tab Components

function PersonalTab({ student, guardian }: { student: StudentBase; guardian: AssignedGuardian | null }) {
    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <ProfileSection className="h-full" icon={User} tint="blue" title="Basic information" description="Name, birth and school details">
                <InfoGrid items={[
                    { label: "First name", value: student.firstName },
                    { label: "Last name", value: student.lastName },
                    { label: "Gender", value: student.gender },
                    { label: "Date of birth", value: student.dob ? formatDay(student.dob) : "", icon: Calendar },
                    { label: "Blood group", value: student.bloodGroup },
                    { label: "House / team", value: student.house, empty: "Not assigned" },
                ]} />
            </ProfileSection>

            <ProfileSection className="h-full" icon={Envelope} tint="green" title="Contact" description="How to reach the student">
                <InfoGrid items={[
                    { label: "Email", value: student.email, icon: Envelope, wide: true },
                    { label: "Phone", value: student.phone, icon: Phone },
                    { label: "City", value: student.city },
                    { label: "Address", value: student.address, icon: MapPin, wide: true },
                    { label: "Country", value: student.country },
                ]} />
            </ProfileSection>

            <ProfileSection className="h-full" icon={Users} tint="pink" title="Parent or guardian" description="Family contact and emergency details"
                action={
                    <Button variant={guardian ? "outline" : "soft"} size="xs" asChild>
                        <Link to={guardian ? `/parents/${guardian._id}` : "/parents"}>{guardian ? "Open parent" : "Assign a parent"}</Link>
                    </Button>
                }>
                <InfoGrid items={guardian ? [
                    { label: "Name", value: guardian.name },
                    { label: "Phone", value: guardian.phone, icon: Phone },
                    { label: "Email", value: guardian.email, icon: Envelope, wide: true },
                    { label: "Emergency contact", value: student.emergencyContactName ? `${student.emergencyContactName}${student.emergencyContactPhone ? ` · ${student.emergencyContactPhone}` : ""}` : "", wide: true },
                ] : [
                    // No family linked yet: what was typed on the student record.
                    { label: "Parent name (on the record)", value: student.parentName },
                    { label: "Parent phone (on the record)", value: student.parentPhone, icon: Phone },
                    { label: "Emergency contact", value: student.emergencyContactName ? `${student.emergencyContactName}${student.emergencyContactPhone ? ` · ${student.emergencyContactPhone}` : ""}` : "", wide: true },
                ]} />
            </ProfileSection>

            <ProfileSection className="h-full" icon={Shield} tint="violet" title="Background" description="Previous schooling">
                <InfoGrid items={[
                    { label: "Previous school", value: student.previousSchool, icon: BookOpen, wide: true, empty: "None on file" },
                ]} />
            </ProfileSection>
        </div>
    );
}

function formatDay(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function AcademicTab({ student, subjects }: { student: StudentBase; subjects: Subject[] }) {
    const tiles = ["bg-tile-blue", "bg-tile-green", "bg-tile-yellow", "bg-tile-pink", "bg-tile-violet"];
    return (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <ProfileSection className="h-full" icon={GraduationCap} tint="blue" title="Class">
                <InfoGrid items={[
                    { label: "Class", value: student.classId },
                    { label: "Section", value: student.section, empty: "None" },
                    { label: "Admission number", value: student.rollNumber, wide: true },
                    { label: "Class teacher", value: student.classAdvisor === "Not assigned yet" ? "" : student.classAdvisor, empty: "Not assigned yet", wide: true },
                    { label: "House / team", value: student.house, empty: "Not assigned", wide: true },
                ]} />
            </ProfileSection>
            <ProfileSection className="h-full" icon={BookOpen} tint="green" title={`Subjects (${subjects.length})`} description="What this student's class studies">
                {subjects.length > 0 ? (
                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {subjects.map((sub, i) => (
                            <div key={sub._id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-tile-foreground ${tiles[i % tiles.length]}`}>
                                    {sub.sub_name.slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{sub.sub_name}</p>
                                    <p className="text-xs text-muted-foreground">{sub.subjectCode || sub.sub_no || "—"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState compact icon={BookOpen} tint="green" title="No subjects yet" text="No subjects are set up for this class yet." />
                )}
            </ProfileSection>
        </div>
    );
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface MonthAttendance { key: string; month: string; present: number; absent: number; late: number; total: number; pct: number }

function groupAttendanceByMonth(records: AttendanceRecord[]): MonthAttendance[] {
    const byMonth = new Map<string, { present: number; absent: number; late: number; total: number }>();
    for (const r of records) {
        const d = new Date(r.att_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = byMonth.get(key) ?? { present: 0, absent: 0, late: 0, total: 0 };
        bucket.total += 1;
        if (r.status === "Present") bucket.present += 1;
        else if (r.status === "Absent") bucket.absent += 1;
        else if (r.status === "Late") bucket.late += 1;
        byMonth.set(key, bucket);
    }
    return Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => {
            const [year, month] = key.split("-").map(Number);
            return { key, month: `${MONTH_NAMES[month]} ${year}`, ...v, pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0 };
        });
}

function AttendanceTab({ records }: { records: AttendanceRecord[] }) {
    const byMonth = groupAttendanceByMonth(records);
    const presentSum = records.filter((r) => r.status === "Present").length;
    const absentSum = records.filter((r) => r.status === "Absent").length;
    const lateSum = records.filter((r) => r.status === "Late").length;
    const overall = records.length > 0 ? (presentSum / records.length) * 100 : 0;

    return (
        <div className="space-y-5">
            <StatStrip items={[
                { label: "Attendance rate", value: `${Math.round(overall)}%`, icon: Calendar, tone: "emerald", hint: "Present or late" },
                { label: "Present", value: presentSum, icon: CheckCircle, tone: "sky", hint: `of ${records.length} sessions` },
                { label: "Absent", value: absentSum, icon: XCircle, tone: "rose", hint: "Sessions missed" },
                { label: "Late", value: lateSum, icon: Clock, tone: "amber", hint: "Arrived late" },
            ]} />

            {/* Attendance History Block */}
            <ProfileSection icon={CalendarCheck} tint="green" title="Month by month" description="Present, absent and late in each month" flush
                action={<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">Overall {Math.round(overall)}%</span>}>
                    {byMonth.length === 0 ? (
                        <EmptyState icon={CalendarCheck} tint="blue" title="No attendance yet" text="Once teachers take attendance, this student's days show up here month by month." />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    <TableRow className="border-b border-border/60 bg-muted/20">
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Present</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Absent</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Late</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Sessions</TableHead>
                                        <TableHead className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {byMonth.map((row) => (
                                        <TableRow key={row.key} className="border-b border-border/40 transition-colors hover:bg-muted/40">
                                            <TableCell className="py-3.5 px-4 font-medium text-foreground">{row.month}</TableCell>
                                            <TableCell className="py-3.5 px-4">
                                                <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 font-semibold">
                                                    <CheckCircle size={12} /> {row.present}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-4">
                                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 font-semibold">
                                                    <XCircle size={12} /> {row.absent}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-4">
                                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1 font-semibold">
                                                    <Clock size={12} /> {row.late}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-4 text-muted-foreground">{row.total}</TableCell>
                                            <TableCell className={`py-3.5 px-4 text-right font-bold ${pctColor(row.pct)}`}>{row.pct}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </ProfileSection>
        </div>
    );
}

function feeStatusBadge(status: Invoice["status"]) {
    if (status === "Paid") return "bg-success/10 text-success border-success/20";
    if (status === "Partially_Paid") return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
}

function feeStatusLabel(status: Invoice["status"]) {
    return status === "Partially_Paid" ? "Partially Paid" : status;
}

function FeesTab({ invoices, totals }: { invoices: Invoice[]; totals: { invoiced: number; paid: number; balance: number } }) {
    const nextDueInvoice = invoices.find((f) => f.status !== "Paid");

    return (
        <div className="space-y-5">
            <StatStrip items={[
                { label: "Billed", value: `$${totals.invoiced.toLocaleString()}`, icon: CurrencyDollar, tone: "sky", hint: "All fees charged" },
                { label: "Paid", value: `$${totals.paid.toLocaleString()}`, icon: CheckCircle, tone: "emerald", hint: "Received so far" },
                { label: "Owed", value: `$${totals.balance.toLocaleString()}`, icon: WarningCircle, tone: totals.balance > 0 ? "rose" : "muted", hint: totals.balance > 0 ? "Still to pay" : "Nothing owed" },
                { label: "Next due", value: nextDueInvoice ? (nextDueInvoice.dueDate ? new Date(nextDueInvoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No date") : "—", icon: Calendar, tone: "amber", hint: nextDueInvoice ? `$${nextDueInvoice.balance.toLocaleString()} pending` : "All paid" },
            ]} />

            {/* Invoice History */}
            <ProfileSection icon={Receipt} tint="yellow" title="Bills and payments" description="Every fee charged and what was paid" flush>
                    {invoices.length === 0 ? (
                        <EmptyState icon={Receipt} tint="yellow" title="No bills yet" text="Monthly fees appear here once the school charges this student's class." />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    <TableRow className="border-b border-border/60 bg-muted/20">
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Category</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Invoiced</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((fee) => {
                                        const feeTypeName = fee.fee_struc_no && typeof fee.fee_struc_no !== "string" && fee.fee_struc_no.fee_type_no && typeof fee.fee_struc_no.fee_type_no !== "string"
                                            ? fee.fee_struc_no.fee_type_no.fee_name
                                            : "Tuition / Standard Fee";
                                        return (
                                            <TableRow key={fee._id} className="border-b border-border/40 transition-colors hover:bg-muted/40">
                                                <TableCell className="py-3.5 px-4 font-medium text-foreground">{feeTypeName}</TableCell>
                                                <TableCell className="py-3.5 px-4 text-muted-foreground">${fee.invoice_amount.toLocaleString()}</TableCell>
                                                <TableCell className="py-3.5 px-4 font-semibold text-success">${fee.paid_amount.toLocaleString()}</TableCell>
                                                <TableCell className={`py-3.5 px-4 font-semibold ${fee.balance > 0 ? "text-destructive" : "text-muted-foreground"}`}>${fee.balance.toLocaleString()}</TableCell>
                                                <TableCell className="py-3.5 px-4 text-muted-foreground text-xs">{new Date(fee.registerDate).toLocaleDateString()}</TableCell>
                                                <TableCell className="py-3.5 px-4 text-muted-foreground text-xs">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "—"}</TableCell>
                                                <TableCell className="py-3.5 px-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${feeStatusBadge(fee.status)}`}>
                                                        {feeStatusLabel(fee.status)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </ProfileSection>
        </div>
    );
}

function DocumentsTab({ studentId, docs, onReload }: { studentId: string; docs: ApiDocument[]; onReload: () => Promise<void> }) {
    const [showUpload, setShowUpload] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [docError, setDocError] = useState("");
    const canEdit = useCan("students", "edit");

    async function handleOpen(docId: string) {
        setDocError("");
        try {
            await studentsApi.openDocument(studentId, docId);
        } catch (err: any) {
            setDocError(err?.response?.status === 404 ? "That file is no longer on the server. Please upload it again." : "Could not open the document.");
        }
    }

    async function handleUpload(file: File, name: string) {
        await studentsApi.uploadDocument(studentId, file, name);
        await onReload();
        setShowUpload(false);
    }

    async function handleVerify(docId: string) {
        setBusyId(docId);
        try {
            await studentsApi.verifyDocument(studentId, docId);
            await onReload();
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(docId: string) {
        if (!(await confirmAction({ title: "Delete this document?", text: "The file is removed for good.", confirmLabel: "Delete document", tone: "danger" }))) return;
        setBusyId(docId);
        setDocError("");
        try {
            await studentsApi.deleteDocument(studentId, docId);
            await onReload();
        } catch (err: any) {
            setDocError(err?.response?.data?.message || "Could not delete the document.");
        } finally {
            setBusyId(null);
        }
    }

    const totalDocs = docs.length;
    const verifiedDocs = docs.filter(d => d.status === "Verified").length;
    const pendingDocs = docs.filter(d => d.status === "Pending").length;

    return (
        <div className="space-y-5">
            <StatStrip items={[
                { label: "Documents", value: totalDocs, icon: FileText, tone: "violet", hint: "On file" },
                { label: "Verified", value: verifiedDocs, icon: CheckCircle, tone: "emerald", hint: `of ${totalDocs}` },
                { label: "To check", value: pendingDocs, icon: Clock, tone: "amber", hint: "Waiting for review" },
            ]} />

            {/* Documents Table Block */}
            <ProfileSection icon={FileText} tint="violet" title="Documents" description="Certificates, IDs and other files" flush
                action={canEdit && <Button size="sm" onClick={() => setShowUpload(true)}><UploadSimple size={15} /> Upload</Button>}>
                {docError && <p className="mx-5 mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{docError}</p>}
                    {docs.length === 0 ? (
                        <EmptyState icon={FileArrowUp} tint="violet" title="No documents yet" text="Upload birth certificates, report cards or other files for this student." />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    <TableRow className="border-b border-border/60 bg-muted/20">
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Name</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload Date</TableHead>
                                        <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                        <TableHead className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {docs.map((doc) => (
                                        <TableRow key={doc._id} className="border-b border-border/40 transition-colors hover:bg-muted/40">
                                            <TableCell className="py-3.5 px-4 font-medium text-foreground">{doc.name}</TableCell>
                                            <TableCell className="py-3.5 px-4">
                                                <Badge variant="outline" className="text-[11px] font-mono uppercase text-muted-foreground">
                                                    {doc.fileType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-4 text-muted-foreground text-xs">{formatBytes(doc.fileSize)}</TableCell>
                                            <TableCell className="py-3.5 px-4 text-muted-foreground text-xs">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                                    doc.status === "Verified"
                                                        ? "bg-success/10 text-success border-success/20"
                                                        : "bg-warning/10 text-warning border-warning/20"
                                                }`}>
                                                    <CheckCircle size={12} /> {doc.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {doc.status === "Pending" && (
                                                        <Button
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => handleVerify(doc._id)}
                                                            disabled={busyId === doc._id}
                                                            className="text-success hover:text-success hover:bg-success/10"
                                                        >
                                                            <CheckCircle size={13} /> Verify
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => handleOpen(doc._id)}
                                                        className="px-2.5 font-medium text-muted-foreground hover:text-foreground"
                                                    >
                                                        <DownloadSimple size={13} /> Open
                                                    </Button>
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => handleDelete(doc._id)}
                                                            disabled={busyId === doc._id}
                                                            aria-label="Delete document"
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </ProfileSection>
            {showUpload && <UploadDocumentModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
        </div>
    );
}

// Main Page

const TABS: { id: ProfileTab; icon: React.ElementType }[] = [
    { id: "Personal", icon: User },
    { id: "Academic", icon: GraduationCap },
    { id: "Attendance", icon: Calendar },
    { id: "Results", icon: Exam },
    { id: "Fees", icon: CurrencyDollar },
    { id: "Documents", icon: FileText },
];

export default function StudentProfilePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const canEdit = useCan("students", "edit");

    const [apiStudent, setApiStudent] = useState<ApiStudent | null>(null);
    const [classes, setClasses] = useState<RefClass[]>([]);
    const [sections, setSections] = useState<RefSection[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoiceTotals, setInvoiceTotals] = useState({ invoiced: 0, paid: 0, balance: 0 });
    const [documents, setDocuments] = useState<ApiDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const load = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            // The student record is the only critical request. Optional modules
            // must not hide a valid profile just because that student has no fee,
            // attendance, document, or academic reference data yet.
            const s = await studentsApi.getById(id);
            setApiStudent(s);
            setLoadError("");

            const [references, subjectResult, attendanceResult, invoiceResult, documentResult] = await Promise.allSettled([
                studentsApi.getReferenceData(),
                academicApi.getSubjects(),
                studentsApi.getAttendance(id),
                studentsApi.getInvoices(id),
                studentsApi.getDocuments(id),
            ]);
            if (references.status === "fulfilled") {
                setClasses(references.value.classes);
                setSections(references.value.sections);
            }
            if (subjectResult.status === "fulfilled") {
                const studentClassId = s.classId && typeof s.classId !== "string" ? s.classId._id : s.classId;
                setSubjects(subjectResult.value.filter((subject) => subject.classId === studentClassId));
            }
            if (attendanceResult.status === "fulfilled") setAttendanceRecords(attendanceResult.value.records);
            if (invoiceResult.status === "fulfilled") {
                setInvoices(invoiceResult.value.invoices);
                setInvoiceTotals(invoiceResult.value.totals);
            }
            if (documentResult.status === "fulfilled") setDocuments(documentResult.value);
        } catch (err) {
            console.error(err);
            setLoadError("Failed to load student.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const reloadDocuments = useCallback(async () => {
        if (!id) return;
        setDocuments(await studentsApi.getDocuments(id));
    }, [id]);

    const [activeTab, setActiveTab] = useState<ProfileTab>("Personal");
    const canSeeResults = usePermission("exams");
    const [showEdit, setShowEdit] = useState(false);

    if (loading) return <Card className="rounded-2xl"><ListLoading rows={6} /></Card>;
    if (loadError || !apiStudent) {
        return (
            <Card className="rounded-2xl">
                <ErrorState text={loadError || "This student couldn't be found."} onRetry={loadError ? load : undefined} />
                <div className="-mt-8 pb-8 text-center"><Button variant="outline" onClick={() => navigate("/students")}>Back to Students</Button></div>
            </Card>
        );
    }

    const student = toStudentBase(apiStudent);
    const age = calcAge(student.dob);
    const guardianLink = apiStudent.guardians?.[0]?.guardianId;
    const assignedGuardian: AssignedGuardian | null = guardianLink && typeof guardianLink !== "string" ? guardianLink : null;

    // Dynamically computed metrics for summary cards
    const attendancePresent = attendanceRecords.filter((r) => r.status === "Present").length;
    const attendanceRate = attendanceRecords.length > 0 ? Math.round((attendancePresent / attendanceRecords.length) * 100) : 0;

    const feesTotal = invoiceTotals.invoiced;
    const feesPaid = invoiceTotals.paid;
    const feesBalance = invoiceTotals.balance;

    return (
        <div className="space-y-6">
            <ProfileHero
                name={`${student.firstName} ${student.lastName}`}
                kind={[student.classId !== "—" ? student.classId : null, student.section !== "—" ? `Section ${student.section}` : null].filter(Boolean).join(" · ") || "Student"}
                status={student.status}
                photo={student.photo}
                onBack={() => navigate("/students")}
                backLabel="Students"
                chips={[
                    { icon: IdentificationCard, label: student.rollNumber || "No admission number" },
                    ...(student.dob ? [{ icon: Cake, label: `${age} years · ${formatDay(student.dob)}` }] : []),
                    ...(student.phone ? [{ icon: Phone, label: student.phone }] : []),
                    ...(student.house ? [{ icon: House, label: student.house }] : []),
                ]}
                actions={<>
                    {canEdit && <Button size="sm" onClick={() => setShowEdit(true)}><PencilSimple size={15} /> Edit profile</Button>}
                </>}
            />

            <StatStrip items={[
                { label: "Class", value: student.classId, icon: GraduationCap, tone: "sky", hint: `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`, onClick: () => setActiveTab("Academic"), active: activeTab === "Academic" },
                { label: "Attendance", value: attendanceRecords.length ? `${attendanceRate}%` : "—", icon: Calendar, tone: "emerald", hint: attendanceRecords.length ? `${attendancePresent} of ${attendanceRecords.length} present` : "Not taken yet", onClick: () => setActiveTab("Attendance"), active: activeTab === "Attendance" },
                { label: "Owed", value: `$${feesBalance.toLocaleString()}`, icon: CurrencyDollar, tone: feesBalance > 0 ? "rose" : "violet", hint: feesTotal ? `$${feesPaid.toLocaleString()} of $${feesTotal.toLocaleString()} paid` : "No bills yet", onClick: () => setActiveTab("Fees"), active: activeTab === "Fees" },
                { label: "Documents", value: documents.length, icon: FileText, tone: "amber", hint: documents.length ? `${documents.filter((d) => d.status === "Verified").length} verified` : "None uploaded", onClick: () => setActiveTab("Documents"), active: activeTab === "Documents" },
            ]} />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileTab)}>
                <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
                    {TABS.filter(({ id }) => id !== "Results" || canSeeResults).map(({ id, icon: TabIcon }) => (
                        <TabsTrigger key={id} value={id} className="gap-2"><TabIcon size={16} /> {id}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Tab Content */}
            {activeTab === "Personal" && <PersonalTab student={student} guardian={assignedGuardian} />}
            {activeTab === "Academic" && <AcademicTab student={student} subjects={subjects} />}
            {activeTab === "Attendance" && <AttendanceTab records={attendanceRecords} />}
            {activeTab === "Results" && canSeeResults && <ResultsTab studentId={student.id} />}
            {activeTab === "Fees" && <FeesTab invoices={invoices} totals={invoiceTotals} />}
            {activeTab === "Documents" && <DocumentsTab studentId={student.id} docs={documents} onReload={reloadDocuments} />}

            {/* Edit Modal */}
            {showEdit && (
                <EditProfileModal
                    student={apiStudent}
                    classes={classes}
                    sections={sections}
                    onClose={() => setShowEdit(false)}
                    onSaved={(updated) => setApiStudent(updated)}
                />
            )}
        </div>
    );
}