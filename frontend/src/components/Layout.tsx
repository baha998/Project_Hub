import { Link, Outlet, useNavigate } from "react-router-dom";
import { FolderKanban, LogIn, LogOut, Moon, Sun, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTheme } from "../context/theme";

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3 focus:text-zinc-900">{t("nav.skipContent")}</a>
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/projects" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <FolderKanban className="h-5 w-5 text-zinc-900 dark:text-slate-100" />
            {t("nav.brand")}
          </Link>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3 text-sm">
            {isAuthenticated ? (
              <>
                <span className="hidden text-slate-600 dark:text-slate-400 md:inline">{user?.fullName}</span>
                <span className="rounded-md border border-slate-200 px-2 py-1 font-mono text-[10px] tracking-wider text-slate-600 dark:border-neutral-800 dark:text-slate-300">{user?.role}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("nav.register")}
                </Link>
              </>
            )}
            <LanguageSwitcher />
            <button type="button" onClick={toggleTheme} aria-label={t(theme === "dark" ? "theme.light" : "theme.dark")} title={t(theme === "dark" ? "theme.light" : "theme.dark")} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-800">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
