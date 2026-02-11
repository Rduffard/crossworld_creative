// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../utils/api.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "cw_auth";

function readStoredAuth() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  // auth shape: { token, user } | null
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [loaded, setLoaded] = useState(false);

  // On first load: if token exists, verify it by fetching /me
  useEffect(() => {
    const boot = async () => {
      const stored = readStoredAuth();
      if (!stored?.token) {
        setLoaded(true);
        return;
      }

      try {
        const me = await api.getMe();
        setAuth({ token: stored.token, user: me });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setAuth(null);
      } finally {
        setLoaded(true);
      }
    };

    boot();
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!loaded) return;
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth, loaded]);

  async function login({ email, password }) {
    // 1) get token
    const { token } = await api.signin({ email, password });

    // 2) store token immediately so api.getMe can attach it
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));

    // 3) fetch user
    const me = await api.getMe();

    // 4) store full auth
    setAuth({ token, user: me });

    return me;
  }

  async function signup({ name, avatar, email, password }) {
    // create user (no token returned)
    await api.signup({ name, avatar, email, password });

    // you can choose: auto-login after signup
    // this is nice UX and makes signup "feel" complete
    return login({ email, password });
  }

  function logout() {
    setAuth(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(() => {
    return {
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth?.token),
      loaded,

      login,
      signup,
      logout,
    };
  }, [auth, loaded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
