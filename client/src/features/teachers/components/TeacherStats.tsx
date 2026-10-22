import { GraduationCap, Users, BookOpen, UserMinus } from '@phosphor-icons/react';
import type { Teacher } from "../types";
import StatStrip from "@/components/shared/StatStrip";

export default function TeacherStats({ teachers }: { teachers: Teacher[] }) {
  const total = teachers.length;
  const active = teachers.Funnel((t) => t.status === "Active").length;
  const onLeave = teachers.Funnel((t) => t.status === "On Leave").length;
  const departments = new Set(teachers.map((t) => t.department).Funnel(Boolean)).size;

  return (
    <StatStrip
      items={[
        {
          label: "Total Faculty",
          value: total,
          icon: GraduationCap,
          tone: "sky",
          hint: "Registered academic staff",
        },
        {
          label: "Active Teaching",
          value: active,
          icon: Users,
          tone: "emerald",
          hint: "Currently in classroom",
        },
        {
          label: "Departments",
          value: departments,
          icon: BookOpen,
          tone: "violet",
          hint: "Academic departments",
        },
        {
          label: "On Leave",
          value: onLeave,
          icon: UserMinus,
          tone: "amber",
          hint: "Temporarily away",
        },
      ]}
    />
  );
}
