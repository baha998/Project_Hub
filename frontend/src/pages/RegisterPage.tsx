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
        <UserPlus className="h-10 w-10 text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-900">{t("auth.register.title")}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
            {t("auth.register.fullName")}
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.fullName && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            {t("auth.register.email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            {t("auth.register.password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
            {t("auth.register.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {curatorMode ? (
          <div>
            <label htmlFor="curatorSecret" className="mb-1 block text-sm font-medium text-gray-700">
              {t("auth.register.curatorSecret")}
            </label>
            <input
              id="curatorSecret"
              type="password"
              value={curatorSecret}
              onChange={(e) => setCuratorSecret(e.target.value)}
              placeholder={t("auth.register.curatorSecretPlaceholder")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {fieldErrors.curatorSecret && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.curatorSecret}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">{t("auth.register.curatorHint")}</p>
          </div>
        ) : (
          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
              {t("auth.register.role")}
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as SelfServiceRole)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="MEMBER">{t("auth.register.roleMember")}</option>
              <option value="LEAD">{t("auth.register.roleLead")}</option>
            </select>
          </div>
        )}

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
        className="flex items-center justify-center gap-1 text-xs text-gray-400 transition hover:text-gray-600"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {curatorMode ? t("auth.register.toggleToNormal") : t("auth.register.toggleToCurator")}
      </button>

      <p className="text-center text-sm text-gray-500">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          {t("auth.register.loginLink")}
        </Link>
      </p>
    </div>
  );
}
