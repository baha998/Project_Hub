import api from "./axios";
import type { ApiEnvelope, Task, TaskPriority, TaskStatus } from "../types";

export async function listTasks(projectId: string): Promise<Task[]> {
  const res = await api.get<ApiEnvelope<Task[]>>(`/projects/${projectId}/tasks`);
  return res.data.data ?? [];
}

export async function createTask(
  projectId: string,
  title: string,
  description: string,
  priority: TaskPriority,
  assigneeId?: string,
  dueDate?: string,
): Promise<Task> {
  const res = await api.post<ApiEnvelope<Task>>(`/projects/${projectId}/tasks`, {
    title,
    description,
    priority,
    assigneeId: assigneeId ?? null,
    dueDate: dueDate ?? null,
  });
  return res.data.data;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  await api.patch(`/tasks/${taskId}/status`, { status });
}

export async function updateTask(
  taskId: string,
  title: string,
  description: string,
  priority: TaskPriority,
  assigneeId?: string,
  dueDate?: string,
): Promise<Task> {
  const res = await api.put<ApiEnvelope<Task>>(`/tasks/${taskId}`, {
    title,
    description,
    priority,
    assigneeId: assigneeId ?? null,
    dueDate: dueDate ?? null,
  });
  return res.data.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}
