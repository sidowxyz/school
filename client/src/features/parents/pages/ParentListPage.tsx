import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  SpinnerGap,
  MagnifyingGlass,
  Users,
  UserCheck,
  Percent,
  UserPlus,
  DownloadSimple,
  Phone,
  CaretRight,
  X,
} from '@phosphor-icons/react';

import PageHeader from "../../../components/common/PageHeader";
import StatStrip from "@/components/shared/StatStrip";
import AddParentModal from "../components/AddParentModal";
import { parentsApi } from "../api/parentsApi";
import type { Parent } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { downloadCSV } from "../../reports/utils/csv";

type ChildrenFilter = "all" | "with" | "without";

const AVATAR_FILLS = ["bg-tile-pink", "bg-tile-yellow", "bg-tile-blue", "bg-tile-violet", "bg-tile-green"];

function familyTier(parent: Parent): string {
  if (!parent.familyId || typeof parent.familyId === "string") return "None";
  return parent.familyId.discountTier || "None";
}

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "P";

export default function ParentListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [childrenFilter, setChildrenFilter] = useState<ChildrenFilter>("all");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { parents: list } = await parentsApi.getAll({ limit: 200 });
      setParents(list.slice().sort((a, b) => a.name.localeCompare(b.name)));
      setError("");
    } catch {
      setError("Could not load parents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tiers = useMemo(
    () => [...new Set(parents.map(familyTier).filter((t) => t !== "None"))].sort(),
    [parents],
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return parents.filter((p) => {
      const haystack = `${p.name} ${p.phone} ${p.email ?? ""} ${p.relationship ?? ""}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (tierFilter !== "All" && familyTier(p) !== tierFilter) return false;
      const kids = p.childrenCount ?? 0;
      if (childrenFilter === "with" && kids === 0) return false;
      if (childrenFilter === "without" && kids > 0) return false;
      return true;
    });
  }, [parents, search, tierFilter, childrenFilter]);

  const withChildren = parents.filter((p) => (p.childrenCount ?? 0) > 0).length;
  const withDiscount = parents.filter((p) => familyTier(p) !== "None").length;
  const filtering = search !== "" || tierFilter !== "All" || childrenFilter !== "all";

  const clearFilters = () => { setSearch(""); setTierFilter("All"); setChildrenFilter("all"); };

  const exportParents = () => downloadCSV(`parents-${new Date().toISOString().slice(0, 10)}`, filtered.map((p) => ({
    Name: p.name,
    Relationship: p.relationship,
    Phone: p.phone,
    Email: p.email ?? "",
    Children: p.childrenCount ?? 0,
    "Sibling discount": familyTier(p) === "None" ? "" : familyTier(p),
    "Main contact": p.isPrimary ? "Yes" : "No",
  })));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents"
        subtitle="Parents and guardians, their children, and sibling discounts."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportParents} disabled={loading || filtered.length === 0} className="gap-2">
              <DownloadSimple size={14} /> <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" onClick={() => setOpenAddModal(true)} className="gap-2">
              <UserPlus size={15} /> Add parent
            </Button>
          </div>
        }
      />

      <StatStrip items={[
        { label: "Parents", value: loading ? "—" : parents.length, tone: "sky", icon: Users, hint: "Parents and guardians on record" },
        { label: "With children", value: loading ? "—" : withChildren, tone: "emerald", icon: UserCheck, hint: `${Math.max(0, parents.length - withChildren)} not linked to a student yet` },
        { label: "Sibling discount", value: loading ? "—" : withDiscount, tone: "violet", icon: Percent, hint: "Families with more than one child" },
      ]} />

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or email" className="h-9 pl-8 pr-8" aria-label="Search parents" />
            {search && (
              <Button variant="plain" type="button" onClick={() => setSearch("")} aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </Button>
            )}
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            {([["all", "All"], ["with", "With children"], ["without", "No children"]] as [ChildrenFilter, string][]).map(([v, label]) => (
              <Button key={v} variant="plain" type="button" onClick={() => setChildrenFilter(v)}
                className={cn("rounded-md px-3 py-1 font-medium", childrenFilter === v ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                {label}
              </Button>
            ))}
          </div>
          {tiers.length > 0 && (
            <NativeSelect value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="h-9 w-44 text-xs" aria-label="Sibling discount">
              <option value="All">Any discount</option>
              <option value="None">No discount</option>
              {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {parents.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><SpinnerGap size={24} className="animate-spin text-primary" /></div>
        ) : error ? (
          <div className="space-y-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>Try again</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-auto max-w-sm space-y-3 px-4 py-14 text-center">
            <p className="text-sm font-medium text-foreground">{filtering ? "No parents match" : "No parents yet"}</p>
            <p className="text-sm text-muted-foreground">
              {filtering
                ? "Try a different search or filter."
                : "Parents are added when you register a student, or here. For brothers and sisters, pick the same parent so they share one family and its sibling discount."}
            </p>
            {filtering ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
            ) : (
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => setOpenAddModal(true)} className="gap-1.5"><UserPlus size={14} /> Add parent</Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/students", { state: { openCreate: true } })}>Register a student</Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p, i) => {
              const tier = familyTier(p);
              const kids = p.childrenCount ?? 0;
              return (
                <li key={p._id}>
                  <Button variant="plain" type="button" onClick={() => navigate(`/parents/${p._id}`)}
                    className="group flex h-auto w-full items-center gap-3 px-4 py-3 text-left font-normal transition-colors hover:bg-muted/50">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-tile-foreground", AVATAR_FILLS[i % AVATAR_FILLS.length])}>
                      {initials(p.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{p.name}</span>
                        {p.isPrimary && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Main contact</span>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.relationship || "Guardian"}{p.email ? ` · ${p.email}` : ""}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-sm tabular-nums text-muted-foreground md:flex">
                      <Phone size={13} /> {p.phone}
                    </span>
                    <span className={cn("hidden w-24 shrink-0 text-right text-xs font-medium sm:block", kids ? "text-foreground" : "text-muted-foreground")}>
                      {kids ? `${kids} ${kids === 1 ? "child" : "children"}` : "No children"}
                    </span>
                    <span className="hidden w-28 shrink-0 text-right lg:block">
                      {tier !== "None" && <span className="rounded-full bg-tile-violet px-2.5 py-0.5 text-xs font-medium text-tile-foreground">{tier}</span>}
                    </span>
                    <CaretRight size={15} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {openAddModal && <AddParentModal onClose={() => setOpenAddModal(false)} onCreated={load} />}
    </div>
  );
}
