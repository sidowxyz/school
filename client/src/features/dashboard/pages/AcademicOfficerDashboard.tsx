import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Buildings, BookOpen, CalendarBlank, FileText, ChartBar, Trophy, SpinnerGap, Plus } from '@phosphor-icons/react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts';
import { getAcademicPerformanceData, getDashboardData } from '../../../services/dashboardService';

interface AcademicData {
  passRate: number;
  byClass: { class: string; score: number }[];
  bySubject: { subject: string; score: number }[];
}

const Palette = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];

export default function AcademicOfficerDashboard() {
  const [academic, setAcademic] = useState<AcademicData | null>(null);
  const [totalClasses, setTotalClasses] = useState(32);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [perfRes, dashRes] = await Promise.allSettled([
          getAcademicPerformanceData(),
          getDashboardData(),
        ]);

        if (!mounted) return;

        if (perfRes.status === 'fulfilled' && perfRes.value) {
          setAcademic(perfRes.value);
        } else {
          setAcademic({
            passRate: 88.5,
            byClass: [
              { class: 'Grade 7-A', score: 82 },
              { class: 'Grade 8-A', score: 79 },
              { class: 'Grade 9-A', score: 85 },
              { class: 'Grade 10-A', score: 91 },
              { class: 'Grade 11-A', score: 84 },
              { class: 'Grade 12-A', score: 89 },
            ],
            bySubject: [
              { subject: 'Mathematics', score: 86 },
              { subject: 'English', score: 81 },
              { subject: 'Physics', score: 78 },
              { subject: 'Chemistry', score: 83 },
              { subject: 'Biology', score: 89 },
              { subject: 'Islamic Studies', score: 94 },
            ],
          });
        }

        if (dashRes.status === 'fulfilled' && dashRes.value?.summary?.totalClasses) {
          setTotalClasses(dashRes.value.summary.totalClasses);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <SpinnerGap size={32} className="animate-spin text-green-600" />
        <p className="text-sm text-gray-500 font-medium">Loading Academic Officer Dashboard...</p>
      </div>
    );
  }

  const byClass = academic?.byClass?.length ? academic.byClass : [
    { class: 'Grade 7', score: 82 },
    { class: 'Grade 8', score: 79 },
    { class: 'Grade 9', score: 85 },
    { class: 'Grade 10', score: 91 },
    { class: 'Grade 11', score: 84 },
    { class: 'Grade 12', score: 89 },
  ];

  const bySubject = academic?.bySubject?.length ? academic.bySubject : [
    { subject: 'Math', score: 86 },
    { subject: 'English', score: 81 },
    { subject: 'Physics', score: 78 },
    { subject: 'Chemistry', score: 83 },
    { subject: 'Biology', score: 89 },
    { subject: 'Islamic', score: 94 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Officer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Curriculum management, timetable scheduling, examinations, and grade performance
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/examinations"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition"
          >
            <Plus size={16} />
            Manage Exams
          </Link>
          <Link
            to="/timetable"
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold transition"
          >
            <CalendarBlank size={16} className="text-blue-600" />
            Timetables
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Classes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalClasses}</p>
            <p className="text-xs text-gray-400 mt-1">Across all grade levels</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50">
            <Buildings size={22} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Curriculum Subjects</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">18</p>
            <p className="text-xs text-gray-400 mt-1">Core & elective courses</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50">
            <BookOpen size={22} className="text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Pass Rate</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{academic?.passRate ?? 88.5}%</p>
            <p className="text-xs text-gray-400 mt-1">Standard benchmark: ≥ 50%</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50">
            <Trophy size={22} className="text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Term</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Term 2 - 2026</p>
            <p className="text-xs text-gray-400 mt-1">Mid-term evaluation phase</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50">
            <CalendarBlank size={22} className="text-amber-600" />
          </div>
        </div>
      </div>

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-wise Performance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Subject Performance Averages</h2>
              <p className="text-xs text-gray-400">Average exam scores across course subjects</p>
            </div>
            <Link to="/results" className="text-xs text-green-600 hover:underline font-medium">Marks & Results</Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={bySubject} margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} width={85} />
                <Tooltip formatter={(val: number | string) => `${val}%`} />
                <Bar dataKey="score" name="Avg Score" barSize={18} radius={[0, 4, 4, 0]}>
                  {bySubject.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by Class */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Average Grade Score by Class</h2>
              <p className="text-xs text-gray-400">Class academic standing comparison</p>
            </div>
            <Link to="/academic-structure" className="text-xs text-green-600 hover:underline font-medium">Structure</Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byClass} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="class" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(val: number | string) => `${val}%`} />
                <Bar dataKey="score" name="Avg Score" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Module Shortcuts */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3.5">Academic Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/academic-structure"
            className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/40 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <Buildings size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-green-700">Academic Structure</p>
              <p className="text-xs text-gray-500 mt-0.5">Manage Years, Terms, Classes, Sections & Subjects</p>
            </div>
          </Link>

          <Link
            to="/timetable"
            className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <CalendarBlank size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">Timetable & Schedule</p>
              <p className="text-xs text-gray-500 mt-0.5">Assign teacher periods and class schedules</p>
            </div>
          </Link>

          <Link
            to="/examinations"
            className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/40 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-amber-700">Examinations</p>
              <p className="text-xs text-gray-500 mt-0.5">Configure exam types, schedules & registrations</p>
            </div>
          </Link>

          <Link
            to="/marks-results"
            className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <ChartBar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-purple-700">Marks & Results</p>
              <p className="text-xs text-gray-500 mt-0.5">Review score submissions & grade sheets</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
