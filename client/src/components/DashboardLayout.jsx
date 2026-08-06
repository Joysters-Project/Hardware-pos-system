import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import NavbarNotificationBell from "./NavbarNotificationBell";
import LogoutConfirmModal from "./LogoutConfirmModal";
import "../styles/DashboardLayout.css";
import "../styles/Departments.css";

export default function DashboardLayout({ children, active }) {
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

  /* Handle browser back button navigation:
     - If user is on any non-dashboard page, back button automatically navigates to Dashboard.
     - If user is on Dashboard, pressing back button (1, 2, or more times) asks for logout confirmation and NEVER enters login page.
  */
  useEffect(() => {
    // Push history trap states to create a buffer against multiple rapid back presses
    window.history.pushState({ inPosApp: true }, null, window.location.href);
    window.history.pushState({ inPosApp: true }, null, window.location.href);

    const handlePopState = () => {
      // Continuously re-push history trap state to keep user inside POS application frame
      window.history.pushState({ inPosApp: true }, null, window.location.href);
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
    logout();
    toast.success("Logged out successfully!");
    const targetRole = role ? role.toLowerCase() : "admin";
    navigate(`/login/${targetRole}`, { replace: true });
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
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
        {children}
      </main>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={handleCancelLogout}
        onLogout={handleConfirmLogout}
      />
    </div>
  );
}

