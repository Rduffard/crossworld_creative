import { createContext, useCallback, useEffect, useMemo, useState } from "react";
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

  const login = useCallback(async ({ email, password }) => {
    const { token } = await api.signin({ email, password });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));

    const me = await api.getMe();

    setAuth({ token, user: me });

    return me;
  }, []);

  const signup = useCallback(async ({ name, avatar, email, password }) => {
    await api.signup({ name, avatar, email, password });
    return login({ email, password });
  }, [login]);

  const logout = useCallback(() => {
    setAuth(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setAuth((currentAuth) => {
      if (!currentAuth?.token) {
        return currentAuth;
      }

      return {
        ...currentAuth,
        user: nextUser,
      };
    });
  }, []);

  const value = useMemo(() => {
    return {
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth?.token),
      loaded,
      login,
      signup,
      logout,
      updateUser,
    };
  }, [auth, loaded, login, signup, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
