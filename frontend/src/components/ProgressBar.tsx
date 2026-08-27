interface ProgressBarProps {
  percent: number;
  label?: string;
  size?: "sm" | "md";
}

/** Striped, animated task-completion indicator used across the projects list and grid. */
export default function ProgressBar({ percent, label, size = "sm" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-2">
      <div className={`${height} min-w-[4rem] flex-1 overflow-hidden rounded-full bg-gray-100`}>
        <div
          className="progress-bar-striped h-full rounded-full bg-green-500 transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label !== undefined && (
        <span className="flex-shrink-0 whitespace-nowrap text-xs font-medium text-gray-500">
          {label}
        </span>
      )}
    </div>
  );
}
