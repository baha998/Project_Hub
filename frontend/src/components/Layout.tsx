import { Link, Outlet, useNavigate } from "react-router-dom";
import { FolderKanban, LogIn, LogOut, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/projects" className="flex items-center gap-2 font-semibold text-gray-900">
            <FolderKanban className="h-5 w-5 text-indigo-600" />
            {t("nav.brand")}
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600">{user?.fullName}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("nav.register")}
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </div>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
