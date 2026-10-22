import { Eye, PencilSimple, Trash, Calendar, FileText, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { TeachingLog } from '../../types/teachingLog.types';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button as UiButton } from '@/components/ui/button';

interface TeachingLogTableProps {
  logs: TeachingLog[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onDeleteClick: (id: string) => void;
  readOnly?: boolean;
}

export default function TeachingLogTable({
  logs,
  total,
  page,
  limit,
  onPageChange,
  onDeleteClick,
  readOnly = false,
}: TeachingLogTableProps) {
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / limit);

  const handlePrevPage = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  return (
    <div className="school-card overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f3f7f5] hover:bg-[#f3f7f5]">
              <TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Class & Sec</TableHead>
              <TableHead>Topic Taught</TableHead><TableHead>Lesson Objective</TableHead><TableHead>Homework</TableHead>
              <TableHead>Status</TableHead><TableHead>Logged By</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-[var(--school-muted)]">
                  No teaching logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    {formatDate(log.date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{log.subject}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="bg-gray-100 text-gray-750 px-2 py-0.5 rounded text-xs font-semibold">
                      {log.classId}-{log.section}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate font-medium" title={log.topicTaught}>
                    {log.topicTaught}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate italic" title={log.lessonObjective}>
                    {log.lessonObjective}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={log.homeworkGiven}>
                    {log.homeworkGiven ? (
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-green-550 shrink-0" />
                        <span className="truncate">{log.homeworkGiven}</span>
                      </span>
                    ) : (
                      <span className="text-gray-405 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    <div className="font-semibold text-gray-800">{log.createdBy.name}</div>
                    <div className="text-[10px] text-gray-400">{log.createdBy.email}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs font-medium">
                    <div className="flex justify-end gap-2.5">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => navigate(`/teaching-log/${log._id}${readOnly ? '?readonly=1' : ''}`)}
                        className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-gray-100 transition-colors"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </Button>
                      {!readOnly && (
                        <>
                          <Button variant="ghost" size="icon"
                            onClick={() => navigate(`/teaching-log/${log._id}/edit`)}
                            className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Edit Log"
                          >
                            <PencilSimple size={15} />
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => onDeleteClick(log._id)}
                            className="text-gray-400 hover:text-red-650 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Delete Log"
                          >
                            <Trash size={15} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-900">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-gray-900">{total}</span> records
          </p>

          <div className="flex gap-2">
            <UiButton variant="plain"
              onClick={handlePrevPage}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CaretLeft size={16} />
            </UiButton>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const isCurrent = p === page;
              return (
                <UiButton variant="plain"
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors border ${
                    isCurrent
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </UiButton>
              );
            })}
            <UiButton variant="plain"
              onClick={handleNextPage}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CaretRight size={16} />
            </UiButton>
          </div>
        </div>
      )}
    </div>
  );
}
