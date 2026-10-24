import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCan } from "../../../hooks/usePermission";
import { SpinnerGap,
  Plus,
  MagnifyingGlass,
  DownloadSimple,
  SquaresFour,
  List,
  ArrowCounterClockwise,
  X,
  GraduationCap,
  Envelope,
  Buildings,
  ArrowSquareOut,
  Users,
} from '@phosphor-icons/react';

import PageHeader from "@/components/common/PageHeader";
import TeacherStats from "../components/TeacherStats";
import TeacherCard from "../components/TeacherCard";
import AddTeacherModal from "../components/AddTeacherModal";
import { teachersApi } from "../api/teachersApi";
import type { Teacher } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { downloadCSV } from "../../reports/utils/csv";

export default function TeacherListPage() {
  const navigate = useNavigate();
  const canCreate = useCan("teachers", "create");
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [openModal, setOpenModal] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await teachersApi.getAll();
      setTeachers(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    if (canCreate && (location.state as { openCreate?: boolean } | null)?.openCreate) {
      setOpenModal(true);
    }
  }, [location.state]);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department && t.department.trim()) {
        set.add(t.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const term = searchTerm.toLowerCase().trim();
      const name = teacher.userId?.name || "";
      const email = teacher.userId?.email || "";
      const staffId = teacher.staffId || "";
      const dept = teacher.department || "";
      const quals = teacher.qualifications || "";

      const matchesSearch =
        !term ||
        name.toLowerCase().includes(term) ||
        staffId.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        dept.toLowerCase().includes(term) ||
        quals.toLowerCase().includes(term);

      const matchesDepartment =
        departmentFilter === "All" || teacher.department === departmentFilter;

      const matchesStatus =
        statusFilter === "All" || teacher.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [teachers, searchTerm, departmentFilter, statusFilter]);

  const hasActiveFilters = searchTerm !== "" || departmentFilter !== "All" || statusFilter !== "All";

  const clearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("All");
    setStatusFilter("All");
  };

  const exportTeachers = () => {
    const rows = filteredTeachers.map((t) => ({
      StaffID: t.staffId,
      Name: t.userId?.name || "—",
      Email: t.userId?.email || "—",
      Department: t.department || "—",
      Qualifications: t.qualifications || "—",
      Status: t.status,
    }));
    downloadCSV(`teachers-list-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge variant="success" className="text-[11px] font-medium gap-1.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active
          </Badge>
        );
      case "On Leave":
        return (
          <Badge variant="warning" className="text-[11px] font-medium gap-1.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            On Leave
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[11px] font-medium gap-1.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            {status || "Inactive"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Management"
        subtitle="Manage teaching staff, instructional departments, and classroom assignments."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportTeachers}
              disabled={loading || filteredTeachers.length === 0}
              className="gap-2 shadow-xs"
            >
              <DownloadSimple size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setOpenModal(true)} className="gap-2 shadow-xs">
                <Plus size={15} />
                Add Teacher
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <TeacherStats teachers={teachers} />

      {/* Main Unified Card: search, Filters & Faculty Records */}
      {loading ? (
        <Card className="p-12 text-center border-border">
          <div className="flex flex-col items-center justify-center space-y-3">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading teacher records...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
          <p className="text-xs font-medium text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={loadTeachers} className="text-xs">
            Try Again
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-xs">
          {/* Combined Header with Title, Badge, search, Filters & View Switcher */}
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold whitespace-nowrap">
                  Faculty Records ({filteredTeachers.length})
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-normal">
                  {hasActiveFilters ? "Filtered Results" : "Showing All Results"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <MagnifyingGlass
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    placeholder="Search by name, ID, email, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs"
                  />
                  {searchTerm && (
                    <Button variant="plain"
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </Button>
                  )}
                </div>

                {/* Department Filter */}
                <NativeSelect
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-9 text-xs w-[140px]"
                >
                  <option value="All">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </NativeSelect>

                {/* Status Filter */}
                <NativeSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 text-xs w-[120px]"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
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
                  <Button variant="plain"
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
                  </Button>
                  <Button variant="plain"
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Grid View"
                  >
                    <SquaresFour size={15} />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          {filteredTeachers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="max-w-sm mx-auto space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Users size={22} />
                </div>
                <h3 className="font-semibold text-sm text-foreground">No faculty members found</h3>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "No teachers matched your search or filter criteria. Try adjusting your search query."
                    : "No teachers registered yet. Click 'Add Teacher' to create the first faculty member."}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs mt-2">
                    Clear Filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setOpenModal(true)} className="text-xs mt-2 gap-1.5">
                    <Plus size={14} /> Add First Teacher
                  </Button>
                )}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-4 bg-muted/10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTeachers.map((teacher) => (
                <TeacherCard
                  key={teacher._id}
                  name={teacher.userId?.name || "—"}
                  staffId={teacher.staffId}
                  email={teacher.userId?.email || "—"}
                  department={teacher.department}
                  qualifications={teacher.qualifications}
                  status={teacher.status}
                  onClick={() => navigate(`/teachers/${teacher._id}`)}
                />
              ))}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px] font-semibold text-xs">Staff ID</TableHead>
                  <TableHead className="font-semibold text-xs">Faculty Member</TableHead>
                  <TableHead className="font-semibold text-xs">Department</TableHead>
                  <TableHead className="font-semibold text-xs">Email</TableHead>
                  <TableHead className="font-semibold text-xs">Qualifications</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="text-right font-semibold text-xs pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => {
                  const name = teacher.userId?.name || "—";
                  const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "T";

                  return (
                    <TableRow
                      key={teacher._id}
                      onClick={() => navigate(`/teachers/${teacher._id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {teacher.staffId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-medium text-xs text-foreground block">
                              {name}
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              {teacher.userId?.role || "Teacher"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Buildings size={13} className="shrink-0 opacity-70" />
                          <span>{teacher.department || "General Faculty"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Envelope size={13} className="shrink-0 opacity-70" />
                          <span className="truncate max-w-[180px]">{teacher.userId?.email || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap size={13} className="shrink-0 opacity-70" />
                          <span className="truncate max-w-[160px]">
                            {teacher.qualifications || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(teacher.status)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/teachers/${teacher._id}`);
                          }}
                          className="h-7 px-2 text-xs text-primary gap-1"
                        >
                          View <ArrowSquareOut size={12} />
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

      {openModal && (
        <AddTeacherModal
          onClose={() => setOpenModal(false)}
          onCreated={loadTeachers}
        />
      )}
    </div>
  );
}
