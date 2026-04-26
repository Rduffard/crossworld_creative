import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App/App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import {
  DEFAULT_THEME,
  STORAGE_KEY,
  applyThemeToDocument,
  getSystemThemeMode,
  getThemeCssVariables,
  parseStoredThemePreferences,
  resolveThemeMode,
} from "./context/themeConfig.js";
import "./index.css";

const initialThemePreferences =
  typeof window !== "undefined"
    ? parseStoredThemePreferences(window.localStorage.getItem(STORAGE_KEY))
    : { themeMode: DEFAULT_THEME, accentColor: "" };

const initialSystemTheme = getSystemThemeMode();
const initialResolvedTheme = resolveThemeMode(
  initialThemePreferences.themeMode,
  initialSystemTheme
);

if (typeof document !== "undefined") {
  applyThemeToDocument(
    document.documentElement,
    {
      themeMode: initialThemePreferences.themeMode,
      resolvedTheme: initialResolvedTheme,
      globalStyle: initialThemePreferences.globalStyle,
      cssVariables: getThemeCssVariables({
        themeMode: initialThemePreferences.themeMode,
        resolvedTheme: initialResolvedTheme,
        globalStyle: initialThemePreferences.globalStyle,
        accentOverride: initialThemePreferences.accentColor,
      }),
    }
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
