import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

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

  return children;
};

export default ProtectedRoute;