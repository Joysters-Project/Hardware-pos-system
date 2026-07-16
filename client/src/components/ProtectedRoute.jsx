import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole = null, blockedRoles = [] }) => {
  const { isAuthenticated, loading, hasRole, role } = useAuth();

  // Show loading state or redirect
  if (loading) {
    return <div>Loading...</div>;
  }

  // ❌ Not logged in → go to home (NOT login/admin)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // ❌ Wrong role → go to home
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  // ❌ Blocked role → redirect to their dashboard
  if (blockedRoles.length > 0 && role && blockedRoles.includes(role.toLowerCase())) {
    return <Navigate to={`/dashboard/${role.toLowerCase()}`} replace />;
  }

  return children;
};

export default ProtectedRoute;