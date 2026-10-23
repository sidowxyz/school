import { Tray, type Icon } from '@phosphor-icons/react';

interface Props {
  text?: string;
  /** Older name for `text`, kept so existing call sites keep working. */
  message?: string;
  icon?: Icon;
}

export function EmptyState({ text, message, icon: IconComponent = Tray }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <IconComponent size={18} />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{text ?? message ?? 'No records found'}</p>
    </div>
  );
}

export default EmptyState;
