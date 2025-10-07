// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { redirectByRole, isAdmin, isModerator, isAdminOrModerator } from "../features/auth/services/authService";

const LS_AUTH_KEY = "revibe_auth";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = () => {
    try {
      const authData = localStorage.getItem(LS_AUTH_KEY);
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.user && parsed.access_token) {
          setUser(parsed.user);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("Error loading auth data:", error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem(LS_AUTH_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  const logout = async () => {
    try {
      const authData = localStorage.getItem(LS_AUTH_KEY);
      if (authData) {
        const parsed = JSON.parse(authData);
        
        // Call logout API to revoke refresh token
        if (parsed.refresh_token) {
          await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: parsed.refresh_token }),
          });
        }
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      clearAuth();
      nav("/auth/login", { replace: true });
    }
  };

  const getAuthHeader = () => {
    try {
      const authData = localStorage.getItem(LS_AUTH_KEY);
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.access_token) {
          return { Authorization: `Bearer ${parsed.access_token}` };
        }
      }
    } catch (error) {
      console.error("Error getting auth header:", error);
    }
    return {};
  };

  const requireAuth = () => {
    if (!isAuthenticated && !loading) {
      nav("/auth/login", { replace: true });
      return false;
    }
    return true;
  };

  const redirectToRoleBasedPage = () => {
    if (user && isAuthenticated) {
      redirectByRole(user, nav);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    logout,
    clearAuth,
    getAuthHeader,
    requireAuth,
    refreshAuth: loadUserFromStorage,
    redirectToRoleBasedPage,
    isAdmin: isAdmin(),
    isModerator: isModerator(),
    isAdminOrModerator: isAdminOrModerator(),
  };
}