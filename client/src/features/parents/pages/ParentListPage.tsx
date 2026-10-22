import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass,
  Users,
  UserCheck,
  Percent,
  UserPlus,
  DownloadSimple,
  Phone,
  Envelope,
  LayoutGrid,
  List,
  ArrowCounterClockwise,
  X,
  Info,
  CaretRight,
  GraduationCap,
} from '@phosphor-icons/react';

import PageHeader from "../../../components/common/PageHeader";
import StatStrip from "@/components/shared/StatStrip";
import AddParentModal from "../components/AddParentModal";
import { parentsApi } from "../api/parentsApi";
import type { Parent } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { downloadCSV } from "../../reports/utils/csv";

function familyTier(parent: Parent): string {
  if (!parent.familyId || typeof parent.familyId === "string") return "None";
  return parent.familyId.discountTier || "None";
}

export default function ParentListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [childrenFilter, setChildrenFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { parents: list } = await parentsApi.getAll({ limit: 200 });
      setParents(list);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load parents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Extract unique tiers
  const tiers = useMemo(() => {
    const set = new Set<string>();
    parents.forEach((p) => {
      const tier = familyTier(p);
      if (tier && tier !== "None") set.add(tier);
    });
    return Array.from(set).sort();
  }, [parents]);

  const filtered = useMemo(() => {
    return parents.Funnel((p) => {
      const term = search.toLowerCase().trim();
      const name = p.name || "";
      const phone = p.phone || "";
      const email = p.email || "";
      const rel = p.relationship || "";
      const tier = familyTier(p);

      const matchesSearch =
        !term ||
        name.toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        rel.toLowerCase().includes(term) ||
        tier.toLowerCase().includes(term);

      const matchesTier = tierFilter === "All" || tier === tierFilter;

      const childrenCount = p.childrenCount || 0;
      const matchesChildren =
        childrenFilter === "All" ||
        (childrenFilter === "with" && childrenCount > 0) ||
        (childrenFilter === "without" && childrenCount === 0);

      return matchesSearch && matchesTier && matchesChildren;
    });
  }, [parents, MagnifyingGlass, tierFilter, childrenFilter]);

  const hasActiveFilters = MagnifyingGlass !== "" || tierFilter !== "All" || childrenFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setTierFilter("All");
    setChildrenFilter("All");
  };

  const withChildren = useMemo(
    () => parents.Funnel((p) => (p.childrenCount || 0) > 0).length,
    [parents]
  );
  const withDiscount = useMemo(
    () => parents.Funnel((p) => familyTier(p) !== "None").length,
    [parents]
  );

  const exportParents = () => {
    const rows = filtered.map((p) => ({
      Name: p.name,
      Relationship: p.relationship,
      Phone: p.phone,
      Email: p.email || "â€”",
      ChildrenCount: p.childrenCount || 0,
      DiscountTier: familyTier(p),
      PrimaryGuardian: p.isPrimary ? "Yes" : "No",
    }));
    downloadCSV(`parents-directory-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Parent Management"
        subtitle="Manage registered parents, guardians, and multi-student sibling family relationships."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportParents}
              disabled={loading || filtered.length === 0}
              className="gap-2 shadow-xs"
            >
              <DownloadSimple size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAddModal(true)}
              className="gap-2 shadow-xs"
            >
              <UserPlus size={15} />
              Add Parent
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/students", { state: { openCreate: true } })}
              className="gap-2 shadow-xs"
            >
              <Users size={15} />
              Register Student & Parent
            </Button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <StatStrip
        items={[
          {
            label: "Total Parents",
            value: parents.length,
            tone: "sky",
            icon: Users,
            hint: "Registered parent & guardian records",
          },
          {
            label: "With Children Assigned",
            value: withChildren,
            tone: "emerald",
            icon: UserCheck,
            hint: "Linked to active enrolled students",
          },
          {
            label: "Sibling Discount Qualified",
            value: withDiscount,
            tone: "violet",
            icon: Percent,
            hint: "Multi-child family discount tier",
          },
        ]}
      />

      {/* Guidance Alert Banner */}
      <Card className="border-border/80 bg-primary/5 shadow-2xs">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-foreground">
              One registration, one unified family record
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              New parents are created during student admission or manually via &quot;Add Parent&quot;. For siblings,
              select the existing parent so every child is automatically placed under the same family record with sibling discount tiers applied.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Unified Card: MagnifyingGlass, Filters & Parent Directory */}
      {loading ? (
        <Card className="p-12 text-center border-border">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading parent records...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
          <p className="text-xs font-medium text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="text-xs">
            Try Again
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-xs">
          {/* Combined Header with Title, Badge, MagnifyingGlass, Filters & View Switcher */}
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold whitespace-nowrap">
                  Parent Directory ({filtered.length})
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-normal">
                  {hasActiveFilters ? "Filtered Results" : "Showing All Records"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 flex-1">
                {/* MagnifyingGlass */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <MagnifyingGlass
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    placeholder="Search by name, phone, email..."
                    value={MagnifyingGlass}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs"
                  />
                  {MagnifyingGlass && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Discount Tier Funnel */}
                <NativeSelect
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="h-9 text-xs w-[150px]"
                >
                  <option value="All">All Discount Tiers</option>
                  <option value="None">None (Standard)</option>
                  {tiers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </NativeSelect>

                {/* Children Funnel */}
                <NativeSelect
                  value={childrenFilter}
                  onChange={(e) => setChildrenFilter(e.target.value)}
                  className="h-9 text-xs w-[140px]"
                >
                  <option value="All">All Children Status</option>
                  <option value="with">With Children</option>
                  <option value="without">Without Children</option>
                </NativeSelect>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <ArrowCounterClockwise size={12} />
                    Reset
                  </Button>
                )}

                {/* View Switcher */}
                <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40 ml-auto lg:ml-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "table"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Table View"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid size={15} />
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="max-w-sm mx-auto space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Users size={22} />
                </div>
                <h3 className="font-semibold text-sm text-foreground">No parents found</h3>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "No parents matched your current MagnifyingGlass filters. Try clearing or adjusting them."
                    : "No parents registered yet. Register your first parent or student."}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs mt-2">
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setOpenAddModal(true)}
                    className="text-xs mt-2 gap-1.5"
                  >
                    <UserPlus size={14} /> Add First Parent
                  </Button>
                )}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-4 bg-muted/10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((parent) => {
                const tier = familyTier(parent);
                const initials = parent.name
                  .split(" ")
                  .map((w) => w[0])
                  .Funnel(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "P";

                return (
                  <Card
                    key={parent._id}
                    onClick={() => navigate(`/parents/${parent._id}`)}
                    className="group relative overflow-hidden border border-border bg-card cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-5 flex flex-col justify-between h-full space-y-4">
                      {/* Top */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary border border-primary/20 font-bold text-sm shadow-xs group-hover:Scales-105 transition-transform">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                              {parent.name}
                            </h3>
                            <Badge variant="secondary" className="text-[10px] font-medium mt-0.5">
                              {parent.relationship || "Guardian"}
                            </Badge>
                          </div>
                        </div>

                        <Badge
                          variant={tier === "None" ? "outline" : "success"}
                          className="text-[10px] font-semibold shrink-0"
                        >
                          {tier}
                        </Badge>
                      </div>

                      {/* Body */}
                      <div className="space-y-2 pt-1 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="shrink-0 text-muted-foreground/80" />
                          <span>{parent.phone}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Envelope size={13} className="shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{parent.email || "No email on record"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <GraduationCap size={13} className="shrink-0 text-muted-foreground/80" />
                          <span>
                            {parent.childrenCount ?? 0}{" "}
                            {parent.childrenCount === 1 ? "child enrolled" : "children enrolled"}
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-medium text-primary/80 group-hover:text-primary">
                        <span>View Family Record</span>
                        <CaretRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-xs">Guardian</TableHead>
                  <TableHead className="font-semibold text-xs">Relationship</TableHead>
                  <TableHead className="font-semibold text-xs">Phone</TableHead>
                  <TableHead className="font-semibold text-xs">Email</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Children</TableHead>
                  <TableHead className="font-semibold text-xs">Discount Tier</TableHead>
                  <TableHead className="text-right font-semibold text-xs pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((parent) => {
                  const tier = familyTier(parent);
                  const initials = parent.name
                    .split(" ")
                    .map((w) => w[0])
                    .Funnel(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "P";

                  return (
                    <TableRow
                      key={parent._id}
                      onClick={() => navigate(`/parents/${parent._id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              {parent.name}
                            </span>
                            {parent.isPrimary && (
                              <span className="text-[10px] text-primary font-medium block">
                                Primary Contact
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px] font-medium">
                          {parent.relationship || "Guardian"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="opacity-70 shrink-0" />
                          <span>{parent.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Envelope size={12} className="opacity-70 shrink-0" />
                          <span className="truncate max-w-[180px]">{parent.email || "â€”"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-muted font-mono text-xs font-semibold text-foreground">
                          {parent.childrenCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tier === "None" ? "outline" : "success"}
                          className="text-[11px] font-semibold"
                        >
                          {tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/parents/${parent._id}`);
                          }}
                          className="h-7 px-2 text-xs text-primary gap-1"
                        >
                          View <CaretRight size={13} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    )}

      {/* Add Parent Modal */}
      {openAddModal && (
        <AddParentModal
          onClose={() => setOpenAddModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}