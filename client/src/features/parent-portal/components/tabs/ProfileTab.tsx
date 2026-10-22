import { SectionCard } from '../shared';
import { useParentPortal } from '../../context/ParentContext';
import { fullName, classNameOf, sectionNameOf } from '../../../student-portal/utils/portalStudent';

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

// The selected child is already a full Student record in context — no extra fetch.
export default function ProfileTab() {
  const { child } = useParentPortal();

  if (!child) {
    return <div className="bg-white border rounded-xl py-16 text-center text-gray-400 text-sm">Select a child to view their profile.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard title="Personal Information">
        <InfoRow label="Full Name" value={fullName(child)} />
        <InfoRow label="Date of Birth" value={formatDate(child.birthDate)} />
        <InfoRow label="Gender" value={child.gender} />
        <InfoRow label="Phone Number" value={child.phoneNumber || '—'} />
        <InfoRow label="Email" value={child.email || '—'} last />
      </SectionCard>

      <SectionCard title="Academic Information">
        <InfoRow label="Admission No." value={child.admissionNumber} />
        <InfoRow label="Class" value={classNameOf(child)} />
        <InfoRow label="Section" value={sectionNameOf(child)} />
        <InfoRow label="Status" value={child.status} last />
      </SectionCard>

      <SectionCard title="Guardian Information">
        <InfoRow label="Parent/Guardian" value={child.parentName || '—'} />
        <InfoRow label="Parent Phone" value={child.parentPhoneNumber || '—'} last />
      </SectionCard>

      <SectionCard title="Contact">
        <InfoRow label="Home Address" value={child.address || '—'} last />
      </SectionCard>
    </div>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 ${last ? '' : 'border-b border-gray-50'}`}>
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-right text-gray-900">{value}</span>
    </div>
  );
}
