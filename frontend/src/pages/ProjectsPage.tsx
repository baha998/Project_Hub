import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  LayoutGrid,
  Pencil,
  Plus,
  Table as TableIcon,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createProject,
  deleteProject,
  listProjects,
  toggleProjectApproval,
  updateProject,
} from "../api/projects";
import { listTasks } from "../api/tasks";
import { listFiles } from "../api/files";
import { getAnalyticsSummary } from "../api/analytics";
import { extractErrorMessage } from "../api/axios";
import type { AnalyticsSummary, Project, ProjectStatus } from "../types";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { ProjectStatusBadge } from "../components/StatusBadge";
import ProjectsTable, { type ProjectProgress } from "../components/ProjectsTable";
import ProgressBar from "../components/ProgressBar";

const STATUS_FILTER_VALUES: (ProjectStatus | "ALL")[] = ["ALL", "PLANNED", "IN_PROGRESS", "COMPLETED"];

type ViewMode = "grid" | "table";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { showToast } = useToast();
  const canCreate = role === "LEAD" || role === "ADMIN";
  const isCurator = role === "ADMIN";

  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [view, setView] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, ProjectProgress>>({});
  const [filesCount, setFilesCount] = useState<Record<string, number>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Only ADMIN (curator) or the LEAD who owns a given project may edit or
  // delete it; a plain MEMBER never satisfies either condition.
  function canManageProject(project: Project): boolean {
    if (role === "ADMIN") return true;
    return role === "LEAD" && project.ownerId === user?.id;
  }

  async function handleDeleteProject() {
    const project = pendingDeleteProject;
    if (!project) return;
    setPendingDeleteProject(null);

    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      // A deleted project can carry approved/pending status and cascades to
      // its files, so the curator dashboard's aggregate counts go stale
      // without this — bump it to force a refetch.
      setStatsRefreshKey((k) => k + 1);
      showToast(t("projects.toasts.deleted", { title: project.title }), "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects(statusFilter === "ALL" ? undefined : statusFilter);
      setProjects(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [statusFilter]);

  // Task completion and file counts power the progress bar shown in both
  // the grid and table views, fetched (per project, via the existing
  // tasks/files endpoints) whenever the project list changes.
  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;
    setProgressLoading(true);
    Promise.all(
      projects.map(async (p) => {
        try {
          const [tasks, files] = await Promise.all([listTasks(p.id), listFiles(p.id)]);
          const done = tasks.filter((t) => t.status === "DONE").length;
          return { id: p.id, done, total: tasks.length, files: files.length };
        } catch {
          return { id: p.id, done: 0, total: 0, files: 0 };
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setProgress(Object.fromEntries(entries.map((e) => [e.id, { done: e.done, total: e.total }])));
      setFilesCount(Object.fromEntries(entries.map((e) => [e.id, e.files])));
      setProgressLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projects]);

  async function handleToggleApproval(project: Project) {
    setTogglingId(project.id);
    try {
      const updated = await toggleProjectApproval(project.id);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStatsRefreshKey((k) => k + 1);
      showToast(
        updated.isApprovedByCurator
          ? t("projects.toasts.approved")
          : t("projects.toasts.approvalRevoked"),
        "success",
      );
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{t("projects.title")}</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 hover:shadow"
          >
            <Plus className="h-4 w-4" />
            {t("projects.newProject")}
          </button>
        )}
      </div>

      {isCurator && <CuratorDashboard refreshKey={statsRefreshKey} />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-100"
              }`}
            >
              {t(`projects.filters.${value}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label={t("projects.viewGridAria")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("projects.viewGrid")}
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            aria-label={t("projects.viewTableAria")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <TableIcon className="h-4 w-4" />
            {t("projects.viewTable")}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">{t("common.loading")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
          <FolderKanban className="h-10 w-10" />
          <p>{t("projects.empty")}</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const p = progress[project.id];
            const percent = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            const canManage = canManageProject(project);
            return (
              <div
                key={project.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link to={`/projects/${project.id}`} className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-gray-900">{project.title}</h2>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <p className="line-clamp-3 text-sm text-gray-500">
                    {project.description || t("projects.noDescription")}
                  </p>
                  {p && (
                    <ProgressBar percent={percent} label={`${percent}% (${p.done}/${p.total})`} />
                  )}
                </Link>
                {canManage && (
                  <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingProject(project)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                      aria-label={t("projects.editAria", { title: project.title })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteProject(project)}
                      disabled={deletingId === project.id}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={t("projects.deleteAria", { title: project.title })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && projects.length > 0 && view === "table" && (
        <ProjectsTable
          projects={projects}
          progress={progress}
          filesCount={filesCount}
          progressLoading={progressLoading}
          currentUserId={user?.id}
          isCurator={isCurator}
          togglingId={togglingId}
          onToggleApproval={handleToggleApproval}
        />
      )}

      {modalOpen && (
        <CreateProjectModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            void loadProjects();
            setStatsRefreshKey((k) => k + 1);
            showToast(t("projects.toasts.created"), "success");
          }}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdated={(updated) => {
            setEditingProject(null);
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            // Editing a project's status can move it in/out of ARCHIVED,
            // which the dashboard's completed/pending counts depend on.
            setStatsRefreshKey((k) => k + 1);
            showToast(t("projects.toasts.updated"), "success");
          }}
        />
      )}

      {pendingDeleteProject && (
        <ConfirmDialog
          title={t("projects.deleteConfirm.title")}
          message={t("projects.deleteConfirm.message", { title: pendingDeleteProject.title })}
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={() => void handleDeleteProject()}
          onCancel={() => setPendingDeleteProject(null)}
        />
      )}
    </div>
  );
}

// CuratorDashboard is the ADMIN-only control panel shown at the top of the
// projects page: how many students/teams the curator is tracking, how much
// ТЗ has been submitted, and how many projects still need a sign-off before
// practice defense.
function CuratorDashboard({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyticsSummary()
      .then(setSummary)
      .catch((err: unknown) => setError(extractErrorMessage(err)));
  }, [refreshKey]);

  if (error) {
    return <p className="mb-6 text-sm text-red-600">{error}</p>;
  }
  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: t("projects.dashboard.students"),
      value: summary.totalStudents,
      icon: Users,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      label: t("projects.dashboard.filesUploaded"),
      value: summary.totalFiles,
      icon: FileText,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: t("projects.dashboard.approved"),
      value: summary.approvedProjects,
      icon: CheckCircle2,
      accent: "bg-green-50 text-green-600",
    },
    {
      label: t("projects.dashboard.pending"),
      value: summary.pendingApprovalProjects,
      icon: Clock,
      accent: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Users className="h-4 w-4 text-indigo-600" />
        {t("projects.dashboard.heading")}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${s.accent}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500">{s.label}</p>
              <p className="mt-0.5 text-xl font-semibold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("projects.createModal.titleRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createProject(title.trim(), description.trim());
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("projects.createModal.title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
            {t("projects.createModal.titleLabel")}
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            {t("projects.createModal.descriptionLabel")}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? t("common.creating") : t("common.create")}
        </button>
      </form>
    </Modal>
  );
}

const EDITABLE_STATUSES: ProjectStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"];

function EditProjectModal({
  project,
  onClose,
  onUpdated,
}: {
  project: Project;
  onClose: () => void;
  onUpdated: (project: Project) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("projects.createModal.titleRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, title.trim(), description.trim(), status);
      onUpdated(updated);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("projects.editModal.title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="editTitle" className="mb-1 block text-sm font-medium text-gray-700">
            {t("projects.createModal.titleLabel")}
          </label>
          <input
            id="editTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="editDescription" className="mb-1 block text-sm font-medium text-gray-700">
            {t("projects.createModal.descriptionLabel")}
          </label>
          <textarea
            id="editDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="editStatus" className="mb-1 block text-sm font-medium text-gray-700">
            {t("projects.editModal.statusLabel")}
          </label>
          <select
            id="editStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {EDITABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`projectStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? t("common.saving") : t("common.save")}
        </button>
      </form>
    </Modal>
  );
}
