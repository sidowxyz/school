import { MagnifyingGlass, ArrowsClockwise } from '@phosphor-icons/react';
import { TeachingLogFilters as FilterTypes, TeachingLogStatus } from '../../types/teachingLog.types';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

interface TeachingLogFiltersProps {
  filters: FilterTypes;
  onFilterChange: (filters: FilterTypes) => void;
  onReset: () => void;
  classOptions?: string[];
  subjectOptions?: string[];
}

export default function TeachingLogFilters({
  filters,
  onFilterChange,
  onReset,
  classOptions = [],
  subjectOptions = [],
}: TeachingLogFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ classId: e.target.value });
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ subject: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ status: e.target.value as TeachingLogStatus | '' });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ date: e.target.value });
  };

  const selectCls =
    'border border-border rounded-lg px-3 py-2.5 text-sm text-foreground/80 bg-card hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[140px] cursor-pointer';

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-5 flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search logs (topic, objective, teacher...)"
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Class Filter */}
      <NativeSelect value={filters.classId || ''} onChange={handleClassChange} className={selectCls}>
        <option value="">All Classes</option>
        {classOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </NativeSelect>

      {/* Subject Filter */}
      <NativeSelect value={filters.subject || ''} onChange={handleSubjectChange} className={selectCls}>
        <option value="">All Subjects</option>
        {subjectOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </NativeSelect>

      {/* Status Filter */}
      <NativeSelect value={filters.status || ''} onChange={handleStatusChange} className={selectCls}>
        <option value="">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="draft">Draft</option>
      </NativeSelect>

      {/* Date Filter */}
      <Input
        type="date"
        value={filters.date || ''}
        onChange={handleDateChange}
        className="border border-border rounded-lg px-3 py-2 text-sm text-foreground/80 bg-card hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
      />

      {/* Reset Button */}
      <Button variant="plain"
        onClick={onReset}
        title="Reset Filters"
        className="flex items-center justify-center border border-border hover:border-warning/40 rounded-lg p-2.5 text-muted-foreground hover:bg-warning/10 hover:text-warning transition-colors font-medium cursor-pointer"
      >
        <ArrowsClockwise size={16} />
      </Button>
    </div>
  );
}
