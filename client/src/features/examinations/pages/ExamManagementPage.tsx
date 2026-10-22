import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Warning, FileText } from '@phosphor-icons/react';

import PageHeader from "@/components/common/PageHeader";
import ExamStats from "../components/ExamStats";
import ExamFormModal from "../components/ExamFormModal";
import ExamCard from "../components/ExamCard";
import ExamTypesPanel from "../components/ExamTypesPanel";
import ExamSchedule from "../components/ExamSchedule";
import ExamTimetable from "../components/ExamTimetable";
import TeacherMarksView from "../../results/components/teacher/TeacherMarksView";
import type { Exam } from "../types";
import { examsApi } from "../api/examsApi";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId = "exam-list" | "timetable" | "schedule" | "marks" | "types";

const TABS: { id: TabId; label: string }[] = [
  { id: "exam-list", label: "Exam List" },
  { id: "timetable", label: "Timetable" },
  { id: "schedule", label: "Schedule" },
  { id: "marks", label: "Marks Entry" },
  { id: "types", label: "Exam Types" },
];

export default function ExamManagementPage() {
  const location = useLocation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; exam?: Exam }>({ open: false });
  const [activeTab, setActiveTab] = useState<TabId>("exam-list");

  const loadExams = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    examsApi
      .getAll({ limit: 500 })
      .then((result) => setExams(result.exams))
      .catch(() => setLoadError("Failed to load exams."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setModal({ open: true });
    }
  }, [location.state]);

  const examGroups = useMemo(() => {
    const groups = new Map<string, Exam[]>();
    for (const exam of exams) {
      const key = exam.batch_id || exam._id;
      const group = groups.get(key);
      if (group) group.push(exam);
      else groups.set(key, [exam]);
    }
    return Array.from(groups.values());
  }, [exams]);

  const handleDelete = async (exam: Exam) => {
    if (!window.confirm(`Delete "${exam.name}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await examsApi.delete(exam._id);
      loadExams();
    } catch (reason) {
      setActionError(
        (reason as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to delete that examination.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Management"
        subtitle="Manage examinations, scheduling, timetables, and section grade submissions."
        action={
          <Button size="sm" onClick={() => setModal({ open: true })} className="gap-2">
            <Plus size={15} />
            Create Exam
          </Button>
        }
      />

      <ExamStats exams={exams} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1 border border-border bg-card p-1.5 shadow-sm">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary sm:text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {actionError && (
        <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <Warning size={15} />
            <span>{actionError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="h-6 px-2 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {activeTab === "exam-list" && (
        <>
          {loading && <p className="text-xs text-muted-foreground py-8 text-center">Loading exams...</p>}
          {loadError && <p className="text-xs text-destructive py-8 text-center">{loadError}</p>}
          {!loading && !loadError && examGroups.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 border-border px-6 py-14 text-center shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">No exams created yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Create your first examination to start scheduling and collecting marks.</p>
              </div>
              <Button size="sm" onClick={() => setModal({ open: true })} className="gap-2">
                <Plus size={15} />
                Create Exam
              </Button>
            </Card>
          )}
          {!loading && !loadError && examGroups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {examGroups.map((group) => (
                <ExamCard
                  key={group[0].batch_id || group[0]._id}
                  exams={group}
                  onEdit={(exam) => setModal({ open: true, exam })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "timetable" && <ExamTimetable />}
      {activeTab === "schedule" && <ExamSchedule exams={exams} />}
      {activeTab === "marks" && <TeacherMarksView />}
      {activeTab === "types" && <ExamTypesPanel />}

      {modal.open && (
        <ExamFormModal
          exam={modal.exam}
          onClose={() => setModal({ open: false })}
          onSaved={loadExams}
        />
      )}
    </div>
  );
}