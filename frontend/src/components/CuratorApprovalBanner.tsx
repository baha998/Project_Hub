import { useState } from "react";
import { CheckCircle2, Clock, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toggleProjectApproval } from "../api/projects";
import { extractErrorMessage } from "../api/axios";
import { useToast } from "../context/ToastContext";
import type { Project } from "../types";

interface CuratorApprovalBannerProps {
  project: Project;
  onToggled: () => void;
}

/** Curator-only sign-off banner shown on the project detail page. */
export default function CuratorApprovalBanner({ project, onToggled }: CuratorApprovalBannerProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleProjectApproval(project.id);
      onToggled();
      showToast(
        project.isApprovedByCurator
          ? t("curatorBanner.toastRevoked")
          : t("curatorBanner.toastApproved"),
        "success",
      );
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setToggling(false);
    }
  }

  const approved = project.isApprovedByCurator;

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
        approved ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
            approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${approved ? "text-green-900" : "text-amber-900"}`}>
            {approved ? t("curatorBanner.approvedTitle") : t("curatorBanner.pendingTitle")}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{t("curatorBanner.hint")}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={toggling}
        className={`flex flex-shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-50 ${
          approved ? "bg-gray-500 hover:bg-gray-600" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {approved ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        {toggling ? "..." : approved ? t("curatorBanner.revoke") : t("curatorBanner.approve")}
      </button>
    </div>
  );
}
