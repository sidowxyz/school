import { TeachingLogStatus } from '../../types/teachingLog.types';
import { StatusBadge as BaseStatusBadge } from '@/components/common/StatusBadge';

interface StatusBadgeProps {
  status: TeachingLogStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <BaseStatusBadge status={status} />;
}
