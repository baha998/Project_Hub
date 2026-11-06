import { CheckCircle2, Clock, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Project } from "../types";
import { ApprovalBadge, ProjectStatusBadge } from "./StatusBadge";
import ProgressBar from "./ProgressBar";
import { intlLocale } from "../i18n";

export interface ProjectProgress {
  done: number;
  total: number;
}

interface ProjectsTableProps {
  projects: Project[];
  progress: Record<string, ProjectProgress>;
  filesCount: Record<string, number>;
  progressLoading: boolean;
  isCurator: boolean;
  togglingId: string | null;
  onToggleApproval: (project: Project) => void;
}

export default function ProjectsTable({
  projects,
  progress,
  filesCount,
  progressLoading,
  isCurator,
  togglingId,
  onToggleApproval,
}: ProjectsTableProps) {
  const { t, i18n } = useTranslation();

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(intlLocale(i18n.resolvedLanguage ?? i18n.language), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
              <th className="px-4 py-3">{t("projects.table.title")}</th>
              <th className="px-4 py-3">{t("projects.table.status")}</th>
              <th className="px-4 py-3">{t("projects.table.owner")}</th>
              <th className="px-4 py-3">{t("projects.table.files")}</th>
              <th className="px-4 py-3">{t("projects.table.progress")}</th>
              <th className="px-4 py-3">{t("projects.table.approval")}</th>
              <th className="px-4 py-3">{t("projects.table.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
            {projects.map((project, index) => {
              const p = progress[project.id];
              const percent = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              const files = filesCount[project.id];
              const isToggling = togglingId === project.id;
              return (
                <tr key={project.id} className="transition hover:bg-slate-50 dark:hover:bg-neutral-950">
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-zinc-900 dark:hover:text-slate-100 hover:underline"
                    >
                      {project.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-neutral-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    {progressLoading && files === undefined ? (
                      <span className="text-xs text-slate-500 dark:text-neutral-400">…</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          files ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-neutral-400"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {files ? t("projects.table.filesCount", { count: files }) : t("projects.table.noFiles")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {progressLoading && !p ? (
                      <span className="text-xs text-slate-500 dark:text-neutral-400">…</span>
                    ) : (
                      <div className="w-40">
                        <ProgressBar
                          percent={percent}
                          label={`${percent}%${p ? ` (${p.done}/${p.total})` : ""}`}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isCurator ? (
                      <button
                        type="button"
                        onClick={() => onToggleApproval(project)}
                        aria-pressed={project.isApprovedByCurator}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                          project.isApprovedByCurator
                            ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-200"
                            : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                        }`}
                      >
                        {project.isApprovedByCurator ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {isToggling
                          ? "..."
                          : project.isApprovedByCurator
                            ? t("approval.approved")
                            : t("projects.table.approve")}
                      </button>
                    ) : (
                      <ApprovalBadge approved={project.isApprovedByCurator} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-neutral-400">{formatDate(project.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
