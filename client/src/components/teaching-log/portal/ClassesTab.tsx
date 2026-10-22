import type { TeacherAssignment } from '@/features/teachers/types';
import { SpinnerGap } from '@phosphor-icons/react';

export default function ClassesTab({
  assignments,
  loading = false,
}: {
  assignments: TeacherAssignment[];
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
      <h2 className="font-semibold text-gray-800">My Classes</h2>
      <p className="text-sm text-gray-400 mb-4">All classes you are teaching</p>

      {loading ? (
        <div className="text-center py-10 text-gray-500 text-sm flex items-center justify-center gap-2">
          <SpinnerGap size={18} className="animate-spin text-green-600" /> Loading your assigned classes...
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          No classes assigned yet — an admin needs to assign you to a class and subject.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <div key={a._id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900">
                    {a.classId?.cl_name || '—'}{a.sectionId?.name ? ` - ${a.sectionId.name}` : ''}
                  </p>
                  <p className="text-sm text-gray-500">{a.subjectId?.sub_name || '—'}</p>
                  {(a.classId?.lev_no || a.termId) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.classId?.lev_no?.lev_name}
                      {a.classId?.lev_no && a.termId ? ' · ' : ''}
                      {a.termId?.name}
                      {a.termId?.academicYearId && typeof a.termId.academicYearId !== 'string'
                        ? ` (${a.termId.academicYearId.y_name})` : ''}
                    </p>
                  )}
                </div>
                <span className="bg-green-600 text-white text-xs font-medium px-2.5 py-1 rounded-full shrink-0">
                  {a.timetableSlots.length} period{a.timetableSlots.length === 1 ? '' : 's'}/week
                </span>
              </div>
              {a.timetableSlots.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {a.timetableSlots.map((slot, i) => (
                    <span key={i} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                      {slot.day} &middot; {slot.periodId?.per_name || '—'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
