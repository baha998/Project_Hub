interface ProgressBarProps {
  percent: number;
  label?: string;
  size?: "sm" | "md";
}

/** Task completion with an accessible numeric value. */
export default function ProgressBar({ percent, label, size = "sm" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-2">
      <div role="progressbar" aria-label={label ?? "Progress"} aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} className={`${height} min-w-[4rem] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800`}>
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-slate-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label !== undefined && (
        <span className="flex-shrink-0 whitespace-nowrap text-xs font-medium text-slate-500 dark:text-neutral-400">
          {label}
        </span>
      )}
    </div>
  );
}
