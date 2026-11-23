import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Leaf, Menu, X } from "lucide-react";
import { useAuth } from "../context/useAuth";

const linkStyle = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-green-50 text-green-900" : "text-slate-700 hover:bg-slate-50"}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logout();
      setMenuOpen(false);
      navigate("/");
    } catch {
      setLogoutError("Could not sign out. Please try again.");
    }
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    ...(user ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(user?.role === "manufacturer" || user?.role === "admin"
      ? [{ to: "/manufacturer", label: "Manufacturer" }]
      : []),
    ...(user?.role === "manufacturer" || user?.role === "admin"
      ? [{ to: "/products/new", label: "Register product" }]
      : []),
    ...(user ? [{ to: "/assistant", label: "AI assistant" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
    { to: "/scan", label: "Scan QR" }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="rounded-xl bg-green-800 p-2 text-white"><Leaf size={19} /></span>
          EcoTrace <span className="text-green-700">AI</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map((link) => <NavLink key={link.to} to={link.to} className={linkStyle}>{link.label}</NavLink>)}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {installPrompt && (
            <button onClick={installApp} className="rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50">
              Install app
            </button>
          )}
          {user ? (
            <>
              <span className="max-w-40 truncate text-sm text-slate-600">{user.email}</span>
              <button onClick={handleLogout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Log out</button>
            </>
          ) : (
            <Link to="/auth" className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900">Sign in</Link>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {logoutError && <p role="alert" className="px-4 pb-2 text-right text-sm text-red-700">{logoutError}</p>}

      {menuOpen && (
        <nav className="grid gap-1 border-t border-slate-200 bg-white p-3 lg:hidden" aria-label="Mobile navigation">
          {links.map((link) => <NavLink key={link.to} to={link.to} className={linkStyle} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
          {installPrompt && (
            <button onClick={installApp} className="mt-1 rounded-lg border border-green-700 px-3 py-2 text-left text-sm font-semibold text-green-900">
              Install app
            </button>
          )}
          {user ? (
            <button onClick={handleLogout} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-semibold">Log out</button>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="mt-1 rounded-lg bg-green-800 px-3 py-2 text-sm font-semibold text-white">Sign in / Create account</Link>
          )}
        </nav>
      )}
    </header>
  );
}
