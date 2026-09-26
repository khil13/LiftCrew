import type { ApplicationStatus, JobStatus } from "@/lib/types";

const STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-green-100 text-green-800",
  filled: "bg-brand-100 text-brand-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  disputed: "bg-red-100 text-red-700",
  applied: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-slate-100 text-slate-600",
  withdrawn: "bg-slate-100 text-slate-600",
};

const LABELS: Record<string, string> = {
  in_progress: "In progress",
  filled: "Crew full",
  accepted: "Booked",
  declined: "Not selected",
};

export default function JobStatusBadge({ status }: { status: JobStatus | ApplicationStatus }) {
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{label}</span>;
}
