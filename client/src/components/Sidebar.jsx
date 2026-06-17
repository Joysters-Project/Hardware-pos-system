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
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Truck,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/Sidebar.css";

/* ─── Nav configuration ─── */
const getNavItems = (role) => {
  const normalizedRole = (role || "admin").toLowerCase();

  if (normalizedRole === "cashier") {
    return [
      {
        key: "home",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard/cashier",
      },
      {
        key: "billing",
        label: "Point of Sale",
        icon: ShoppingCart,
        path: "/billing",
      },
      {
        key: "due-collection",
        label: "Due Collection",
        icon: Wallet,
        path: "/due-collection",
      },
      {
        key: "returns",
        label: "Returns",
        icon: RefreshCw,
        path: "/returns",
      },
      {
        key: "receipts",
        label: "Receipts",
        icon: Receipt,
        path: "/receipts",
      },
      {
        key: "reports",
        label: "Reports",
        icon: TrendingUp,
        path: "/reports",
      },
    ];
  }

  const prefix = normalizedRole === "manager" ? "/manager" : "";
  const dashPath =
    normalizedRole === "manager" ? "/dashboard/manager" : "/dashboard/admin";

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
      key: "reports",
      label: "Reports",
      icon: TrendingUp,
      path: "/reports",
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
    // Audit Logs is Admin-only
    ...(normalizedRole === "admin"
      ? [{ key: "audit", label: "Audit Logs", icon: ShieldAlert, path: "/audit-logs" }]
      : []),
    // Procurement — Admin and Manager
    ...(normalizedRole !== "cashier"
      ? [{ key: "procurement", label: "Procurement", icon: Truck, path: "/procurement" }]
      : []),
  ];
};

export default function Sidebar({ active, onLogout, isCollapsed, setIsCollapsed }) {
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
        className={`sidebar-float ${mobileOpen ? "mobile-open" : ""} ${isCollapsed ? "collapsed" : ""}`}
        id="main-sidebar"
      >
        {/* Header */}
        <div className="sidebar-float__header">
          <div className="sidebar-float__logo-wrapper">
            <div className="sidebar-float__logo">
              <Hexagon size={20} />
            </div>
            <div className="sidebar-float__brand-info">
              <div className="sidebar-float__brand">Mathumithan</div>
              <div className="sidebar-float__brand-sub">Hardware POS</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-float__nav">
          {!isCollapsed ? (
            <div className="sidebar-float__nav-label">Main Menu</div>
          ) : (
            <div className="sidebar-float__nav-divider" />
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`sidebar-float__nav-item ${isActive ? "active" : ""}`}
                id={`nav-${item.key}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="sidebar-float__nav-icon">
                  <Icon size={18} />
                </span>
                <span className="sidebar-float__nav-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-float__footer">
          <Link
            to="/profile"
            className={`sidebar-float__user-block ${
              location.pathname === "/profile" ? "sidebar-float__user-block--active" : ""
            }`}
            title={isCollapsed ? `${userName} (${displayRole})` : undefined}
          >
            <div className="sidebar-float__avatar">{initials}</div>
            <div className="sidebar-float__user-info">
              <div className="sidebar-float__user-name">{userName}</div>
              <div className="sidebar-float__user-role">{displayRole}</div>
            </div>
          </Link>
          <button
            className="sidebar-float__logout"
            onClick={onLogout}
            id="sidebar-logout"
            title={isCollapsed ? "Log out" : undefined}
          >
            <LogOut size={16} />
            <span className="sidebar-float__logout-text">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
