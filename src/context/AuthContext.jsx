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
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    if (!loaded) return;
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth, loaded]);

  async function login({ email, password }) {
    const { token } = await api.signin({ email, password });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));

    const me = await api.getMe();

    setAuth({ token, user: me });

    return me;
  }

  async function signup({ name, avatar, email, password }) {
    await api.signup({ name, avatar, email, password });
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
