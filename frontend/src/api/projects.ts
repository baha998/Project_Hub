import api from "./axios";
import type { ApiEnvelope, Project, ProjectDetail, ProjectStatus } from "../types";

export async function listProjects(status?: ProjectStatus): Promise<Project[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const res = await api.get<ApiEnvelope<Project[]>>("/projects", { params });
  return res.data.data ?? [];
}

export async function createProject(title: string, description: string): Promise<Project> {
  const res = await api.post<ApiEnvelope<Project>>("/projects", { title, description });
  return res.data.data;
}

export async function toggleProjectApproval(id: string): Promise<Project> {
  const res = await api.patch<ApiEnvelope<Project>>(`/projects/${id}/approve`);
  return res.data.data;
}

export async function updateProject(
  id: string,
  title: string,
  description: string,
  status: ProjectStatus,
): Promise<Project> {
  const res = await api.put<ApiEnvelope<Project>>(`/projects/${id}`, { title, description, status });
  return res.data.data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

export async function getProjectDetail(id: string): Promise<ProjectDetail> {
  const res = await api.get<ApiEnvelope<ProjectDetail>>(`/projects/${id}`);
  const detail = res.data.data;
  // Defend against an API response where tasks/files come back as null
  // instead of an empty array (e.g. a project with none yet).
  return {
    ...detail,
    tasks: detail.tasks ?? [],
    files: detail.files ?? [],
  };
}
