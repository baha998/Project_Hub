import api, { BASE_URL } from "./axios";
import type { ApiEnvelope, MediaFile } from "../types";

export async function listFiles(projectId: string): Promise<MediaFile[]> {
  const res = await api.get<ApiEnvelope<MediaFile[]>>(`/projects/${projectId}/files`);
  return res.data.data ?? [];
}

export async function uploadFile(projectId: string, file: File): Promise<MediaFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<ApiEnvelope<MediaFile>>(`/projects/${projectId}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function deleteFile(id: string): Promise<void> {
  await api.delete(`/files/${id}`);
}

// The API is mounted at "…/api/v1"; uploaded files are served from the API
// origin's root at "/uploads/", so strip the "/api/v1" suffix to get there.
const API_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, "");

export function fileDownloadUrl(file: MediaFile): string {
  const name = file.filePath.split(/[/\\]/).pop() ?? file.filePath;
  return `${API_ORIGIN}/uploads/${encodeURIComponent(name)}`;
}
