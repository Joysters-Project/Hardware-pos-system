import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const validateAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");
        const userName = localStorage.getItem("userName");

        if (token && storedRole && userName) {
          setIsAuthenticated(true);
          setRole(storedRole);
          setUser({
            name: userName,
            role: storedRole
          });
        } else {
          setIsAuthenticated(false);
          setRole(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth validation error:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    validateAuth();
  }, []);

  const login = (userData, token, userRole) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", userRole);
    localStorage.setItem("userName", userData);
    localStorage.setItem("loginTime", Date.now().toString());

    setIsAuthenticated(true);
    setRole(userRole);
    setUser({
      name: userData,
      role: userRole
    });
  };

  const logout = () => {
    // Clear storage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("userLastName");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("loginTime");

    // Set flag to prevent back button
    sessionStorage.setItem("loggedOut", "true");

    // Clear state
    setIsAuthenticated(false);
    setRole(null);
    setUser(null);
  };

  const hasRole = (requiredRole) => {
    if (!isAuthenticated) return false;
    if (!requiredRole) return true; // No specific role required
    return role && role.toLowerCase() === requiredRole.toLowerCase();
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      role,
      loading,
      login,
      logout,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
