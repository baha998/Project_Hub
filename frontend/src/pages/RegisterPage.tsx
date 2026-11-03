import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/axios";
import type { UserRole } from "../types";

type SelfServiceRole = Exclude<UserRole, "ADMIN">;

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  curatorSecret?: string;
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<SelfServiceRole>("MEMBER");
  const [curatorMode, setCuratorMode] = useState(false);
  const [curatorSecret, setCuratorSecret] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (fullName.trim().length < 2) {
      errors.fullName = t("auth.register.errors.fullNameShort");
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = t("auth.register.errors.emailInvalid");
    }
    if (password.length < 6) {
      errors.password = t("auth.register.errors.passwordShort");
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = t("auth.register.errors.passwordMismatch");
    }
    if (curatorMode && curatorSecret.trim().length === 0) {
      errors.curatorSecret = t("auth.register.errors.curatorSecretRequired");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const effectiveRole: UserRole = curatorMode ? "ADMIN" : role;
      await register(
        email,
        password,
        fullName.trim(),
        effectiveRole,
        curatorMode ? curatorSecret.trim() : undefined,
      );
      navigate("/projects");
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="mb-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><UserPlus className="h-6 w-6 text-zinc-900 dark:text-slate-100" /></span>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("auth.register.title")}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("auth.register.fullName")}
          </label>
          <input
            id="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
          {fieldErrors.fullName && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("auth.register.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("auth.register.password")}
          </label>
          <input
            id="password"
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("auth.register.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            autoComplete="new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {curatorMode ? (
          <div>
            <label htmlFor="curatorSecret" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("auth.register.curatorSecret")}
            </label>
            <input
              id="curatorSecret"
              type="password"
              value={curatorSecret}
              onChange={(e) => setCuratorSecret(e.target.value)}
              placeholder={t("auth.register.curatorSecretPlaceholder")}
              className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
            />
            {fieldErrors.curatorSecret && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.curatorSecret}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{t("auth.register.curatorHint")}</p>
          </div>
        ) : (
          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("auth.register.role")}
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as SelfServiceRole)}
              className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
            >
              <option value="MEMBER">{t("auth.register.roleMember")}</option>
              <option value="LEAD">{t("auth.register.roleLead")}</option>
            </select>
          </div>
        )}

        {formError && <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 hover:bg-zinc-700 dark:hover:bg-slate-300 disabled:opacity-50"
        >
          {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setCuratorMode((v) => !v);
          setFieldErrors({});
        }}
        className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-neutral-400 transition hover:text-slate-600 dark:hover:text-slate-400"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {curatorMode ? t("auth.register.toggleToNormal") : t("auth.register.toggleToCurator")}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-neutral-400">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="text-zinc-900 dark:text-slate-100 hover:underline">
          {t("auth.register.loginLink")}
        </Link>
      </p>
    </div>
  );
}
