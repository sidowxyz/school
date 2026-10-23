import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { useParentPortal } from '../context/ParentContext';
import { fullName, initialsOf, classSectionLabel } from '../../student-portal/utils/portalStudent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '../../../components/common/PageHeader';

interface Props {
  onChildChange: (id: string) => void;
}

export default function ParentBanner({ onChildChange }: Props) {
  const { children, child, childId } = useParentPortal();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Parent Portal"
        subtitle={
          children.length > 0
            ? `${children.length} ${children.length === 1 ? 'child' : 'children'} linked${
                child ? ` • viewing ${fullName(child)}` : ''
              }`
            : 'Access student academics, attendance, and fee status.'
        }
      />

      {children.length > 0 && (
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Child
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Switch between linked children to view academic progress
                </p>
              </div>

              {/* Child Selection: Pills if few, or custom dropdown */}
              <div className="relative min-w-[280px] max-w-md" ref={ref}>
                <Button
                  variant="outline"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 h-auto text-xs bg-background border-border hover:bg-muted/50 rounded-xl shadow-2xs"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {child ? initialsOf(child) : '?'}
                    </span>
                    <span className="truncate text-left">
                      <span className="font-semibold text-foreground block truncate">
                        {child ? fullName(child) : 'Select a child'}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {child ? classSectionLabel(child) : ''}
                      </span>
                    </span>
                  </span>
                  <CaretDown
                    size={14}
                    className={`text-muted-foreground transition-transform shrink-0 ml-2 ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </Button>

                {open && (
                  <div className="absolute right-0 left-0 top-full mt-1.5 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border overflow-hidden z-50 p-1 animate-in fade-in-0 zoom-in-95">
                    {children.map((c) => {
                      const isSelected = c._id === childId;
                      return (
                        <Button variant="plain"
                          key={c._id}
                          type="button"
                          onClick={() => {
                            onChildChange(c._id);
                            setOpen(false);
                          }}
                          className={`w-full text-left flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                              {initialsOf(c)}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold block truncate">{fullName(c)}</span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {classSectionLabel(c)}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-primary shrink-0" />}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
