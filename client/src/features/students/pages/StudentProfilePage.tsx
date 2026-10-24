import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    ArrowLeft, DownloadSimple, PencilSimple, User, Users, Envelope, Phone, MapPin,
    CurrencyDollar, CheckCircle, WarningCircle,
    XCircle, Clock, FileText, UploadSimple, Shield, GraduationCap,
    Calendar, Trash, BookOpen, Stack, Monitor,
  FileArrowUp,
  PencilSimpleLine,
  CalendarCheck,
  Receipt,
} from '@phosphor-icons/react';
import { studentsApi } from "../api/studentsApi";
import { academicApi } from "../../academic-structure/api/academicApi";
import { useCan, usePermission } from "../../../hooks/usePermission";
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
import { EmptyState } from "@/components/common/EmptyState";

// Types

type ProfileTab = "Personal" | "Academic" | "Attendance" | "Fees" | "Documents";

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

function InfoField({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {icon && <span className="opacity-70">{icon}</span>}
                {label}
            </span>
            <span className="text-sm font-semibold text-foreground tracking-tight break-words">{value}</span>
        </div>
    );
}

type SummaryTone = "sky" | "emerald" | "amber" | "rose" | "indigo" | "violet";

const SUMMARY_ACCENTS: Record<SummaryTone, { chip: string; border: string; glow: string }> = {
    sky: {
        chip: "bg-info/10 text-info border border-info/60",
        border: "border-t-info",
        glow: "group-hover:border-info/30",
    },
    emerald: {
        chip: "bg-success/10 text-success border border-success/60",
        border: "border-t-success",
        glow: "group-hover:border-success/30",
    },
    amber: {
        chip: "bg-warning/10 text-warning border border-warning/60",
        border: "border-t-warning",
        glow: "group-hover:border-warning/30",
    },
    rose: {
        chip: "bg-destructive/10 text-destructive border border-destructive/60",
        border: "border-t-destructive",
        glow: "group-hover:border-destructive/30",
    },
    indigo: {
        chip: "bg-info/10 text-info border border-info/60",
        border: "border-t-info",
        glow: "group-hover:border-info/30",
    },
    violet: {
        chip: "bg-violet/10 text-violet border border-violet/60",
        border: "border-t-violet",
        glow: "group-hover:border-violet/30",
    },
};

interface SummaryCardProps {
    title: string;
    value: string | number;
    subtext: string;
    icon: ReactNode;
    tone: SummaryTone;
    badge?: ReactNode;
    onClick: () => void;
}

function SummaryCard({ title, value, subtext, icon, tone, badge, onClick }: SummaryCardProps) {
    const config = SUMMARY_ACCENTS[tone];
    return (
        <Button variant="plain"
            type="button"
            onClick={onClick}
            className="group relative flex flex-col justify-between bg-card p-5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-1 focus:ring-ring"
        >
            <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {title}
                </span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${config.chip}`}>
                    {icon}
                </span>
            </div>

            <div className="my-3">
                <h4 className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</h4>
                {badge}
            </div>

            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{subtext}</span>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                    View →
                </span>
            </div>
        </Button>
    );
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
        <Card className="border-border/80 shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-foreground">Personal Information & Records</CardTitle>
                        <CardDescription className="text-xs">
                            Legal identity, contact information, parent/guardian records, and academic history.
                        </CardDescription>
                    </div>
                    {guardian ? (
                        <Link to={`/parents/${guardian._id}`}>
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors text-primary border-primary/30 text-xs">
                                View parent →
                            </Badge>
                        </Link>
                    ) : (
                        <Link to="/parents">
                            <Badge variant="outline" className="cursor-pointer hover:bg-warning/10 transition-colors text-warning border-warning/30 text-xs">
                                Assign Parent →
                            </Badge>
                        </Link>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-6 divide-y divide-border/60 space-y-6">
                {/* 1. Basic Information */}
                <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10 text-info">
                            <User size={15} />
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                Basic Information
                            </h3>
                            <p className="text-[11px] text-muted-foreground">Identity, demographics, and personal records</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                        <InfoField label="First Name" value={student.firstName} />
                        <InfoField label="Last Name" value={student.lastName} />
                        <InfoField label="Gender" value={student.gender} />
                        <InfoField label="Date of Birth" value={student.dob} icon={<Calendar size={13} />} />
                        <InfoField label="Blood Group" value={student.bloodGroup || "Not recorded"} />
                        <InfoField label="House / Team" value={student.house || "Not assigned"} icon={<Stack size={13} />} />
                    </div>
                </div>

                {/* 2. Contact Information */}
                <div className="pt-6 space-y-3.5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success">
                            <Envelope size={15} />
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                Contact Information
                            </h3>
                            <p className="text-[11px] text-muted-foreground">Direct communications and residential address</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        <InfoField label="Email Address" value={student.email || "Not recorded"} icon={<Envelope size={13} />} />
                        <InfoField label="Phone Number" value={student.phone || "Not recorded"} icon={<Phone size={13} />} />
                        <div className="sm:col-span-2">
                            <InfoField label="Residential Address" value={student.address || "Not recorded"} icon={<MapPin size={13} />} />
                        </div>
                        <InfoField label="City" value={student.city || "Not recorded"} />
                        <InfoField label="Country" value={student.country || "Not recorded"} />
                    </div>
                </div>

                {/* 3. Parent & Guardian Details */}
                <div className="pt-6 space-y-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
                                <Users size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Parent & Guardian Details
                                </h3>
                                <p className="text-[11px] text-muted-foreground">Primary guardian contacts and emergency responders</p>
                            </div>
                        </div>
                    </div>

                    {guardian ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <InfoField label="Assigned Parent" value={guardian.name} />
                            <InfoField label="Phone" value={guardian.phone} icon={<Phone size={13} />} />
                            <InfoField label="Email" value={guardian.email || "—"} icon={<Envelope size={13} />} />
                        </div>
                    ) : (
                        <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
                            No parent portal account linked yet. Contact details below are saved on the student record.
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <InfoField label="Parent Name (on file)" value={student.parentName || "—"} />
                        <InfoField label="Parent Phone (on file)" value={student.parentPhone || "—"} icon={<Phone size={13} />} />
                        <InfoField
                            label="Emergency Contact"
                            value={student.emergencyContactName ? `${student.emergencyContactName} (${student.emergencyContactPhone || "no phone on file"})` : "Not recorded"}
                            icon={<WarningCircle size={13} />}
                        />
                    </div>
                </div>

                {/* 4. Prior Academic Background */}
                <div className="pt-6 space-y-3.5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10 text-info">
                            <Shield size={15} />
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                Prior Academic Background
                            </h3>
                            <p className="text-[11px] text-muted-foreground">Transfers and previous school records</p>
                        </div>
                    </div>
                    <div className="pt-1 max-w-md">
                        <InfoField label="Previous School Attended" value={student.previousSchool || "None on file"} icon={<BookOpen size={13} />} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AcademicTab({ student, subjects }: { student: StudentBase; subjects: Subject[] }) {
    return (
        <div className="space-y-5">
            {/* Academic Summary Cards: hairline-divided panel */}
            <Card className="overflow-hidden border-border bg-border shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Class</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info/15 text-info">
                                <GraduationCap className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{student.classId}</h4>
                        <p className="mt-2 text-xs text-muted-foreground">Section: <span className="font-semibold text-foreground">{student.section}</span></p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Subjects</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                                <BookOpen className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{subjects.length}</h4>
                        <p className="mt-2 text-xs text-muted-foreground">Curriculum active</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Class Advisor</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/15 text-warning">
                                <User className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-xl font-semibold tracking-tight text-foreground truncate max-w-[200px]" title={student.classAdvisor}>
                            {student.classAdvisor}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Faculty In-Charge</p>
                    </div>
                </div>
            </Card>

            {/* Academic Details Form Block */}
            <Card className="border-border/80 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold">Academic Profile & Enrolled Subjects</CardTitle>
                    <CardDescription className="text-xs">Class allocation, registration identifier, and subject list</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <InfoField label="Class Level" value={student.classId} />
                        <InfoField label="Section Group" value={student.section} />
                        <InfoField label="Admission Number" value={student.rollNumber} />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Active Coursework ({subjects.length})
                            </p>
                        </div>
                        {subjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {subjects.map((sub) => (
                                    <div key={sub._id} className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                                            {sub.sub_name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{sub.sub_name}</p>
                                            <p className="text-[10px] text-muted-foreground">Course ID: {sub.sub_no || "—"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState compact icon={BookOpen} tint="green" title="No subjects yet" text="No subjects are mapped to this class level yet." />
                        )}
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Student House:</span>
                        {student.house ? (
                            <Badge variant="secondary" className="font-medium">
                                {student.house}
                            </Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">Not assigned to a house</span>
                        )}
                    </div>
                </CardContent>
            </Card>
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
            {/* Attendance 4-Stat Strip: one panel, four cells separated by hairlines */}
            <Card className="overflow-hidden border-border bg-border shadow-sm">
                <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Attendance Rate</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                                <Calendar className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${pctColor(overall)}`}>
                            {Math.round(overall)}%
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Overall presence</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sessions Present</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                                <CheckCircle className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                            {presentSum}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">out of {records.length} sessions</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recorded Absences</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                                <XCircle className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-destructive">
                            {absentSum}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">unexcused / recorded</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Late Arrivals</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/15 text-warning">
                                <Clock className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-warning">
                            {lateSum}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">tardy sessions</p>
                    </div>
                </div>
            </Card>

            {/* Attendance History Block */}
            <Card className="border-border/80 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">Monthly Attendance Breakdown</CardTitle>
                        <CardDescription className="text-xs">Summary of attendance distribution grouped by calendar month</CardDescription>
                    </div>
                    <Badge variant="outline" className="font-semibold text-xs">
                        Overall: {Math.round(overall)}%
                    </Badge>
                </CardHeader>
                <CardContent className="pt-4 p-0">
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
                </CardContent>
            </Card>
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
            {/* Fees 4-Stat Strip: one panel, four cells separated by hairlines */}
            <Card className="overflow-hidden border-border bg-border shadow-sm">
                <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Invoiced</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info/15 text-info">
                                <CurrencyDollar className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                            ${totals.invoiced.toLocaleString()}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Assigned tuition & fees</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Paid</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                                <CheckCircle className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-success">
                            ${totals.paid.toLocaleString()}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Settled balance</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Balance</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                                <WarningCircle className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-destructive">
                            ${totals.balance.toLocaleString()}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Remaining due</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Next Due Date</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/15 text-warning">
                                <Calendar className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className={`mt-3 text-xl font-semibold tracking-tight ${nextDueInvoice ? "text-warning" : "text-muted-foreground"}`}>
                            {nextDueInvoice ? (nextDueInvoice.dueDate ? new Date(nextDueInvoice.dueDate).toLocaleDateString() : "No deadline set") : "Fully Cleared"}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {nextDueInvoice ? `Pending: $${nextDueInvoice.balance.toLocaleString()}` : "No outstanding bills"}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Invoice History */}
            <Card className="border-border/80 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold">Billing Ledger & Invoices</CardTitle>
                    <CardDescription className="text-xs">Historical invoices, fee categories, and payment receipts</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-0">
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
                </CardContent>
            </Card>
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
        if (!window.confirm("Delete this document? This can't be undone.")) return;
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
            {/* Documents Summary Strip: one panel, three cells separated by hairlines */}
            <Card className="overflow-hidden border-border bg-border shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Files</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info/15 text-info">
                                <FileText className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                            {totalDocs}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Stored in student archive</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Verified Records</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                                <CheckCircle className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-success">
                            {verifiedDocs} <span className="text-xs text-muted-foreground font-normal">/ {totalDocs}</span>
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Compliant and approved</p>
                    </div>

                    <div className="bg-card p-5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending Review</p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/15 text-warning">
                                <Clock className="h-4 w-4" />
                            </span>
                        </div>
                        <h4 className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-warning">
                            {pendingDocs}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">Awaiting verification</p>
                    </div>
                </div>
            </Card>

            {/* Documents Table Block */}
            <Card className="border-border/80 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">Student Documents & Verification</CardTitle>
                        <CardDescription className="text-xs">Certificates, national IDs, and medical files</CardDescription>
                    </div>
                    {canEdit && (
                        <Button size="sm" onClick={() => setShowUpload(true)}>
                            <UploadSimple size={14} /> Upload Document
                        </Button>
                    )}
                </CardHeader>
                {docError && <p className="mx-4 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{docError}</p>}
                <CardContent className="pt-4 p-0">
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
                </CardContent>
            </Card>
            {showUpload && <UploadDocumentModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
        </div>
    );
}

// Main Page

const TABS: { id: ProfileTab; icon: React.ElementType }[] = [
    { id: "Personal", icon: User },
    { id: "Academic", icon: GraduationCap },
    { id: "Attendance", icon: Calendar },
    { id: "Fees", icon: CurrencyDollar },
    { id: "Documents", icon: FileText },
];

export default function StudentProfilePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const canEdit = useCan("students", "edit");
    const canViewPortal = usePermission("student-portal");

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
    const [showEdit, setShowEdit] = useState(false);

    if (loading) {
        return <div className="py-24 text-center text-muted-foreground">Loading student...</div>;
    }
    if (loadError || !apiStudent) {
        return <div className="py-24 text-center text-destructive">{loadError || "Student not found."}</div>;
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
        <div>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon"
                        onClick={() => navigate("/students")}
                        className="shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Student Profile</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">View and manage student information</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {canViewPortal && (
                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/student-portal?studentId=${student.id}`}>
                                <Monitor size={15} />
                                <span className="hidden sm:inline">View Portal</span>
                            </Link>
                        </Button>
                    )}
                    {canEdit && (
                        <Button size="sm" onClick={() => setShowEdit(true)}>
                            <PencilSimple size={15} />
                            <span className="hidden sm:inline">Edit Profile</span>
                            <span className="sm:hidden">Edit</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Student Hero Profile Card */}
            <Card className="mb-6 border-border/80 shadow-2xs overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Avatar & Identifiers */}
                        <div className="flex items-center gap-5">
                            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 border-2 border-border shadow-xs">
                                {student.photo ? (
                                    <img src={student.photo} alt="Student Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
                                        {student.firstName[0]}{student.lastName[0]}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
                                        {student.firstName} {student.lastName}
                                    </h2>
                                    <Badge
                                        variant="outline"
                                        className={`font-semibold text-xs ${
                                            student.status.toLowerCase() === "active"
                                                ? "bg-success/10 text-success border-success/20"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                                        {student.status}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground font-mono">
                                    Admission ID: <span className="font-semibold text-foreground">{student.rollNumber || "—"}</span>
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="text-xs font-medium">
                                        {student.classId} • Section {student.section}
                                    </Badge>
                                    {student.house && (
                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                            House: {student.house}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Key Indicator Stats */}
                        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4 md:border-t-0 md:border-l md:border-border/60 md:pl-6 md:pt-0">
                            <div className="text-center px-2">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Attendance</p>
                                <p className="text-2xl font-bold tracking-tight text-success mt-0.5">{attendanceRate}%</p>
                                <span className="text-[10px] text-muted-foreground">{attendancePresent}/{attendanceRecords.length} Days</span>
                            </div>
                            <div className="text-center px-2 border-x border-border/40">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Admit No.</p>
                                <p className="text-base font-bold tracking-tight text-foreground truncate mt-1.5 font-mono">{student.rollNumber}</p>
                                <span className="text-[10px] text-muted-foreground">Official ID</span>
                            </div>
                            <div className="text-center px-2">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Age</p>
                                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{age || "—"}</p>
                                <span className="text-[10px] text-muted-foreground">Years old</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick summary cards: single card with hairline cell dividers */}
            <Card className="overflow-hidden border-border bg-border shadow-sm mb-6">
                <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
                    <SummaryCard
                        title="Academic"
                        value={student.classId}
                        subtext={`${subjects.length} Enrolled Courses`}
                        icon={<GraduationCap size={16} />}
                        tone="sky"
                        onClick={() => setActiveTab("Academic")}
                    />
                    <SummaryCard
                        title="Attendance"
                        value={`${attendanceRate}%`}
                        subtext={`${attendancePresent} / ${attendanceRecords.length} Present`}
                        icon={<Calendar size={16} />}
                        tone="emerald"
                        onClick={() => setActiveTab("Attendance")}
                        badge={
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
                            </div>
                        }
                    />
                    <SummaryCard
                        title="Fees & Balance"
                        value={`$${feesBalance.toLocaleString()}`}
                        subtext={`$${feesPaid.toLocaleString()} / $${feesTotal.toLocaleString()} Paid`}
                        icon={<CurrencyDollar size={16} />}
                        tone={feesBalance > 0 ? "rose" : "indigo"}
                        onClick={() => setActiveTab("Fees")}
                        badge={
                            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                feesBalance === 0
                                    ? "bg-success/10 text-success border-success/20"
                                    : feesBalance < 100
                                        ? "bg-warning/10 text-warning border-warning/20"
                                        : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}>
                                {feesBalance === 0 ? "Fully Paid" : "Payment Pending"}
                            </span>
                        }
                    />
                    <SummaryCard
                        title="Documents"
                        value={`${documents.length} Uploaded`}
                        subtext={`${documents.filter(d => d.status === "Verified").length} / ${documents.length} Verified`}
                        icon={<FileText size={16} />}
                        tone="violet"
                        onClick={() => setActiveTab("Documents")}
                        badge={
                            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                documents.length > 0 && documents.every(d => d.status === "Verified")
                                    ? "bg-success/10 text-success border-success/20"
                                    : "bg-warning/10 text-warning border-warning/20"
                            }`}>
                                {documents.length > 0 && documents.every(d => d.status === "Verified") ? "All Verified" : "Pending Review"}
                            </span>
                        }
                    />
                </div>
            </Card>

            {/* Tabs Bar */}
            <div className="mb-6 flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1.5 shadow-2xs">
                {TABS.map(({ id, icon: Icon }) => {
                    const active = activeTab === id;
                    return (
                        <Button
                            variant="plain"
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                                active
                                    ? "bg-background text-foreground shadow-2xs border border-border/60"
                                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            }`}
                        >
                            <Icon size={15} />
                            <span className="hidden sm:inline">{id}</span>
                        </Button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === "Personal" && <PersonalTab student={student} guardian={assignedGuardian} />}
            {activeTab === "Academic" && <AcademicTab student={student} subjects={subjects} />}
            {activeTab === "Attendance" && <AttendanceTab records={attendanceRecords} />}
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