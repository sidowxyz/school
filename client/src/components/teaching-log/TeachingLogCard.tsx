import { Calendar, Clock, UserCircle, CaretRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { TeachingLog } from '../../types/teachingLog.types';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../lib/utils';

interface TeachingLogCardProps {
  log: TeachingLog;
  onDeleteClick?: (id: string) => void;
}

export default function TeachingLogCard({ log }: TeachingLogCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="bg-primary/10 p-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/15 px-2.5 py-1 rounded-md">
          <span>{log.classId}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Section {log.section}</span>
        </div>
        <StatusBadge status={log.status} />
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-foreground text-lg line-clamp-1 mb-1" title={log.topicTaught}>
          {log.topicTaught}
        </h3>
        <p className="text-sm text-muted-foreground font-medium mb-3">{log.subject}</p>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 italic flex-1">
          &ldquo;{log.lessonObjective}&rdquo;
        </p>

        <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t pt-4 text-xs text-foreground/80 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-muted-foreground" />
            <span>{formatDate(log.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-muted-foreground" />
            <span className="truncate" title={log.period}>{log.period.split(' (')[0]}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <UserCircle size={13} className="text-muted-foreground" />
            <span className="truncate">By {log.createdBy.name}</span>
          </div>
        </div>

        <div className="flex gap-2.5 mt-auto">
          <Link
            to={`/teaching-log/${log._id}`}
            className="flex-1 text-center text-xs font-bold bg-card hover:bg-muted/50 text-foreground border border-border py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
          >
            Details
          </Link>
          <Link
            to={`/teaching-log/${log._id}/edit`}
            className="flex-1 text-center text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
          >
            Edit
            <CaretRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
