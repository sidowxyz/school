import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, SpinnerGap, ArrowRight, CaretLeft, GraduationCap, Users, BookOpen, Sparkle, Buildings, UserCheck } from '@phosphor-icons/react';
import { studentsApi } from '../../students/api/studentsApi';
import type { Student, RefClass } from '../../students/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/common/PageHeader';

// A student's classId comes back either populated ({ _id, cl_name, ... }) or as a
// raw id string — normalise to the id so we can group/filter consistently.
function refId(ref: string | { _id: string } | null | undefined): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}

interface Props {
  onSelect: (student: Student) => void;
}

/**
 * Gate shown to admins/staff before the Student Portal. They reach a specific
 * student one of two ways — type a name/admission number, or browse the class
 * cards and drill into a class — then click a student to open their portal.
 * A logged-in student skips this screen entirely (see StudentPortalPage).
 */
export default function AdminStudentSearch({ onSelect }: Props) {
  const [term, setTerm] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<RefClass[]>([]);
  const [activeClass, setActiveClass] = useState<RefClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the roster + class reference data once, then work entirely client-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [roster, refData] = await Promise.all([
          studentsApi.getAll({ limit: 1000 }),
          studentsApi.getReferenceData(),
        ]);
        if (!cancelled) {
          setAllStudents(roster.students);
          setClasses(refData.classes);
        }
      } catch {
        if (!cancelled) setError('Failed to load students. Is the server running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // How many students each class has — powers the count shown on every card.
  const countByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allStudents) {
      const id = refId(s.classId);
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [allStudents]);

  // Free-text search across the whole roster (takes priority over class browsing).
  const searchResults = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return allStudents
      .filter((s) => {
        const haystack = [
          `${s.firstName} ${s.lastName}`,
          s.admissionNumber,
          s.phoneNumber,
          s.parentName,
          s.parentPhoneNumber,
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 25);
  }, [term, allStudents]);

  // Students within the currently opened class card.
  const studentsInActiveClass = useMemo(() => {
    if (!activeClass) return [];
    return allStudents
      .filter((s) => refId(s.classId) === activeClass._id)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [activeClass, allStudents]);

  const isSearching = term.trim().length > 0;

  const StudentRow = ({ s }: { s: Student }) => {
    const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase() || 'ST';
    return (
      <Card
        onClick={() => onSelect(s)}
        className="cursor-pointer border-border/80 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all duration-200 group"
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {s.firstName} {s.lastName}
                </p>
                {s.status && (
                  <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5 h-4">
                    {s.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-mono">{s.admissionNumber}</span>
                {s.phoneNumber && (
                  <>
                    <span>•</span>
                    <span>{s.phoneNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Title & Subtitle */}
      <PageHeader title="Student Portal" subtitle="Find a student to open their portal." />

      {/* Hairline Divided Summary KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 gap-px sm:grid-cols-3">
          <div className="bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users size={14} className="text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Enrolled</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{allStudents.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active student records</p>
          </div>

          <div className="bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Buildings size={14} className="text-info" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Classes</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{classes.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Academic cohorts</p>
          </div>

          <div className="bg-card p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Sparkle size={14} className="text-warning" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Direct Access</span>
            </div>
            <div className="text-sm font-semibold text-foreground mt-1">Instant Lookup</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">By name, admit ID, or guardian</p>
          </div>
        </div>
      </Card>

      {/* Search box */}
      <div className="relative">
        <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          autoFocus
          type="text"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setActiveClass(null); }}
          placeholder="Search by name, admission #, phone, or parent..."
          className="h-12 pl-11 pr-10 text-sm shadow-2xs rounded-xl"
        />
        {loading && (
          <SpinnerGap size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" />
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* 1) search results take over the view while typing */}
      {isSearching ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Search Results ({searchResults.length})</span>
            {searchResults.length > 0 && <span>Click to view portal</span>}
          </div>
          {searchResults.map((s) => <StudentRow key={s._id} s={s} />)}
          {!loading && searchResults.length === 0 && !error && (
            <Card className="border-dashed border-border/80">
              <CardContent className="py-14 text-center text-muted-foreground space-y-1">
                <MagnifyingGlass size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No students match “{term.trim()}”</p>
                <p className="text-xs">Check spelling or try searching by admission ID number.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : activeClass ? (
        /* 2) Drilled into a class — pick a student */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveClass(null)}
              className="gap-1.5"
            >
              <CaretLeft size={14} /> Back to all classes
            </Button>
            <Badge variant="secondary" className="font-semibold text-xs">
              {studentsInActiveClass.length} student{studentsInActiveClass.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{activeClass.cl_name}</h2>
              <p className="text-xs text-muted-foreground">Select a student below to open their portal</p>
            </div>
          </div>

          <div className="space-y-2">
            {studentsInActiveClass.map((s) => <StudentRow key={s._id} s={s} />)}
            {studentsInActiveClass.length === 0 && (
              <Card className="border-dashed border-border/80">
                <CardContent className="py-14 text-center text-muted-foreground space-y-1">
                  <UserCheck size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">No students enrolled</p>
                  <p className="text-xs">There are currently no active students assigned to this class cohort.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* 3) Default — browse by class cards */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Browse by class
            </p>
            <span className="text-xs text-muted-foreground">
              {classes.length} class{classes.length === 1 ? '' : 'es'} available
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <SpinnerGap size={24} className="animate-spin text-primary" />
              <span className="text-xs">Loading classes…</span>
            </div>
          ) : classes.length === 0 ? (
            <Card className="border-dashed border-border/80">
              <CardContent className="py-14 text-center text-muted-foreground space-y-1">
                <BookOpen size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No classes configured</p>
                <p className="text-xs">Set up academic classes and cohorts in Academic Structure.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classes.map((c) => {
                const count = countByClass.get(c._id) ?? 0;
                return (
                  <Card
                    key={c._id}
                    onClick={() => setActiveClass(c)}
                    className="cursor-pointer border-border/80 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all duration-200 group"
                  >
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                      <div className="flex items-start justify-between">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                          <GraduationCap size={20} />
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                      <div className="mt-4">
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {c.cl_name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users size={13} className="text-muted-foreground" />
                          <span>{count} student{count === 1 ? '' : 's'}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
