import { Envelope, CaretRight, GraduationCap, Buildings } from '@phosphor-icons/react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TeacherCardProps = {
  name: string;
  staffId: string;
  email: string;
  department?: string;
  qualifications?: string;
  status: "Active" | "On Leave" | "Inactive";
  onClick?: () => void;
};

export default function TeacherCard({
  name,
  staffId,
  email,
  department,
  qualifications,
  status,
  onClick,
}: TeacherCardProps) {
  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Active":
        return (
          <Badge variant="success" className="text-[11px] font-medium gap-1.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
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
            {s || "Inactive"}
          </Badge>
        );
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "T";

  return (
    <Card
      onClick={onClick}
      className={`group relative overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/40 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="p-5 flex flex-col justify-between h-full space-y-4">
        {/* Top Header: Avatar + Staff ID + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary border border-primary/20 font-semibold text-sm shadow-sm group-hover:scale-105 transition-transform">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="font-mono text-xs font-semibold text-primary/90 block">
                {staffId}
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                <Buildings size={12} className="shrink-0 opacity-70" />
                <span className="truncate">{department || "General Faculty"}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {getStatusBadge(status)}
          </div>
        </div>

        {/* Teacher Details */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <h3 className="font-semibold text-base text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Envelope size={13} className="shrink-0 text-muted-foreground/80" />
            <span className="truncate">{email || "No email provided"}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap size={13} className="shrink-0 text-muted-foreground/80" />
            <span className="truncate">{qualifications || "No qualifications listed"}</span>
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-medium text-primary/80 group-hover:text-primary">
          <span>View Faculty Profile</span>
          <CaretRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Card>
  );
}
