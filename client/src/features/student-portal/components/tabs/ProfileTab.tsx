import { useEffect, useState } from 'react';
import { Envelope, GraduationCap, House, Phone, Star, User, UsersThree, type Icon } from '@phosphor-icons/react';
import { DashboardLoading, Panel } from '../../../dashboard/components/DashboardKit';
import { portalApi, type PortalScholarship } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';
import type { Student } from '../../../students/types';
import { fullName, classNameOf, sectionNameOf } from '../../utils/portalStudent';

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/** A labelled value with a small pastel icon. */
function Field({ icon: FieldIcon, label, value, tint }: { icon: Icon; label: string; value: string; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-tile-foreground ${tint}`}>
        <FieldIcon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfileTab({ student }: { student?: Student | null }) {
  const { studentId } = usePortal();
  const [scholarship, setScholarship] = useState<PortalScholarship | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    portalApi.getScholarship(studentId)
      .then((res) => { if (!cancelled) setScholarship(res.active); })
      .catch(() => { if (!cancelled) setScholarship(null); });
    return () => { cancelled = true; };
  }, [studentId]);

  // The real profile is loaded by the parent page; never show an invented identity meanwhile.
  if (!student) return <DashboardLoading />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="About me" description="Your personal details">
        <div className="grid gap-1 sm:grid-cols-2">
          <Field icon={User} label="Full name" value={fullName(student)} tint="bg-tile-blue" />
          <Field icon={User} label="Gender" value={student.gender ?? ''} tint="bg-tile-violet" />
          <Field icon={Star} label="Date of birth" value={student.birthDate ? formatDate(student.birthDate) : ''} tint="bg-tile-yellow" />
          <Field icon={Phone} label="Phone" value={student.phoneNumber ?? ''} tint="bg-tile-green" />
          <Field icon={Envelope} label="Email" value={student.email ?? ''} tint="bg-tile-pink" />
          <Field icon={House} label="Home address" value={student.address ?? ''} tint="bg-tile-blue" />
        </div>
      </Panel>

      <Panel title="School" description="Where you are enrolled">
        <div className="grid gap-1 sm:grid-cols-2">
          <Field icon={GraduationCap} label="Admission number" value={student.admissionNumber} tint="bg-tile-green" />
          <Field icon={GraduationCap} label="Class" value={classNameOf(student)} tint="bg-tile-blue" />
          <Field icon={GraduationCap} label="Section" value={sectionNameOf(student)} tint="bg-tile-violet" />
        </div>
      </Panel>

      <Panel title="Parent or guardian" description="Who the school contacts about you">
        <div className="grid gap-1 sm:grid-cols-2">
          <Field icon={UsersThree} label="Name" value={student.parentName ?? ''} tint="bg-tile-yellow" />
          <Field icon={Phone} label="Phone" value={student.parentPhoneNumber ?? ''} tint="bg-tile-green" />
        </div>
      </Panel>

      <Panel title="Scholarship or discount" description="Any fee discount you have now">
        {scholarship === undefined ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Checking…</p>
        ) : scholarship ? (
          <div className="rounded-xl bg-tile-yellow p-4 text-tile-foreground">
            <p className="flex items-center gap-2 font-semibold"><Star size={16} weight="fill" /> {scholarship.kind}</p>
            <p className="mt-1 text-sm opacity-80">
              {scholarship.basis ?? 'Scholarship'}{scholarship.value !== null ? ` · ${scholarship.value}%` : ''}
            </p>
            <p className="mt-1 text-xs opacity-75">Valid {formatDate(scholarship.startDate)} – {formatDate(scholarship.endDate)}</p>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No scholarship or fee discount right now.</p>
        )}
      </Panel>

      <p className="text-xs text-muted-foreground lg:col-span-2">To change any of these details, please ask the school office.</p>
    </div>
  );
}
