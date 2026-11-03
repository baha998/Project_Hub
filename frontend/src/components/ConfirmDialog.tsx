import { useTranslation } from "react-i18next";
import Modal from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal-based replacement for window.confirm, styled to match the app. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          {cancelLabel ?? t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 shadow-sm transition ${
            destructive ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 dark:bg-slate-100 hover:bg-zinc-700 dark:hover:bg-slate-300"
          }`}
        >
          {confirmLabel ?? t("common.confirm")}
        </button>
      </div>
    </Modal>
  );
}
