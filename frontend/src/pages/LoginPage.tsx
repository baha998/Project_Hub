import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/axios";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = t("auth.login.errors.emailInvalid");
    }
    if (password.length < 6) {
      errors.password = t("auth.login.errors.passwordShort");
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
      await login(email, password);
      navigate("/projects");
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="mb-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><LogIn className="h-6 w-6 text-zinc-900 dark:text-slate-100" /></span>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("auth.login.title")}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("auth.login.email")}
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
            {t("auth.login.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-zinc-500 dark:focus:border-neutral-500 focus:outline-none"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.password}</p>
          )}
        </div>

        {formError && <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 hover:bg-zinc-700 dark:hover:bg-slate-300 disabled:opacity-50"
        >
          {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-neutral-400">
        {t("auth.login.noAccount")}{" "}
        <Link to="/register" className="text-zinc-900 dark:text-slate-100 hover:underline">
          {t("auth.login.registerLink")}
        </Link>
      </p>
    </div>
  );
}
