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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="bg-green-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-100/50 px-2.5 py-1 rounded-md">
          <span>{log.classId}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Section {log.section}</span>
        </div>
        <StatusBadge status={log.status} />
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 text-lg line-clamp-1 mb-1" title={log.topicTaught}>
          {log.topicTaught}
        </h3>
        <p className="text-sm text-gray-500 font-medium mb-3">{log.subject}</p>

        <p className="text-xs text-gray-400 line-clamp-2 mb-4 italic flex-1">
          &ldquo;{log.lessonObjective}&rdquo;
        </p>

        <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t pt-4 text-xs text-gray-650 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            <span>{formatDate(log.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-gray-400" />
            <span className="truncate" title={log.period}>{log.period.split(' (')[0]}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <UserCircle size={13} className="text-gray-400" />
            <span className="truncate">By {log.createdBy.name}</span>
          </div>
        </div>

        <div className="flex gap-2.5 mt-auto">
          <Link
            to={`/teaching-log/${log._id}`}
            className="flex-1 text-center text-xs font-bold bg-white hover:bg-gray-50 text-gray-750 border border-gray-200 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
          >
            Details
          </Link>
          <Link
            to={`/teaching-log/${log._id}/edit`}
            className="flex-1 text-center text-xs font-bold bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
          >
            Edit
            <CaretRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
