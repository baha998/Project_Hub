import { CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectStatus } from "../types";

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNED: "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  COMPLETED: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  ARCHIVED: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation();
  return (
    <span
      title={t(`projectStatus.${status}`)}
      className={`inline-block whitespace-nowrap rounded-md px-2 py-1 font-mono text-[10px] font-medium tracking-wide ${PROJECT_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

/** Curator sign-off status — whether a project is approved for practice defense. */
export function ApprovalBadge({ approved }: { approved: boolean }) {
  const { t } = useTranslation();
  const Icon = approved ? CheckCircle2 : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        approved ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
      }`}
    >
      <Icon className="h-3 w-3" />
      {approved ? t("approval.approved") : t("approval.pending")}
    </span>
  );
}
