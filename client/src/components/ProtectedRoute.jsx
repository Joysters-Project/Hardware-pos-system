import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  // Show loading state or redirect
  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Prevent back button navigation by replacing history
    return <Navigate to="/login/admin" replace />;
  }

  // Check if user has required role
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/login/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;