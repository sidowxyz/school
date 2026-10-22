import { useEffect, useState } from 'react';
import { SpinnerGap, Star, UserCircle, GraduationCap, Phone, Envelope, MapPin, Hash, BookOpen } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '../shared';
import { portalApi, type PortalScholarship } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';
import type { Student } from '../../../students/types';
import { fullName, classNameOf, sectionNameOf } from '../../utils/portalStudent';

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function ProfileTab({ student }: { student?: Student | null }) {
  const { studentId } = usePortal();
  const [scholarship, setScholarship] = useState<PortalScholarship | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    portalApi
      .getScholarship(studentId)
      .then((res) => {
        if (!cancelled) setScholarship(res.active);
      })
      .catch(() => {
        if (!cancelled) setScholarship(null);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // The real profile is loaded asynchronously by the parent page — show a
  // loading placeholder rather than a fabricated identity while it resolves.
  if (!student) {
    return (
      <Card className="border-border/80 shadow-2xs">
        <CardContent className="p-16 flex items-center justify-center text-muted-foreground">
          <SpinnerGap size={22} className="animate-spin mr-2" /> Loading profile…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <UserCircle size={16} className="text-primary" />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Personal Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Identity and demographics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-0">
            <InfoRow label="Full Name" value={fullName(student)} />
            <InfoRow label="Date of Birth" value={student.birthDate ? formatDate(student.birthDate) : '—'} />
            <InfoRow label="Gender" value={student.gender ?? '—'} />
            <InfoRow label="Phone Number" value={student.phoneNumber ?? '—'} icon={Phone} />
            <InfoRow label="Email Address" value={student.email || '—'} icon={Envelope} link last />
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-sky-600 dark:text-sky-400" />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Academic Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Enrollment and class details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-0">
            <InfoRow label="Admission No." value={student.admissionNumber} icon={Hash} />
            <InfoRow label="Class" value={classNameOf(student)} icon={BookOpen} />
            <InfoRow label="Section" value={sectionNameOf(student)} last />
          </CardContent>
        </Card>

        {/* Guardian Information */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <UserCircle size={16} className="text-amber-600 dark:text-amber-400" />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Guardian Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Parent/guardian contact details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-0">
            <InfoRow label="Parent/Guardian" value={student.parentName ?? '—'} />
            <InfoRow label="Parent Phone" value={student.parentPhoneNumber ?? '—'} icon={Phone} last />
          </CardContent>
        </Card>

        {/* Address & Scholarship */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Address & Scholarship</CardTitle>
                <CardDescription className="text-xs mt-0.5">Residential address and financial aid</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <InfoRow label="Home Address" value={student.address ?? '—'} last />
            <div className="mt-4">
              {scholarship === undefined ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <SpinnerGap size={14} className="animate-spin" /> Checking scholarship status…
                </div>
              ) : scholarship ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Star size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{scholarship.kind}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {scholarship.basis ?? 'Scholarship'}
                        {scholarship.value !== null ? ` · ${scholarship.value}%` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Valid {formatDate(scholarship.startDate)} – {formatDate(scholarship.endDate)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="Active" />
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No active scholarship or fee discount.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  label, value, link = false, last = false, icon: Icon,
}: {
  label: string;
  value: string;
  link?: boolean;
  last?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${last ? '' : 'border-b border-border/50'}`}>
      <span className="text-sm text-muted-foreground shrink-0 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-muted-foreground" />}
        {label}
      </span>
      <span className={`text-sm font-medium text-right ${link ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
