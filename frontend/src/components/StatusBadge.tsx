import { CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectStatus } from "../types";

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-yellow-100 text-yellow-700",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PROJECT_STATUS_STYLES[status]}`}
    >
      {t(`projectStatus.${status}`)}
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
        approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <Icon className="h-3 w-3" />
      {approved ? t("approval.approved") : t("approval.pending")}
    </span>
  );
}
