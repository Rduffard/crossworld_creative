import { createContext, useEffect, useReducer, useRef, useState } from "react";
import { api } from "../utils/api.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  DEFAULT_ACCENT,
  DEFAULT_ACCENT_OVERRIDE,
  DEFAULT_THEME,
  DEFAULT_THEME_FLAVOR,
  GLOBAL_THEME,
  applyThemeToDocument,
  getGlobalStyleMeta,
  getSystemThemeMode,
  getThemeCssVariables,
  getThemeModeMeta,
  normalizeGlobalStyle,
  parseStoredThemePreferences,
  serializeThemePreferences,
  STORAGE_KEY,
  normalizeAccentColor,
  normalizeThemeMode,
  resolveThemeMode,
} from "./themeConfig.js";

const ThemeContext = createContext(null);

function readStoredThemePreferences() {
  return parseStoredThemePreferences(localStorage.getItem(STORAGE_KEY));
}

function getSystemTheme() {
  return getSystemThemeMode();
}

function themeReducer(state, action) {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        themeMode: action.payload.themeMode,
        globalStyle: action.payload.globalStyle,
        accentColor: action.payload.accentColor,
      };
    case "set-theme-mode":
      return {
        ...state,
        themeMode: action.payload,
      };
    case "set-theme-flavor":
      return {
        ...state,
        globalStyle: action.payload,
      };
    case "set-accent":
      return {
        ...state,
        accentColor: action.payload,
      };
    default:
      return state;
  }
}

function getSettingsThemePreferences(settings) {
  return {
    themeMode: normalizeThemeMode(settings?.theme ?? settings?.themeMode),
    globalStyle: normalizeGlobalStyle(
      settings?.globalStyle ?? settings?.themeFlavor ?? settings?.brandSkin
    ),
    accentColor: normalizeAccentColor(settings?.accentColor),
  };
}

export function ThemeProvider({ children }) {
  const { user, loaded, isAuthenticated, updateUser } = useAuth();
  const storedPreferences = readStoredThemePreferences();
  const [preferences, dispatch] = useReducer(themeReducer, storedPreferences);
  const { themeMode, globalStyle, accentColor } = preferences;
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const resolvedTheme = resolveThemeMode(themeMode, systemTheme);
  const activeGlobalStyle = normalizeGlobalStyle(globalStyle);
  const nativeAccentColor =
    themeMode === GLOBAL_THEME
      ? getGlobalStyleMeta(activeGlobalStyle).accent
      : getThemeModeMeta(resolvedTheme).accent;
  const appliedAccentColor = accentColor || nativeAccentColor || DEFAULT_ACCENT;
  const cssVariables = getThemeCssVariables({
    themeMode,
    resolvedTheme,
    globalStyle: activeGlobalStyle,
    accentOverride: accentColor,
  });
  const hydratedFromUserRef = useRef(false);

  useEffect(() => {
    applyThemeToDocument(
      document.documentElement,
      {
        themeMode,
        resolvedTheme,
        globalStyle: activeGlobalStyle,
        cssVariables,
      }
    );
  }, [activeGlobalStyle, cssVariables, themeMode, resolvedTheme]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      serializeThemePreferences(themeMode, activeGlobalStyle, accentColor)
    );
  }, [accentColor, activeGlobalStyle, themeMode]);

  useEffect(() => {
    if (themeMode !== "system") {
      return undefined;
    }

    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themeMode]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (!isAuthenticated) {
      hydratedFromUserRef.current = false;
      return;
    }

    if (user?.settings) {
      dispatch({
        type: "hydrate",
        payload: getSettingsThemePreferences(user.settings),
      });
      hydratedFromUserRef.current = true;
      return;
    }

    if (hydratedFromUserRef.current) {
      return;
    }

    let cancelled = false;

    api
      .getUserSettings()
      .then((response) => {
        if (cancelled) {
          return;
        }

        dispatch({
          type: "hydrate",
          payload: getSettingsThemePreferences(response?.settings),
        });
        hydratedFromUserRef.current = true;
      })
      .catch(() => {
        if (!cancelled) {
          hydratedFromUserRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loaded, isAuthenticated]);

  const persistSettings = async (nextPartialSettings) => {
    if (!isAuthenticated) {
      return null;
    }

    const response = await api.updateUserSettings(nextPartialSettings);

    if (user) {
      updateUser({
        ...user,
        settings: {
          ...(user.settings || {}),
          ...(response?.settings || nextPartialSettings),
        },
      });
    }

    return response;
  };

  const setThemeMode = async (nextThemeMode) => {
    const safeThemeMode = normalizeThemeMode(nextThemeMode);
    const previousThemeMode = themeMode;
    dispatch({ type: "set-theme-mode", payload: safeThemeMode });

    try {
      return await persistSettings({
        theme: safeThemeMode,
        themeMode: safeThemeMode,
        globalStyle: activeGlobalStyle,
        themeFlavor: activeGlobalStyle,
        brandSkin: activeGlobalStyle,
      });
    } catch (error) {
      dispatch({ type: "set-theme-mode", payload: previousThemeMode });
      throw error;
    }
  };

  const setThemeFlavor = async (nextGlobalStyle) => {
    const safeGlobalStyle = normalizeGlobalStyle(nextGlobalStyle);
    const previousGlobalStyle = activeGlobalStyle;
    dispatch({ type: "set-theme-flavor", payload: safeGlobalStyle });

    try {
      return await persistSettings({
        globalStyle: safeGlobalStyle,
        themeFlavor: safeGlobalStyle,
        brandSkin: safeGlobalStyle,
      });
    } catch (error) {
      dispatch({ type: "set-theme-flavor", payload: previousGlobalStyle });
      throw error;
    }
  };

  const setAccentColor = async (nextAccentColor) => {
    const safeAccentColor = normalizeAccentColor(nextAccentColor);
    const previousAccentColor = accentColor;
    dispatch({ type: "set-accent", payload: safeAccentColor });

    try {
      return await persistSettings({ accentColor: safeAccentColor });
    } catch (error) {
      dispatch({ type: "set-accent", payload: previousAccentColor });
      throw error;
    }
  };

  const value = {
    theme: themeMode,
    themeMode,
    resolvedTheme,
    appliedAccentColor,
    globalStyle: activeGlobalStyle,
    themeFlavor: activeGlobalStyle,
    effectiveThemeFlavor: activeGlobalStyle,
    brandSkin: activeGlobalStyle,
    accentColor,
    resolvedAccentColor: appliedAccentColor,
    nativeAccentColor,
    setTheme: setThemeMode,
    setThemeMode,
    setThemeFlavor,
    setBrandSkin: setThemeFlavor,
    setAccentColor,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeContext;
