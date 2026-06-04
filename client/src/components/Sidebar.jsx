import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  Layers,
  Briefcase,
  Receipt,
  Wallet,
  LogOut,
  Menu,
  X,
  Hexagon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/Sidebar.css";

/* ─── Nav configuration ─── */
const getNavItems = (role) => {
  const prefix = role === "manager" ? "/manager" : "";
  const dashPath =
    role === "manager" ? "/dashboard/manager" : "/dashboard/admin";

  return [
    {
      key: "home",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: dashPath,
    },
    {
      key: "departments",
      label: "Departments",
      icon: Building2,
      path: `${prefix}/departments`,
    },
    {
      key: "products",
      label: "Products",
      icon: Package,
      path: `${prefix}/products`,
    },
    {
      key: "employees",
      label: "Employees",
      icon: Users,
      path: `${prefix}/employees`,
    },
    {
      key: "catalog",
      label: "Catalog",
      icon: Layers,
      path: `${prefix || ""}/catalog`,
    },
    {
      key: "assets",
      label: "Assets",
      icon: Briefcase,
      path: `${prefix}/assets`,
    },
    {
      key: "expenses",
      label: "Expenses",
      icon: Receipt,
      path: `${prefix}/expenses`,
    },
    // Salary is Admin-only — hidden for manager role
    ...(role !== "manager"
      ? [{ key: "salary", label: "Salary", icon: Wallet, path: "/salary" }]
      : []),
  ]; 
};

export default function Sidebar({ active, onLogout }) {
  const { user, role } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = user?.name || "User";
  const displayRole = role || "admin";
  const navItems = getNavItems(displayRole);

  /* Close drawer on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* Close drawer on Escape */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* Prevent body scroll when drawer is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* ── Mobile Hamburger Button ── */}
      <button
        className="sidebar-hamburger"
        onClick={toggleMobile}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        id="sidebar-toggle"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* ── Mobile Overlay ── */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Floating Sidebar ── */}
      <aside
        className={`sidebar-float ${mobileOpen ? "mobile-open" : ""}`}
        id="main-sidebar"
      >
        {/* Header */}
        <div className="sidebar-float__header">
          <div className="sidebar-float__logo">
            <Hexagon size={20} />
          </div>
          <div>
            <div className="sidebar-float__brand">Mathumithan</div>
            <div className="sidebar-float__brand-sub">Hardware POS</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-float__nav">
          <div className="sidebar-float__nav-label">Main Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`sidebar-float__nav-item ${isActive ? "active" : ""}`}
                id={`nav-${item.key}`}
              >
                <span className="sidebar-float__nav-icon">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-float__footer">
          <div className="sidebar-float__user-block">
            <div className="sidebar-float__avatar">{initials}</div>
            <div className="sidebar-float__user-info">
              <div className="sidebar-float__user-name">{userName}</div>
              <div className="sidebar-float__user-role">{displayRole}</div>
            </div>
          </div>
          <button
            className="sidebar-float__logout"
            onClick={onLogout}
            id="sidebar-logout"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
