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
  MagnifyingGlass,
  setSearch,
  user,
  setUser,
  action,
  setAction,
  date,
  setDate,
}: AuditFiltersProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-10">

        {/* MagnifyingGlass */}
        <div className="xl:col-span-3">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            MagnifyingGlass Logs
          </label>

          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <Input
              type="text"
              value={MagnifyingGlass}
onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, module or action..."
              
              className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* User */}
        <div className="xl:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            User
          </label>

          <NativeSelect
  value={user}
  onChange={(e) => setUser(e.target.value)}
  className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
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
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Action
          </label>

          <NativeSelect 
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500">
            <option>All Actions</option>
            <option>Created</option>
            <option>Updated</option>
            <option>Deleted</option>
            <option>Viewed</option>
          </NativeSelect>
        </div>

        {/* Date */}
        <div className="xl:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Date
          </label>

          <div className="relative">
            <CalendarBlank
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <Input
              type="date"
              
  value={date}
  onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Apply */}
        <div className="lg:col-span-1 flex items-end">
          <Button variant="plain" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-white transition hover:bg-green-700">
            <Funnel size={18} />
            Apply
          </Button>
        </div>

      </div>
    </div>
  );
}