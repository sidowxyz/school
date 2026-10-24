import { MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import { DatePicker } from '@/components/ui/date-picker';
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
  userOptions: string[];
  actionOptions: string[];
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
  userOptions,
  actionOptions,
}: AuditFiltersProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      {/* Search gets the most room; Clear sizes to its label. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">

        {/* Search */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/80">
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
              
              className="pl-10"
            />
          </div>
        </div>

        {/* User */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/80">
            User
          </label>

          <NativeSelect
  value={user}
  onChange={(e) => setUser(e.target.value)}
  className="w-full"
>
            <option>All Users</option>
            {userOptions.map((u) => <option key={u}>{u}</option>)}
          </NativeSelect>
        </div>
        {/* Action */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/80">
            Action
          </label>

          <NativeSelect 
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full">
            <option>All Actions</option>
            {actionOptions.map((a) => <option key={a}>{a}</option>)}
          </NativeSelect>
        </div>

        {/* Date */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/80">
            Date
          </label>

          <DatePicker value={date} onChange={setDate} max={new Date().toLocaleDateString('en-CA')} placeholder="Any date" clearable aria-label="Date" />
        </div>

        {/* Filters apply as you change them; this resets them all. */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => { setSearch(''); setUser('All Users'); setAction('All Actions'); setDate(''); }}
            className="w-full lg:w-auto"
          >
            <Funnel size={16} />
            Clear
          </Button>
        </div>

      </div>
    </div>
  );
}