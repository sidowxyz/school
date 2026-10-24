import { Eye, PencilSimple, Trash, Calendar, FileText, CaretLeft, CaretRight, NotePencil } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { TeachingLog } from '../../types/teachingLog.types';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button as UiButton } from '@/components/ui/button';
import { TableEmptyRow } from '@/components/common/EmptyState';

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
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Class & Sec</TableHead>
              <TableHead>Topic Taught</TableHead><TableHead>Lesson Objective</TableHead><TableHead>Homework</TableHead>
              <TableHead>Status</TableHead><TableHead>Logged By</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableEmptyRow colSpan={9} icon={NotePencil} tint="green" title="No teaching logs" text="Logs you write after each lesson appear here." />
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-muted-foreground" />
                    {formatDate(log.date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{log.subject}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="bg-muted text-foreground px-2 py-0.5 rounded text-xs font-semibold">
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
                        <FileText size={13} className="text-primary shrink-0" />
                        <span className="truncate">{log.homeworkGiven}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    <div className="font-semibold text-foreground">{log.createdBy.name}</div>
                    <div className="text-[10px] text-muted-foreground">{log.createdBy.email}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs font-medium">
                    <div className="flex justify-end gap-2.5">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => navigate(`/teaching-log/${log._id}${readOnly ? '?readonly=1' : ''}`)}
                        className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </Button>
                      {!readOnly && (
                        <>
                          <Button variant="ghost" size="icon"
                            onClick={() => navigate(`/teaching-log/${log._id}/edit`)}
                            className="text-muted-foreground hover:text-info p-1 rounded hover:bg-muted"
                            title="Edit Log"
                          >
                            <PencilSimple size={15} />
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => onDeleteClick(log._id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted"
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
        <div className="px-6 py-4 bg-muted/50 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
            <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-foreground">{total}</span> records
          </p>

          <div className="flex gap-2">
            <UiButton variant="outline" size="icon-sm"
              onClick={handlePrevPage}
              disabled={page === 1}
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
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-foreground/80 border-border hover:bg-muted/50'
                  }`}
                >
                  {p}
                </UiButton>
              );
            })}
            <UiButton variant="outline" size="icon-sm"
              onClick={handleNextPage}
              disabled={page === totalPages}
            >
              <CaretRight size={16} />
            </UiButton>
          </div>
        </div>
      )}
    </div>
  );
}
