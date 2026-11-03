import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { createTask, deleteTask, updateTask, updateTaskStatus } from "../api/tasks";
import { extractErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { Task, TaskPriority, TaskStatus } from "../types";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { intlLocale } from "../i18n";
import ProgressBar from "./ProgressBar";

interface TaskBoardProps {
  projectId: string;
  projectOwnerId: string;
  tasks: Task[] | null | undefined;
  onTasksChanged: () => void;
}

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
const DEFAULT_PRIORITY: TaskPriority = "MEDIUM";

const COLUMNS: {
  status: TaskStatus;
  icon: typeof FileText;
  headerClass: string;
  dotClass: string;
}[] = [
  { status: "TODO", icon: FileText, headerClass: "text-slate-600 dark:text-slate-400", dotClass: "bg-gray-400" },
  { status: "IN_PROGRESS", icon: Clock, headerClass: "text-blue-700 dark:text-blue-300", dotClass: "bg-blue-500" },
  { status: "DONE", icon: CheckCircle2, headerClass: "text-green-700 dark:text-green-300", dotClass: "bg-green-500" },
];

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
};

const PRIORITY_CONFIG: Record<TaskPriority, { icon: typeof AlertCircle; className: string }> = {
  HIGH: { icon: AlertCircle, className: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-200 dark:ring-red-900/60" },
  MEDIUM: {
    icon: Clock,
    className: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-200 dark:ring-amber-900/60",
  },
  LOW: { icon: CheckCircle2, className: "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-neutral-800" },
};

function formatDueDate(dueDate: string, locale: string): string {
  return new Date(dueDate).toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

function ticketKey(taskId: string): string {
  return `TASK-${taskId.slice(-6).toUpperCase()}`;
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-blue-500",
  "bg-teal-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Assignee avatar — the API only exposes a user ID, not a profile, so this
 * renders a colored initial-less badge rather than fabricating a name. */
function AssigneeAvatar({ assigneeId }: { assigneeId: string | null }) {
  const { t } = useTranslation();
  if (!assigneeId) {
    return (
      <span
        title={t("common.notAssigned")}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-neutral-700 text-slate-400 dark:text-neutral-500"
      >
        <User className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      title={t("common.assignee", { id: assigneeId.slice(0, 8) })}
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white ${avatarColor(assigneeId)}`}
    >
      <User className="h-3 w-3" />
    </span>
  );
}

export default function TaskBoard({ projectId, projectOwnerId, tasks, onTasksChanged }: TaskBoardProps) {
  const { t, i18n } = useTranslation();
  const safeTasks = tasks ?? [];
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Only ADMIN (curator) or the LEAD who owns the project may edit or
  // delete its tasks; a plain MEMBER never satisfies either condition.
  const canManageTasks = role === "ADMIN" || (role === "LEAD" && projectOwnerId === user?.id);

  async function handleAdvance(task: Task) {
    const next = NEXT_STATUS[task.status];
    if (!next) return;

    setMovingTaskId(task.id);
    try {
      await updateTaskStatus(task.id, next);
      onTasksChanged();
      showToast(
        t("tasks.toasts.moved", { title: task.title, status: t(`tasks.status.${next}`) }),
        "success",
      );
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setMovingTaskId(null);
    }
  }

  async function handleDeleteTask() {
    const task = pendingDeleteTask;
    if (!task) return;
    setPendingDeleteTask(null);

    setDeletingId(task.id);
    try {
      await deleteTask(task.id);
      onTasksChanged();
      showToast(t("tasks.toasts.deleted", { title: task.title }), "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("tasks.heading")}</h2>
        {canManageTasks && <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-zinc-900 dark:bg-slate-100 px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-950 shadow-sm transition hover:bg-zinc-700 dark:hover:bg-slate-300 hover:shadow"
        >
          <Plus className="h-4 w-4" />
          {t("tasks.newTask")}
        </button>}
      </div>

      <div className="mb-5 max-w-md">
        <ProgressBar percent={safeTasks.length ? safeTasks.filter((task) => task.status === "DONE").length / safeTasks.length * 100 : 0} label={`${safeTasks.filter((task) => task.status === "DONE").length}/${safeTasks.length} ${t("tasks.status.DONE")}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTasks = safeTasks.filter((t) => t.status === column.status);
          const ColumnIcon = column.icon;
          return (
            <div
              key={column.status}
              className="flex flex-col gap-3 rounded-lg bg-slate-50 dark:bg-neutral-950 p-3 ring-1 ring-slate-200 dark:ring-neutral-800"
            >
              <div className="flex items-center justify-between px-1">
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${column.headerClass}`}>
                  <ColumnIcon className="h-4 w-4" />
                  <span className="font-mono text-xs tracking-wide" title={t(`tasks.status.${column.status}`)}>{column.status}</span>
                </div>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white ${column.dotClass}`}
                >
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {columnTasks.map((task) => {
                  const priority = PRIORITY_CONFIG[task.priority];
                  const PriorityIcon = priority.icon;
                  return (
                    <div
                      key={task.id}
                      className="group flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-sm transition hover:border-slate-300 dark:hover:border-neutral-600 hover:shadow-sm hover:ring-1 hover:ring-slate-200 dark:hover:ring-neutral-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-neutral-400 transition group-hover:text-zinc-600 dark:group-hover:text-slate-300">
                          {ticketKey(task.id)}
                        </span>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          {canManageTasks && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingTask(task)}
                                className="rounded p-0.5 text-slate-400 dark:text-neutral-500 opacity-100 transition hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-zinc-900 dark:hover:text-slate-100 group-hover:opacity-100"
                                aria-label={t("tasks.editAria", { title: task.title })}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteTask(task)}
                                disabled={deletingId === task.id}
                                className="rounded p-0.5 text-slate-400 dark:text-neutral-500 opacity-100 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 group-hover:opacity-100 disabled:opacity-50"
                                aria-label={t("tasks.deleteAria", { title: task.title })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          <span
                            className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium ${priority.className}`}
                          >
                            <PriorityIcon className="h-3 w-3" />
                            <span title={t(`tasks.priority.${task.priority}`)}>{task.priority}</span>
                          </span>
                        </div>
                      </div>

                      <p className="font-medium leading-snug text-slate-900 dark:text-slate-100">{task.title}</p>
                      {task.description && (
                        <p className="line-clamp-2 text-xs text-slate-500 dark:text-neutral-400">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <AssigneeAvatar assigneeId={task.assigneeId} />
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-neutral-400">
                            <Clock className="h-3 w-3" />
                            {formatDueDate(task.dueDate, intlLocale(i18n.resolvedLanguage ?? i18n.language))}
                          </span>
                        )}
                        {NEXT_STATUS[task.status] && (role === "ADMIN" || role === "LEAD" || task.assigneeId === user?.id) && (
                          <button
                            type="button"
                            onClick={() => handleAdvance(task)}
                            disabled={movingTaskId === task.id}
                            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-900 dark:text-slate-100 transition hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-zinc-800 dark:hover:text-slate-200 disabled:opacity-50"
                          >
                            {movingTaskId === task.id ? "..." : t(`tasks.advance.${task.status}`)}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {columnTasks.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 py-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                    {t("tasks.empty")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            onTasksChanged();
            showToast(t("tasks.toasts.created"), "success");
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={() => {
            setEditingTask(null);
            onTasksChanged();
            showToast(t("tasks.toasts.updated"), "success");
          }}
        />
      )}

      {pendingDeleteTask && (
        <ConfirmDialog
          title={t("tasks.deleteConfirm.title")}
          message={t("tasks.deleteConfirm.message", { title: pendingDeleteTask.title })}
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={() => void handleDeleteTask()}
          onCancel={() => setPendingDeleteTask(null)}
        />
      )}
    </section>
  );
}

function CreateTaskModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("tasks.form.titleRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createTask(
        projectId,
        title.trim(),
        description.trim(),
        priority,
        assigneeId.trim() || undefined,
        dueDate ? new Date(dueDate).toISOString() : undefined,
      );
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("tasks.createModal.title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="taskTitle" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.titleLabel")}
          </label>
          <input
            id="taskTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="taskDescription" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.descriptionLabel")}
          </label>
          <textarea
            id="taskDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="taskPriority" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.priorityLabel")}
          </label>
          <select
            id="taskPriority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`tasks.priority.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assigneeId" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.assigneeLabel")}
          </label>
          <input
            id="assigneeId"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder={t("tasks.form.assigneePlaceholder")}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.dueDateLabel")}
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 hover:bg-zinc-700 dark:hover:bg-slate-300 disabled:opacity-50"
        >
          {submitting ? t("common.creating") : t("common.create")}
        </button>
      </form>
    </Modal>
  );
}

function toDateInputValue(dueDate: string | null): string {
  if (!dueDate) return "";
  return new Date(dueDate).toISOString().slice(0, 10);
}

function EditTaskModal({
  task,
  onClose,
  onUpdated,
}: {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? DEFAULT_PRIORITY);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("tasks.form.titleRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateTask(
        task.id,
        title.trim(),
        description.trim(),
        priority,
        assigneeId.trim() || undefined,
        dueDate ? new Date(dueDate).toISOString() : undefined,
      );
      onUpdated();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("tasks.editModal.title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="editTaskTitle" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.titleLabel")}
          </label>
          <input
            id="editTaskTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="editTaskDescription" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.descriptionLabel")}
          </label>
          <textarea
            id="editTaskDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="editTaskPriority" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.priorityLabel")}
          </label>
          <select
            id="editTaskPriority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`tasks.priority.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="editAssigneeId" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.assigneeLabel")}
          </label>
          <input
            id="editAssigneeId"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder={t("tasks.form.assigneePlaceholder")}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="editDueDate" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("tasks.form.dueDateLabel")}
          </label>
          <input
            id="editDueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 hover:bg-zinc-700 dark:hover:bg-slate-300 disabled:opacity-50"
        >
          {submitting ? t("common.saving") : t("common.save")}
        </button>
      </form>
    </Modal>
  );
}
