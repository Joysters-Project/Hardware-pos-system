import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import "../styles/DashboardLayout.css";

export default function DashboardLayout({ children, active }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  /* Prevent back-button after logout */
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const block = () =>
      window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, []);

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
    <div className="admin-shell">
      <Sidebar active={active} onLogout={handleLogout} />
      <main className="admin-content">{children}</main>
    </div>
  );
}
