import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { BASE_URL } from "../utils/apiPath";

const AuthContext = createContext(null);

// ================================
// Custom Hook
// ================================
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

// ================================
// Provider
// ================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ----------------------------
  // Check stored login on load
  // ----------------------------
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for OAuth-based authentication (session-based)
      const oauthAuth = localStorage.getItem("oauthAuth");
      const userStr = localStorage.getItem("user");

      if (oauthAuth && userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // Check for token-based authentication
      const token = localStorage.getItem("token");

      if (token && userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Login
  // ----------------------------
  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
  };

  // ----------------------------
  // Logout
  // ----------------------------
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("oauthAuth");

    setUser(null);
    setIsAuthenticated(false);

    // Use navigate if available, otherwise redirect
    window.location.href = "/login";
  };

  // ----------------------------
  // Update user profile locally
  // ----------------------------
  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };

    localStorage.setItem("user", JSON.stringify(newUserData));
    setUser(newUserData);
  };

  // ----------------------------
  // OAuth Login (after callback)
  // ----------------------------
  const loginWithOAuth = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/user`, {
        method: "GET",
        credentials: "include", // ⚠️ IMPORTANT: Send cookies for session
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user from OAuth");
      }

      const data = await response.json();

      if (data.success && data.user) {
        // ✅ Save user without token (session-based auth)
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("oauthAuth", "true"); // Flag for OAuth

        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ OAuth login failed:", error);
      return false;
    }
  };

  // ----------------------------
  // Context value
  // ----------------------------
  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    loginWithOAuth,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
