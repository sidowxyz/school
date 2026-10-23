import { MagnifyingGlass, CalendarBlank, Funnel } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

interface AuditFiltersProps {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  user: string;
  setUser: React.Dispatch<React.SetStateAction<string>>;
  action: string;
  setAction: React.Dispatch<React.SetStateAction<string>>;
  date: string;
  setDate: React.Dispatch<React.SetStateAction<string>>;
}
export default function AuditFilters({
  search,
  setSearch,
  user,
  setUser,
  action,
  setAction,
  date,
  setDate,
}: AuditFiltersProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-10">

        {/* Search */}
        <div className="xl:col-span-3">
          <label className="mb-2 block text-sm font-medium text-foreground/80">
            Search Logs
          </label>

          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              type="text"
              value={search}
onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, module or action..."
              
              className="h-11 w-full rounded-lg border border-border pl-10 pr-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* User */}
        <div className="xl:col-span-2">
          <label className="mb-2 block text-sm font-medium text-foreground/80">
            User
          </label>

          <NativeSelect
  value={user}
  onChange={(e) => setUser(e.target.value)}
  className="h-11 w-full rounded-lg border border-border px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary"
>
            <option>All Users</option>
            <option>Admin</option>
            <option>Registrar</option>
            <option>Finance Admin</option>
            <option>System Admin</option>
            <option>Librarian</option>
          </NativeSelect>
        </div>
        {/* Action */}
        <div className="xl:col-span-2">
          <label className="mb-2 block text-sm font-medium text-foreground/80">
            Action
          </label>

          <NativeSelect 
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-11 w-full rounded-lg border border-border px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary">
            <option>All Actions</option>
            <option>Created</option>
            <option>Updated</option>
            <option>Deleted</option>
            <option>Viewed</option>
          </NativeSelect>
        </div>

        {/* Date */}
        <div className="xl:col-span-2">
          <label className="mb-2 block text-sm font-medium text-foreground/80">
            Date
          </label>

          <div className="relative">
            <CalendarBlank
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              type="date"
              
  value={date}
  onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-border pl-10 pr-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Apply */}
        <div className="lg:col-span-1 flex items-end">
          <Button variant="plain" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-primary-foreground transition hover:bg-primary/90">
            <Funnel size={18} />
            Apply
          </Button>
        </div>

      </div>
    </div>
  );
}