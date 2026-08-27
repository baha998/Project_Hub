import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProjectDetail } from "../api/projects";
import { listFiles } from "../api/files";
import { extractErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { ProjectStatusBadge } from "../components/StatusBadge";
import TaskBoard from "../components/TaskBoard";
import FileArchive from "../components/FileArchive";
import CuratorApprovalBanner from "../components/CuratorApprovalBanner";
import type { MediaFile, Project, Task } from "../types";

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-fetches the project alongside its tasks in one call, so the
  // project's status (which the backend recalculates automatically from
  // task/approval state) is always current in the UI right after a task
  // status change or a curator approval toggle.
  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await getProjectDetail(id);
      setProject(detail.project ?? null);
      setTasks(detail.tasks ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [id]);

  const loadAll = useCallback(async () => {
    if (!id) {
      setError("Не указан ID проекта");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const detail = await getProjectDetail(id);
      setProject(detail.project ?? null);
      setTasks(detail.tasks ?? []);
      setFiles(detail.files ?? []);
    } catch (err) {
      setProject(null);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshFiles = useCallback(() => {
    if (!id) return;
    listFiles(id)
      .then((next) => setFiles(next ?? []))
      .catch((err: unknown) => setError(extractErrorMessage(err)));
  }, [id]);

  if (loading) {
    return <p className="px-4 py-8 text-center text-sm text-gray-500">{t("projectDetail.loading")}</p>;
  }

  if (error || !project) {
    return (
      <p className="px-4 py-8 text-center text-sm text-red-600">
        {error ?? t("projectDetail.notFound")}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      {role === "ADMIN" && (
        <CuratorApprovalBanner project={project} onToggled={() => void fetchProject()} />
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">
            {project?.title || t("projectDetail.noTitle")}
          </h1>
          {project?.status && <ProjectStatusBadge status={project.status} />}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
          {project?.description || t("projectDetail.noDescription")}
        </p>
        <p className="mt-4 text-xs text-gray-400">
          {t("projectDetail.creator", {
            owner: project?.ownerId ? (project.ownerId === user?.id ? t("common.you") : project.ownerId) : "—",
          })}
        </p>
      </section>

      <TaskBoard
        projectId={project.id}
        projectOwnerId={project.ownerId}
        tasks={tasks ?? []}
        onTasksChanged={() => void fetchProject()}
      />

      <FileArchive projectId={project.id} files={files ?? []} onFilesChanged={refreshFiles} />
    </div>
  );
}
