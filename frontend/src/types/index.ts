export type UserRole = "ADMIN" | "LEAD" | "MEMBER";

export type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  isApprovedByCurator: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ProjectDetail {
  project: Project;
  tasks: Task[];
  files: MediaFile[];
}

export interface AnalyticsSummary {
  totalProjects: number;
  activeTasks: number;
  completedProjectsPercent: number;
  totalFiles: number;
  totalStudents: number;
  approvedProjects: number;
  pendingApprovalProjects: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
