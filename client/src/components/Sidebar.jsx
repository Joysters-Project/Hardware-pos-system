import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
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
  BarChart3,
  Truck,
  ClipboardList,
  UserCircle,
  Bell,
  Archive,
  FolderOpen,
  Banknote,
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
        key: "sales",
        label: "Sales",
        icon: ShoppingCart,
        path: "/cashier-panel/billing",
      },
      {
        key: "reports",
        label: "Reports",
        icon: BarChart3,
        path: "/cashier-panel/reports",
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
      key: "sales",
      label: "Sales",
      icon: ShoppingCart,
      path: "/cashier-panel",
    },
    {
      key: "inventory",
      label: "Inventory",
      icon: Package,
      path: `${prefix}/products`,
    },
    {
      key: "procurement",
      label: "Procurement",
      icon: Truck,
      path: "/procurement",
    },
    {
      key: "people",
      label: "People",
      icon: Users,
      path: `${prefix}/employees`,
    },
    {
      key: "finance",
      label: "Finance",
      icon: Wallet,
      path: `${prefix}/expenses`,
    },
    {
      key: "reports",
      label: "Reports",
      icon: BarChart3,
      path: "/reports",
    },
    ...(normalizedRole === "admin"
      ? [
          {
            key: "audit",
            label: "Audit Logs",
            icon: ShieldAlert,
            path: "/audit-logs",
          },
        ]
      : []),
    {
      key: "projects",
      label: "Projects",
      icon: FolderOpen,
      path: `${prefix}/projects`,
    },
    {
      key: "alerts",
      label: "Alerts",
      icon: Bell,
      path: `${prefix}/alerts`,
    },
  ];
};

export default function Sidebar({ active, onLogout, isCollapsed, setIsCollapsed }) {
  const { user, role, profilePhoto } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const navRef = useRef(null);

  const userName = user?.name || "User";
  const displayRole = role || "admin";
  const normalizedRole = displayRole.toLowerCase();
  const navItems = getNavItems(displayRole);

  const isItemActive = (item) => {
    if (active === item.key) return true;
    const path = location.pathname;

    switch (item.key) {
      case "home":
        return (
          active === "home" ||
          path === "/dashboard/admin" ||
          path === "/dashboard/manager" ||
          path === "/dashboard/cashier"
        );
      case "sales":
        return (
          [
            "sales",
            "cashier-panel",
            "billing",
            "due-collection",
            "returns",
            "receipts",
          ].includes(active) ||
          path.startsWith("/cashier-panel") ||
          path.startsWith("/billing") ||
          path.startsWith("/due-collection") ||
          path.startsWith("/returns") ||
          path.startsWith("/receipts")
        );
      case "inventory":
        return (
          [
            "inventory",
            "products",
            "catalog",
            "batch-inventory",
            "assets",
          ].includes(active) ||
          path.includes("/products") ||
          path.includes("/catalog") ||
          path.includes("/inventory") ||
          path.includes("/assets")
        );
      case "procurement":
        return active === "procurement" || path.startsWith("/procurement");
      case "people":
        return (
          ["people", "employees", "departments"].includes(active) ||
          path.includes("/employees") ||
          path.includes("/departments")
        );
      case "finance":
        return (
          [
            "finance",
            "expenses",
            "customer-cheque-exchange",
            "salary",
          ].includes(active) ||
          path.includes("/expenses") ||
          path.includes("/customer-cheque-exchange") ||
          path.includes("/salary")
        );
      case "reports":
        return (
          (active === "reports" || path === "/reports") &&
          !path.startsWith("/cashier-panel")
        );
      case "audit":
        return active === "audit" || path.startsWith("/audit-logs");
      case "projects":
        return (
          ["projects", "projects-mgmt"].includes(active) ||
          path.includes("/projects")
        );
      case "alerts":
        return active === "alerts" || path.includes("/alerts");
      default:
        return false;
    }
  };

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [profilePhoto]);

  /* Restore sidebar scroll position on mount and location changes */
  useLayoutEffect(() => {
    const savedPos = sessionStorage.getItem("sidebar_scroll_top");
    if (savedPos && navRef.current) {
      navRef.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [location.pathname]);

  const handleNavScroll = (e) => {
    sessionStorage.setItem("sidebar_scroll_top", e.target.scrollTop.toString());
  };

  const handleLinkClick = () => {
    if (navRef.current) {
      sessionStorage.setItem("sidebar_scroll_top", navRef.current.scrollTop.toString());
    }
  };

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

  const initial = userName.trim().charAt(0).toUpperCase() || "U";

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
        <nav
          className="sidebar-float__nav"
          ref={navRef}
          onScroll={handleNavScroll}
        >
          {!isCollapsed ? (
            <div className="sidebar-float__nav-label">Main Menu</div>
          ) : (
            <div className="sidebar-float__nav-divider" />
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);
            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={handleLinkClick}
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
            <div
              className={`sidebar-float__avatar ${profilePhoto && !avatarImageFailed ? "" : "sidebar-float__avatar--fallback"}`}
              aria-label={profilePhoto && !avatarImageFailed ? `${userName} profile photo` : `${userName} profile initial`}
            >
              {profilePhoto && !avatarImageFailed
                ? <img src={profilePhoto} alt={userName} className="sidebar-float__avatar-img" onError={() => setAvatarImageFailed(true)} />
                : initial
              }
            </div>
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
