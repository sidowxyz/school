import {
  CalendarBlank,
  Users,
  FileText,
  Clock,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
  Timer,
} from '@phosphor-icons/react';
import { useState } from "react";

import { Exam } from "../types";
import { deriveExamStatus } from "../utils/examStatus";
import { examDuration, formatDuration, formatTime } from "../utils/examDuration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  // Usually one exam; multiple when a bulk (multi-grade) creation shares a
  // batch_id â€” rendered as a single card grouping every grade it covers.
  exams: Exam[];
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
};

const className = (exam: Exam) =>
  typeof exam.class_id === "object" ? exam.class_id.cl_name : exam.class_id;

export default function ExamCard({ exams, onEdit, onDelete }: Props) {
  const exam = exams[0];
  const liveStatus = deriveExamStatus(exam);
  const isGroup = exams.length > 1;
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    switch (liveStatus) {
      case "scheduled":
        return <Badge variant="secondary" className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200/50">Upcoming</Badge>;
      case "ongoing":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50">Ongoing</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50">Completed</Badge>;
      default:
        return <Badge variant="outline">{liveStatus}</Badge>;
    }
  };

  const examTypeName =
    typeof exam.exam_type === "object" ? exam.exam_type.type_name : exam.exam_type;
  const gradeLabel = exams.map(className).Funnel(Boolean).join(", ");
  const sectionName =
    typeof exam.section_id === "object" ? exam.section_id.name : exam.section_id;
  const subjectName =
    typeof exam.subject_id === "object" ? exam.subject_id.sub_name : undefined;
  const duration = examDuration(exam);

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground truncate">{exam.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {examTypeName}
              {subjectName ? ` â€¢ ${subjectName}` : ""}
            </p>
          </div>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        <div className="mt-5 space-y-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarBlank className="h-4 w-4 text-muted-foreground/70" />
            <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground/70" />
            <span className="truncate">
              {isGroup
                ? gradeLabel
                : sectionName
                  ? `${gradeLabel} - ${sectionName}`
                  : gradeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground/70" />
            <span>{exam.total_marks} Marks â€¢ Pass {exam.pass_marks}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground/70" />
            <span>{formatTime(exam.start_time)} â€“ {formatTime(exam.end_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground/70" />
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setExpanded((previous) => !previous)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs"
          >
            {expanded ? <EyeSlash className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {expanded ? "Hide" : "View"}
          </Button>

          {!isGroup && (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onEdit(exam)}
                aria-label={`Edit ${exam.name}`}
                className="px-2.5"
              >
                <PencilSimple className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onDelete(exam)}
                aria-label={`Delete ${exam.name}`}
                className="px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-2.5">
            {exam.description && <p className="text-xs text-muted-foreground">{exam.description}</p>}
            {exams.map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {className(entry)}
                    {typeof entry.subject_id === "object" ? ` â€¢ ${entry.subject_id.sub_name}` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(entry.exam_date).toLocaleDateString()} â€¢ {formatTime(entry.start_time)}â€“
                    {formatTime(entry.end_time)} â€¢ {formatDuration(examDuration(entry))}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => onEdit(entry)}
                    aria-label={`Edit ${entry.name} for ${className(entry)}`}
                    className="h-7 w-7"
                  >
                    <PencilSimple className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => onDelete(entry)}
                    aria-label={`Delete ${entry.name} for ${className(entry)}`}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}