import { Printer } from '@phosphor-icons/react';

import GradeBadge from './GradeBadge';
import { gradeFor, gradeMeta, PASS_PERCENTAGE } from '../../data/gradeBands';
import type { GradeLetter, SubjectMark } from '../../types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';

/**
 * A report card is the same shape whether it comes from a class-wide result
 * row (officer view) or one student's own results (student/parent view), so
 * both feed this one component.
 */
export interface ReportCardData {
  studentName: string;
  rollNo: string;
  className: string;
  /** Omitted when the student's position in class isn't known. */
  rank?: number | null;
  marks: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: GradeLetter;
  isPass: boolean;
}

interface Props {
  data: ReportCardData;
  examName: string;
  showPrint?: boolean;
}

export default function ReportCard({ data, examName, showPrint = true }: Props) {
  const meta = gradeMeta(data.grade);
  const rankLabel = data.rank ? `#${data.rank}` : '—';

  return (
    <div
      id="report-card-print"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-0"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg">
            SS
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">SOBET SCHOOL</h2>
            <p className="text-green-100 text-xs">Dugsiga Hoose Dhexe iyo Sare ee Sobet</p>
            <p className="text-green-50 text-sm mt-1">{examName} · Report Card</p>
          </div>
        </div>
        {showPrint && (
          <Button variant="plain"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition print:hidden"
          >
            <Printer size={16} />
            Print / FloppyDisk as PDF
          </Button>
        )}
      </div>

      {/* Student info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-100">
        <Info label="Student Name" value={data.studentName} />
        <Info label="Roll Number" value={data.rollNo} />
        <Info label="Class" value={data.className} />
        <Info label="Class Rank" value={rankLabel} />
      </div>

      {/* Subject table */}
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[620px] text-sm">
          <TableHeader>
            <TableRow className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <TableHead className="px-6 py-3 font-medium">Subject</TableHead>
              <TableHead className="px-6 py-3 font-medium text-center">Marks</TableHead>
              <TableHead className="px-6 py-3 font-medium text-center">Out of</TableHead>
              <TableHead className="px-6 py-3 font-medium text-center">Grade</TableHead>
              <TableHead className="px-6 py-3 font-medium text-center">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.marks.map((m) => {
              // A null mark means the student did not sit that subject —
              // shown as "—" rather than counted as a zero.
              if (m.marks === null) {
                return (
                  <TableRow key={m.subjectId} className="border-b border-gray-50">
                    <TableCell className="px-6 py-3 font-medium text-gray-800">{m.subjectName}</TableCell>
                    <TableCell className="px-6 py-3 text-center text-gray-300">—</TableCell>
                    <TableCell className="px-6 py-3 text-center text-gray-400">{m.maxMarks}</TableCell>
                    <TableCell className="px-6 py-3 text-center text-gray-300">—</TableCell>
                    <TableCell className="px-6 py-3 text-center text-xs text-gray-400">Not sat</TableCell>
                  </TableRow>
                );
              }

              const pct = (m.marks / m.maxMarks) * 100;
              const pass = pct >= PASS_PERCENTAGE;
              return (
                <TableRow key={m.subjectId} className="border-b border-gray-50">
                  <TableCell className="px-6 py-3 font-medium text-gray-800">{m.subjectName}</TableCell>
                  <TableCell className="px-6 py-3 text-center text-gray-700">{m.marks}</TableCell>
                  <TableCell className="px-6 py-3 text-center text-gray-400">{m.maxMarks}</TableCell>
                  <TableCell className="px-6 py-3 text-center">
                    <GradeBadge grade={gradeFor(pct)} />
                  </TableCell>
                  <TableCell className="px-6 py-3 text-center">
                    <span className={`text-xs font-medium ${pass ? 'text-green-600' : 'text-red-600'}`}>
                      {pass ? 'Pass' : 'Fail'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-gray-50/70 font-semibold text-gray-800">
              <TableCell className="px-6 py-3">Total</TableCell>
              <TableCell className="px-6 py-3 text-center">{data.totalObtained}</TableCell>
              <TableCell className="px-6 py-3 text-center text-gray-400">{data.totalMax}</TableCell>
              <TableCell className="px-6 py-3 text-center">
                <GradeBadge grade={data.grade} />
              </TableCell>
              <TableCell className="px-6 py-3 text-center">
                <span className={`text-xs font-medium ${data.isPass ? 'text-green-600' : 'text-red-600'}`}>
                  {data.isPass ? 'Pass' : 'Fail'}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        <SummaryBox label="Percentage" value={`${data.percentage}%`} accent="text-green-600" />
        <SummaryBox label="Overall Grade" value={data.grade} accent="text-blue-600" />
        <SummaryBox label="Remark" value={meta.label} accent="text-purple-600" />
        <SummaryBox label="Class Position" value={rankLabel} accent="text-amber-600" />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function SummaryBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
