import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CaretLeft, SpinnerGap, MagnifyingGlass, UserCircle, Users } from '@phosphor-icons/react';
import { parentsApi } from '../../parents/api/parentsApi';
import type { Parent } from '../../parents/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSelect: (parent: Parent) => void;
}

/** Admin gateway that mirrors the Student Portal search-and-browse experience. */
export default function AdminParentSearch({ onSelect }: Props) {
  const [term, setTerm] = useState('');
  const [parents, setParents] = useState<Parent[]>([]);
  const [activeRelationship, setActiveRelationship] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const result = await parentsApi.getAll({ limit: 500 });
        if (!cancelled) setParents(result.parents);
      } catch {
        if (!cancelled) setError('Failed to load parents. Is the server running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const relationshipGroups = useMemo(() => {
    const groups = new Map<string, number>();
    parents.forEach((parent) => {
      const relationship = parent.relationship?.trim() || 'Guardian';
      groups.set(relationship, (groups.get(relationship) || 0) + 1);
    });
    return [...groups.entries()]
      .map(([relationship, count]) => ({ relationship, count }))
      .sort((a, b) => a.relationship.localeCompare(b.relationship));
  }, [parents]);

  const searchResults = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return [];
    return parents.Funnel((parent) => [
      parent.name,
      parent.phone,
      parent.email,
      parent.relationship,
    ].Funnel(Boolean).join(' ').toLowerCase().includes(query)).slice(0, 25);
  }, [parents, term]);

  const parentsInGroup = useMemo(() => {
    if (!activeRelationship) return [];
    return parents
      .Funnel((parent) => (parent.relationship?.trim() || 'Guardian') === activeRelationship)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeRelationship, parents]);

  const isSearching = term.trim().length > 0;

  const ParentRow = ({ parent }: { parent: Parent }) => (
    <Button variant="plain"
      type="button"
      onClick={() => onSelect(parent)}
      className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-green-400 hover:shadow-sm transition"
    >
      <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
        <UserCircle size={20} className="text-green-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">{parent.name}</p>
        <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{parent.phone || 'No phone'}</span>
          <span>· {parent.relationship || 'Guardian'}</span>
          {typeof parent.childrenCount === 'number' && (
            <span className="inline-flex items-center gap-1"><Users size={11} /> {parent.childrenCount} child{parent.childrenCount === 1 ? '' : 'ren'}</span>
          )}
        </p>
      </div>
      <ArrowRight size={18} className="text-gray-300" />
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
        <p className="text-gray-500 mt-1 text-sm">
          MagnifyingGlass for a parent, or browse guardians by relationship, to view their family portal.
        </p>
      </div>

      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          autoFocus
          type="text"
          value={term}
          onChange={(event) => { setTerm(event.target.value); setActiveRelationship(null); }}
          placeholder="Search by name, phone, email, or relationship..."
          className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800"
        />
        {loading && <SpinnerGap size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 animate-spin" />}
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      {isSearching ? (
        <div className="mt-5 space-y-2">
          {searchResults.map((parent) => <ParentRow key={parent._id} parent={parent} />)}
          {!loading && searchResults.length === 0 && !error && (
            <div className="py-12 text-center text-gray-400 text-sm">No parents match “{term.trim()}”.</div>
          )}
        </div>
      ) : activeRelationship ? (
        <div className="mt-5">
          <Button variant="plain"
            type="button"
            onClick={() => setActiveRelationship(null)}
            className="flex items-center gap-1 text-sm font-medium text-green-700 hover:underline mb-3"
          >
            <CaretLeft size={15} /> All guardian groups
          </Button>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-900">{activeRelationship}</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
              {parentsInGroup.length} parent{parentsInGroup.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-2">
            {parentsInGroup.map((parent) => <ParentRow key={parent._id} parent={parent} />)}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Browse by relationship</p>
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
              <SpinnerGap size={28} className="animate-spin text-green-600" />
              <span className="text-sm">Loading guardian groups…</span>
            </div>
          ) : relationshipGroups.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No parents found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relationshipGroups.map(({ relationship, count }) => (
                <Button variant="plain"
                  key={relationship}
                  type="button"
                  onClick={() => setActiveRelationship(relationship)}
                  className="group text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-green-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                      <Users size={24} className="text-white" />
                    </div>
                    <ArrowRight size={18} className="text-gray-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg text-gray-900 leading-tight">{relationship}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <UserCircle size={14} className="text-gray-400" />
                    {count} parent{count === 1 ? '' : 's'}
                  </p>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
