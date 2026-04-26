import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../utils/api.js";
import ProfileSettingsForm from "./components/ProfileSettingsForm.jsx";
import AccountSecuritySettingsForm from "./components/AccountSecuritySettingsForm.jsx";
import AppearanceSettingsForm from "./components/AppearanceSettingsForm.jsx";
import NotificationSettingsForm from "./components/NotificationSettingsForm.jsx";
import { getUserDisplayName } from "../../utils/userDisplay.js";
import { useTheme } from "../../hooks/useTheme.js";
import {
  DEFAULT_ACCENT_OVERRIDE,
  DEFAULT_GLOBAL_STYLE,
  DEFAULT_THEME,
  getGlobalStyleMeta,
  getThemeModeMeta,
  themeModeOptions,
} from "../../context/themeConfig.js";
import "./Settings.css";

const defaultSettings = {
  profileDisplayName: "",
  avatarUrl: "",
  theme: DEFAULT_THEME,
  brandSkin: DEFAULT_GLOBAL_STYLE,
  globalStyle: DEFAULT_GLOBAL_STYLE,
  accentColor: DEFAULT_ACCENT_OVERRIDE,
  emailNotifications: true,
  productUpdates: true,
  defaultLandingApp: "dashboard",
};

function SettingsPage() {
  const { user, loaded, updateUser } = useAuth();
  const { themeMode, globalStyle, accentColor } = useTheme();
  const displayName = getUserDisplayName(user);
  const [settings, setSettings] = useState(defaultSettings);
  const [pageStatus, setPageStatus] = useState("loading");
  const activeThemeMeta = getThemeModeMeta(themeMode);
  const activeThemeLabel =
    themeModeOptions.find((option) => option.value === themeMode)?.label ||
    activeThemeMeta.summaryTitle;
  const activeGlobalStyleMeta = getGlobalStyleMeta(globalStyle);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;

    const loadSettings = async () => {
      setPageStatus("loading");

      try {
        const data = await api.getUserSettings();

        if (!cancelled) {
          setSettings({ ...defaultSettings, ...(data?.settings || {}) });
          setPageStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setPageStatus("error");
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [loaded]);

  const saveSettingsSection = async (partialSettings) => {
    const response = await api.updateUserSettings(partialSettings);
    const nextSettings = { ...defaultSettings, ...(response?.settings || {}) };
    setSettings(nextSettings);

    if (
      user &&
      Object.prototype.hasOwnProperty.call(partialSettings, "profileDisplayName")
    ) {
      updateUser({
        ...user,
        displayName: response?.displayName || getUserDisplayName({
          ...user,
          displayName: partialSettings.profileDisplayName,
          settings: {
            ...(user.settings || {}),
            ...nextSettings,
          },
        }),
        settings: {
          ...(user.settings || {}),
          ...nextSettings,
        },
      });
    }

    return nextSettings;
  };

  const saveAccountSection = async (accountValues) => {
    const updatedUser = await api.updateAccount(accountValues);
    updateUser(updatedUser);
    return updatedUser;
  };

  const saveSecuritySection = async (passwordValues) => {
    return api.updatePassword(passwordValues);
  };

  const statusLabel =
    pageStatus === "loading"
      ? "Loading settings..."
      : pageStatus === "ready"
        ? "Editable settings ready"
        : "Unable to load settings";

  return (
    <main className="settings-page">
      <div className="settings-page__inner">
        <header className="settings-hero">
          <div>
            <p className="settings-hero__eyebrow">Crossworld account</p>
            <h1 className="settings-hero__title">Settings</h1>
            <p className="settings-hero__subtitle">
              Manage shared identity, appearance, and notification preferences
              for every Crossworld app from one place.
            </p>
          </div>

          <div className="settings-hero__summary">
            <div className="settings-chip">
              Signed in as {user ? displayName : "Crossworld member"}
            </div>
            <div className="settings-chip settings-chip--accent">
              Theme: {themeMode === "global" ? `${activeThemeLabel} / ${activeGlobalStyleMeta.label}` : activeThemeLabel}
            </div>
            <div className="settings-chip settings-chip--muted">
              {statusLabel}
            </div>
          </div>
        </header>

        {pageStatus === "error" ? (
          <section className="settings-empty-state">
            <h2>Settings are unavailable right now</h2>
            <p>
              We could not load your saved preferences. Refresh the page and try
              again.
            </p>
          </section>
        ) : (
          <div className="settings-sections" aria-label="Editable settings">
            <section className="settings-section settings-section--single">
              <ProfileSettingsForm
                initialValues={{
                  profileDisplayName:
                    settings.profileDisplayName || user?.displayName || "",
                  avatarUrl: settings.avatarUrl,
                  defaultLandingApp: settings.defaultLandingApp,
                }}
                onSave={saveSettingsSection}
                disabled={pageStatus !== "ready"}
              />
            </section>

            <section className="settings-section settings-section--single">
              <AccountSecuritySettingsForm
                key={`${user?.name || ""}-${user?.email || ""}`}
                initialValues={{
                  name: user?.name || "",
                  email: user?.email || "",
                }}
                onSaveAccount={saveAccountSection}
                onSavePassword={saveSecuritySection}
                disabled={!loaded}
              />
            </section>

            <section className="settings-section settings-section--single">
              <AppearanceSettingsForm
                key={`${themeMode}-${globalStyle}-${accentColor}`}
                disabled={pageStatus !== "ready"}
              />
            </section>

            <section className="settings-section settings-section--grid">
              <NotificationSettingsForm
                initialValues={{
                  emailNotifications: settings.emailNotifications,
                  productUpdates: settings.productUpdates,
                }}
                onSave={saveSettingsSection}
                disabled={pageStatus !== "ready"}
              />

              <article className="settings-card settings-card--placeholder">
                <div className="settings-card__header">
                  <div>
                    <p className="settings-card__eyebrow">Connected Apps</p>
                    <h2>App links</h2>
                  </div>
                </div>
                <p className="settings-card__copy">
                  Shared settings are live. Per-app connection controls and sync
                  visibility can land here in a later pass.
                </p>
                <span className="settings-pill">Placeholder for v1</span>
              </article>
            </section>

            <section className="settings-section settings-section--single">
              <article className="settings-card settings-card--placeholder">
                <div className="settings-card__header">
                  <div>
                    <p className="settings-card__eyebrow">Danger Zone</p>
                    <h2>High-risk actions</h2>
                  </div>
                </div>
                <p className="settings-card__copy">
                  Account deletion, export, and deeper security actions are
                  intentionally deferred until the settings architecture expands.
                </p>
                <span className="settings-pill">Coming later</span>
              </article>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default SettingsPage;
