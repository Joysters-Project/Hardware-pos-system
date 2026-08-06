import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole = null, blockedRoles = [] }) => {
  const { isAuthenticated, loading, hasRole, role } = useAuth();

  // Show loading state or redirect
  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", backgroundColor: "#f5f5f5", fontSize: "18px", color: "#333",
      }}>
        Loading...
      </div>
    );
  }

  // ❌ Not logged in → go to login page
  if (!isAuthenticated) {
    const loginRole = requiredRole || role || "admin";
    return <Navigate to={`/login/${loginRole.toLowerCase()}`} replace />;
  }

  // ❌ Wrong role → go to login page for required role
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to={`/login/${requiredRole.toLowerCase()}`} replace />;
  }

  // ❌ Blocked role → redirect to their dashboard
  if (blockedRoles.length > 0 && role && blockedRoles.includes(role.toLowerCase())) {
    return <Navigate to={`/dashboard/${role.toLowerCase()}`} replace />;
  }

  return children;
};

export default ProtectedRoute;