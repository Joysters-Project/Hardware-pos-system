import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import NavbarNotificationBell from "./NavbarNotificationBell";
import "../styles/DashboardLayout.css";
import "../styles/Departments.css";

export default function DashboardLayout({ children, active }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [pageTransitionKey, setPageTransitionKey] = useState(location.pathname + location.search);

  /* Keep localStorage updated */
  const handleCollapseToggle = (collapsedVal) => {
    setIsCollapsed(collapsedVal);
    localStorage.setItem("sidebar-collapsed", collapsedVal ? "true" : "false");
  };

  /* Prevent back-button after logout */
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const block = () =>
      window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, []);

  useEffect(() => {
    setPageTransitionKey(location.pathname + location.search);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", () => {
      window.history.pushState(null, null, window.location.href);
    });

    logout();
    toast.success("Logged out successfully!");
    navigate("/", { replace: true });
  };

  return (
    <div className={`admin-shell ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        active={active}
        onLogout={handleLogout}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleCollapseToggle}
      />
      <main className="admin-content">
        <div className="admin-topbar-bell">
          <NavbarNotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
