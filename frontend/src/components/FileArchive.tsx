import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Download, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import { deleteFile, fileDownloadUrl, uploadFile } from "../api/files";
import { extractErrorMessage } from "../api/axios";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "./ConfirmDialog";
import type { MediaFile } from "../types";

interface FileArchiveProps {
  projectId: string;
  files: MediaFile[] | null | undefined;
  onFilesChanged: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileArchive({ projectId, files, onFilesChanged }: FileArchiveProps) {
  const { t } = useTranslation();
  const safeFiles = files ?? [];
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaFile | null>(null);

  async function confirmDelete() {
    const file = pendingDelete;
    if (!file) return;
    setPendingDelete(null);

    setDeletingId(file.id);
    try {
      await deleteFile(file.id);
      onFilesChanged();
      showToast(t("files.toasts.deleted", { name: file.fileName }), "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      await uploadFile(projectId, file);
      onFilesChanged();
      showToast(t("files.toasts.uploaded", { name: file.name }), "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = "";
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t("files.heading")}</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragActive ? "border-zinc-500 dark:border-neutral-500 bg-slate-100 dark:bg-neutral-800" : "border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-slate-500 dark:text-neutral-400" />
        <p className="text-sm text-slate-500 dark:text-neutral-400">
          {t("files.dropHint")}{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-zinc-900 dark:text-slate-100 hover:underline"
          >
            {t("files.browse")}
          </button>
        </p>
        {uploading && <p className="text-xs text-slate-500 dark:text-neutral-400">{t("files.uploading")}</p>}
        <input ref={inputRef} type="file" className="hidden" onChange={handleSelect} />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {safeFiles.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm transition hover:border-slate-300 dark:hover:border-neutral-600 hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Paperclip className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-neutral-400" />
              <span className="truncate text-slate-800 dark:text-slate-200">{file.fileName}</span>
              <span className="flex-shrink-0 text-xs text-slate-500 dark:text-neutral-400">
                {formatFileSize(file.fileSize)}
              </span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <a
                href={fileDownloadUrl(file)}
                download={file.fileName}
                className="flex items-center gap-1 text-zinc-900 dark:text-slate-100 hover:text-zinc-800 dark:hover:text-slate-200"
                aria-label={t("files.downloadAria", { name: file.fileName })}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setPendingDelete(file)}
                disabled={deletingId === file.id}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                aria-label={t("files.deleteAria", { name: file.fileName })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {safeFiles.length === 0 && <p className="text-sm text-slate-500 dark:text-neutral-400">{t("files.empty")}</p>}
      </ul>

      {pendingDelete && (
        <ConfirmDialog
          title={t("files.deleteConfirm.title")}
          message={t("files.deleteConfirm.message", { name: pendingDelete.fileName })}
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
