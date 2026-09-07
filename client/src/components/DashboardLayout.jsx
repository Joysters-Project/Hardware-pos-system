import { createContext, useContext, useEffect, useState, useRef } from "react";
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import NavbarNotificationBell from "./NavbarNotificationBell";
import LogoutConfirmModal from "./LogoutConfirmModal";
import "../styles/DashboardLayout.css";
import "../styles/Departments.css";

export const DashboardLayoutContext = createContext(false);

export default function DashboardLayout({ children, active }) {
  const isNested = useContext(DashboardLayoutContext);

  if (isNested) {
    return <>{children}</>;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const { logout, role } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  /* Helper to get current role's dashboard path */
  const getDashboardPath = () => {
    const normRole = (role || "admin").toLowerCase();
    if (normRole === "manager") return "/dashboard/manager";
    if (normRole === "cashier") return "/dashboard/cashier";
    return "/dashboard/admin";
  };

  /* Keep localStorage updated */
  const handleCollapseToggle = (collapsedVal) => {
    setIsCollapsed(collapsedVal);
    localStorage.setItem("sidebar-collapsed", collapsedVal ? "true" : "false");
  };

  /* Handle UI back button click */
  const handleBackNavigation = () => {
    const targetDash = getDashboardPath();
    if (location.pathname === targetDash) {
      setShowLogoutModal(true);
    } else {
      navigate(targetDash, { replace: true });
    }
  };

  /* Handle browser back button navigation without adding extra history entries. */
  useEffect(() => {
    const handlePopState = () => {
      const targetDash = getDashboardPath();
      if (window.location.pathname === targetDash) {
        setShowLogoutModal(true);
      } else {
        navigate(targetDash, { replace: true });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname, role, navigate]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    sessionStorage.removeItem("pos_session_history");
    sessionStorage.removeItem("sidebar_scroll_top");
    const targetRole = role ? role.toLowerCase() : "admin";
    logout();
    toast.success("Logged out successfully!");
    navigate(`/login/${targetRole}`, { replace: true });
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <DashboardLayoutContext.Provider value={true}>
      <div className={`admin-shell ${isCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          active={active}
          onLogout={handleLogoutClick}
          isCollapsed={isCollapsed}
          setIsCollapsed={handleCollapseToggle}
        />
        <main className="admin-content">
          <div className="admin-topbar-header">
            {location.pathname !== getDashboardPath() && (
              <button
                type="button"
                className="admin-back-btn"
                onClick={handleBackNavigation}
                title="Back to Dashboard"
                id="topbar-back-btn"
              >
                <ArrowLeft size={16} />
                <span>Back to Dashboard</span>
              </button>
            )}
            <div className="admin-topbar-bell">
              <NavbarNotificationBell />
            </div>
          </div>
          <motion.div
            key={
              location.pathname.startsWith('/procurement') ? '/procurement' :
              location.pathname.startsWith('/cashier-panel') ? '/cashier-panel' :
              location.pathname
            }
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>

        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onCancel={handleCancelLogout}
          onLogout={handleConfirmLogout}
        />
      </div>
    </DashboardLayoutContext.Provider>
  );
}

