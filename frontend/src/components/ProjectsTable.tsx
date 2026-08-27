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
  currentUserId?: string;
  isCurator: boolean;
  togglingId: string | null;
  onToggleApproval: (project: Project) => void;
}

export default function ProjectsTable({
  projects,
  progress,
  filesCount,
  progressLoading,
  currentUserId,
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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">{t("projects.table.title")}</th>
              <th className="px-4 py-3">{t("projects.table.status")}</th>
              <th className="px-4 py-3">{t("projects.table.owner")}</th>
              <th className="px-4 py-3">{t("projects.table.files")}</th>
              <th className="px-4 py-3">{t("projects.table.progress")}</th>
              <th className="px-4 py-3">{t("projects.table.approval")}</th>
              <th className="px-4 py-3">{t("projects.table.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((project) => {
              const p = progress[project.id];
              const percent = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              const files = filesCount[project.id];
              const isToggling = togglingId === project.id;
              return (
                <tr key={project.id} className="transition hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      {project.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {project.ownerId === currentUserId ? t("common.you") : project.ownerId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    {progressLoading && files === undefined ? (
                      <span className="text-xs text-gray-400">…</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          files ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {files ? t("projects.table.filesCount", { count: files }) : t("projects.table.noFiles")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {progressLoading && !p ? (
                      <span className="text-xs text-gray-400">…</span>
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
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                          project.isApprovedByCurator
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
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
                  <td className="px-4 py-3 text-gray-500">{formatDate(project.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
