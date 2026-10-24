import { useState, useRef, useEffect } from "react";
import { Calendar, Check, CaretDown, List } from '@phosphor-icons/react';
import { academicApi } from "../../features/academic-structure/api/academicApi";
import type { Year } from "../../features/academic-structure/types";
import { useAcademicYearStore } from "../../store/academicYearStore";
import { Button } from '@/components/ui/button';
import ProfileMenu from './ProfileMenu';

interface TopBarProps {
  onMobileMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function TopBar({ onMobileMenuClick, showMenuButton = true }: TopBarProps) {
  const [years, setYears] = useState<Year[]>([]);
  const { selectedYearId, setSelectedYearId } = useAcademicYearStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    academicApi.getYears()
      .then(async (list) => {
        setYears(list);
        const stillValid = list.some((y) => y._id === selectedYearId);
        if (!stillValid) {
          const current = await academicApi.getCurrentYear().catch(() => null);
          const fallbackId = current?._id ?? list[0]?._id;
          if (fallbackId) setSelectedYearId(fallbackId);
        }
      })
      .catch(() => setYears([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedYear = years.find((y) => y._id === selectedYearId);

  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
      {/* Mobile Hamburger Menu */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="lg:hidden text-muted-foreground hover:text-foreground"
          aria-label="Toggle Navigation Menu"
        >
          <List size={20} />
        </Button>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Academic Year Selector */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-10 rounded-full px-4 font-medium text-foreground bg-card hover:bg-accent"
          >
            <Calendar size={13} className="text-muted-foreground" />
            <span className="max-w-[120px] sm:max-w-none truncate">
              {selectedYear ? selectedYear.y_name : "Academic Year"}
            </span>
            <CaretDown size={12} className="text-muted-foreground" />
          </Button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-popover text-popover-foreground rounded-lg shadow-md border border-border overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
              <div className="p-2 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Academic Year
              </div>
              <div className="p-1 max-h-56 overflow-y-auto">
                {years.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground italic">No academic years configured</div>
                ) : (
                  years.map((year) => (
                    <Button
                      variant="ghost"
                      key={year._id}
                      type="button"
                      onClick={() => {
                        setSelectedYearId(year._id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-colors h-auto ${
                        selectedYearId === year._id
                          ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{year.y_name}</span>
                      {selectedYearId === year._id && <Check size={14} />}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <ProfileMenu />
      </div>
    </header>
  );
}