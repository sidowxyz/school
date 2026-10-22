import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CaretLeft, GraduationCap, SpinnerGap, MagnifyingGlass, Users } from '@phosphor-icons/react';
import { teachersApi } from '../api/teachersApi';
import type { Teacher } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSelect: (teacher: Teacher) => void;
}

/** Admin gateway matching the Student Portal's search-and-browse pattern. */
export default function AdminTeacherSearch({ onSelect }: Props) {
  const [term, setTerm] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const result = await teachersApi.getAll({ limit: 500 });
        if (!cancelled) setTeachers(result);
      } catch {
        if (!cancelled) setError('Failed to load teachers. Is the server running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const departments = useMemo(() => {
    const groups = new Map<string, number>();
    teachers.forEach((teacher) => {
      const department = teacher.department?.trim() || 'General Faculty';
      groups.set(department, (groups.get(department) || 0) + 1);
    });
    return [...groups.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => a.department.localeCompare(b.department));
  }, [teachers]);

  const searchResults = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return [];
    return teachers.Funnel((teacher) => [
      teacher.userId?.name,
      teacher.userId?.email,
      teacher.staffId,
      teacher.department,
      teacher.qualifications,
    ].Funnel(Boolean).join(' ').toLowerCase().includes(query)).slice(0, 25);
  }, [teachers, term]);

  const teachersInDepartment = useMemo(() => {
    if (!activeDepartment) return [];
    return teachers
      .Funnel((teacher) => (teacher.department?.trim() || 'General Faculty') === activeDepartment)
      .sort((a, b) => (a.userId?.name || '').localeCompare(b.userId?.name || ''));
  }, [activeDepartment, teachers]);

  const isSearching = term.trim().length > 0;

  const TeacherRow = ({ teacher }: { teacher: Teacher }) => (
    <Button variant="plain"
      type="button"
      onClick={() => onSelect(teacher)}
      className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-green-400 hover:shadow-sm transition"
    >
      <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
        <GraduationCap size={20} className="text-green-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">{teacher.userId?.name || 'Unnamed teacher'}</p>
        <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{teacher.staffId}</span>
          <span>· {teacher.department || 'General Faculty'}</span>
          <span className={teacher.status === 'Active' ? 'text-green-600' : 'text-amber-600'}>· {teacher.status}</span>
        </p>
      </div>
      <ArrowRight size={18} className="text-gray-300" />
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
        <p className="text-gray-500 mt-1 text-sm">
          MagnifyingGlass for a teacher, or browse a department, to view their portal.
        </p>
      </div>

      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          autoFocus
          type="text"
          value={term}
          onChange={(event) => { setTerm(event.target.value); setActiveDepartment(null); }}
          placeholder="Search by name, staff ID, email, or department..."
          className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800"
        />
        {loading && <SpinnerGap size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 animate-spin" />}
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      {isSearching ? (
        <div className="mt-5 space-y-2">
          {searchResults.map((teacher) => <TeacherRow key={teacher._id} teacher={teacher} />)}
          {!loading && searchResults.length === 0 && !error && (
            <div className="py-12 text-center text-gray-400 text-sm">No teachers match “{term.trim()}”.</div>
          )}
        </div>
      ) : activeDepartment ? (
        <div className="mt-5">
          <Button variant="plain"
            type="button"
            onClick={() => setActiveDepartment(null)}
            className="flex items-center gap-1 text-sm font-medium text-green-700 hover:underline mb-3"
          >
            <CaretLeft size={15} /> All departments
          </Button>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-900">{activeDepartment}</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
              {teachersInDepartment.length} teacher{teachersInDepartment.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-2">
            {teachersInDepartment.map((teacher) => <TeacherRow key={teacher._id} teacher={teacher} />)}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Browse by department</p>
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
              <SpinnerGap size={28} className="animate-spin text-green-600" />
              <span className="text-sm">Loading departments…</span>
            </div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No teachers found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(({ department, count }) => (
                <Button variant="plain"
                  key={department}
                  type="button"
                  onClick={() => setActiveDepartment(department)}
                  className="group text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-green-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                      <GraduationCap size={24} className="text-white" />
                    </div>
                    <ArrowRight size={18} className="text-gray-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg text-gray-900 leading-tight">{department}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <Users size={14} className="text-gray-400" />
                    {count} teacher{count === 1 ? '' : 's'}
                  </p>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
