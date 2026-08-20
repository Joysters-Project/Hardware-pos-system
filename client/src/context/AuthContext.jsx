import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/axios";

const AuthContext = createContext();
const BASE_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [role,         setRole]         = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    const validateAuth = () => {
      try {
        const token      = sessionStorage.getItem("token");
        const storedRole = sessionStorage.getItem("role");
        const userName   = sessionStorage.getItem("userName");

        if (token && storedRole && userName) {
          setIsAuthenticated(true);
          setRole(storedRole);
          setUser({ name: userName, role: storedRole });
          // Fetch profile photo after auth is confirmed
          api.get("/profile")
            .then(res => {
              if (res.data?.profile_photo)
                setProfilePhoto(`${BASE_URL}/${res.data.profile_photo}`);
            })
            .catch(() => {});
        } else {
          setIsAuthenticated(false);
          setRole(null);
          setUser(null);
          setProfilePhoto(null);
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
    sessionStorage.setItem("token",     token);
    sessionStorage.setItem("role",      userRole);
    sessionStorage.setItem("userName",  userData);
    sessionStorage.setItem("loginTime", Date.now().toString());

    setIsAuthenticated(true);
    setRole(userRole);
    setUser({ name: userData, role: userRole });
    // Fetch photo after login
    api.get("/profile")
      .then(res => {
        if (res.data?.profile_photo)
          setProfilePhoto(`${BASE_URL}/${res.data.profile_photo}`);
      })
      .catch(() => {});
  };

  const logout = () => {
    const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
    if (userId) {
      api.post("/auth/logout", { user_id: userId }).catch(() => {});
    }

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userFirstName");
    sessionStorage.removeItem("userLastName");
    sessionStorage.removeItem("userFullName");
    sessionStorage.removeItem("loginTime");
    sessionStorage.removeItem("sidebar_scroll_top");
    sessionStorage.removeItem("pos_session_history");
    sessionStorage.setItem("loggedOut", "true");

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("userLastName");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("loginTime");

    // Clear state
    setIsAuthenticated(false);
    setRole(null);
    setUser(null);
    setProfilePhoto(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);


  // Called by MyProfile after photo save or delete
  const updateProfilePhoto = (url) => setProfilePhoto(url || null);

  const hasRole = (requiredRole) => {
    if (!isAuthenticated) return false;
    if (!requiredRole) return true;
    return role && role.toLowerCase() === requiredRole.toLowerCase();
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, role, loading,
      profilePhoto, updateProfilePhoto,
      login, logout, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
