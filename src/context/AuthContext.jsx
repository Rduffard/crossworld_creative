// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = logged out
  const [loaded, setLoaded] = useState(false);

  // On first load, try to restore user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cw_auth");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("cw_auth");
      }
    }
    setLoaded(true);
  }, []);

  // Whenever `user` changes, keep it in localStorage
  useEffect(() => {
    if (!loaded) return; // avoid writing before first load
    if (user) {
      localStorage.setItem("cw_auth", JSON.stringify(user));
    } else {
      localStorage.removeItem("cw_auth");
    }
  }, [user, loaded]);

  function login({ email }) {
    // TODO: replace with real API call later
    setUser({ email });
  }

  function logout() {
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loaded,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
