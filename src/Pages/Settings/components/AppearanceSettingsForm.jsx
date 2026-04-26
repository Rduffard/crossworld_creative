import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ACCENT,
  DEFAULT_ACCENT_OVERRIDE,
  GLOBAL_THEME,
  SYSTEM_THEME,
  applyThemeToDocument,
  getGlobalStyleMeta,
  getSystemThemeMode,
  getThemeCssVariables,
  getThemeModeMeta,
  globalStyleOptions,
  resolveThemeMode,
  themeModeOptions,
} from "../../../context/themeConfig.js";
import { useTheme } from "../../../hooks/useTheme.js";

const accentPresets = [
  "#e5be6e",
  "#d7a44e",
  "#6d77ff",
  "#46c4aa",
  "#ef7d57",
  "#f45b69",
  "#8b62d9",
];

const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value);

function AppearanceSettingsForm({ disabled = false }) {
  const {
    themeMode,
    globalStyle,
    accentColor,
    resolvedTheme,
    setThemeMode,
    setThemeFlavor,
    setAccentColor,
  } = useTheme();
  const [values, setValues] = useState({
    themeMode,
    globalStyle,
    accentColor,
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const selectedThemeOption =
    themeModeOptions.find((option) => option.value === values.themeMode) ||
    themeModeOptions[0];
  const selectedGlobalStyleMeta = getGlobalStyleMeta(values.globalStyle);
  const previewSystemTheme = useMemo(() => {
    if (values.themeMode !== SYSTEM_THEME) {
      return resolvedTheme;
    }

    return getSystemThemeMode();
  }, [resolvedTheme, values.themeMode]);
  const previewResolvedTheme = resolveThemeMode(values.themeMode, previewSystemTheme);
  const previewCssVariables = useMemo(
    () =>
      getThemeCssVariables({
        themeMode: values.themeMode,
        resolvedTheme: previewResolvedTheme,
        globalStyle: values.globalStyle,
        accentOverride: values.accentColor,
      }),
    [
      previewResolvedTheme,
      values.accentColor,
      values.globalStyle,
      values.themeMode,
    ]
  );
  const activeModeMeta = getThemeModeMeta(
    values.themeMode === SYSTEM_THEME ? previewResolvedTheme : values.themeMode
  );
  const nextAccentColor =
    values.accentColor ||
    (values.themeMode === GLOBAL_THEME
      ? selectedGlobalStyleMeta.accent
      : activeModeMeta.accent) ||
    DEFAULT_ACCENT;
  const isDirty =
    values.themeMode !== themeMode ||
    values.globalStyle !== globalStyle ||
    values.accentColor !== accentColor;
  const colorInputValue = isHexColor(nextAccentColor)
    ? nextAccentColor
    : DEFAULT_ACCENT;
  const isGlobalMode = values.themeMode === GLOBAL_THEME;
  const selectedAccentInfo = values.accentColor
    ? "Accent override active across Crossworld."
    : isGlobalMode
      ? `Using ${selectedGlobalStyleMeta.label}'s native accent.`
      : "Using the selected theme's native accent.";
  const visibleFeedback = useMemo(() => {
    if (status === "saving") {
      return { tone: "saving", text: "Saving appearance..." };
    }

    if (status === "error") {
      return { tone: "error", text: message };
    }

    if (status === "success" && !isDirty) {
      return { tone: "success", text: message };
    }

    return null;
  }, [isDirty, message, status]);

  useEffect(() => {
    applyThemeToDocument(document.documentElement, {
      themeMode: values.themeMode,
      resolvedTheme: previewResolvedTheme,
      globalStyle: values.globalStyle,
      cssVariables: previewCssVariables,
    });

    return () => {
      applyThemeToDocument(document.documentElement, {
        themeMode,
        resolvedTheme,
        globalStyle,
        cssVariables: getThemeCssVariables({
          themeMode,
          resolvedTheme,
          globalStyle,
          accentOverride: accentColor,
        }),
      });
    };
  }, [
    accentColor,
    globalStyle,
    previewCssVariables,
    previewResolvedTheme,
    resolvedTheme,
    themeMode,
    values.globalStyle,
    values.themeMode,
  ]);

  const updateValues = (updater) => {
    setStatus("idle");
    setMessage("");
    setValues((currentValues) =>
      typeof updater === "function"
        ? updater(currentValues)
        : { ...currentValues, ...updater }
    );
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    updateValues({ [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      if (values.themeMode !== themeMode) {
        await setThemeMode(values.themeMode);
      }

      if (values.globalStyle !== globalStyle) {
        await setThemeFlavor(values.globalStyle);
      }

      if (values.accentColor !== accentColor) {
        await setAccentColor(values.accentColor);
      }

      setStatus("success");
      setMessage("Appearance settings saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save appearance settings.");
    }
  };

  return (
    <article className="settings-card settings-card--appearance">
      <form className="settings-appearance" onSubmit={handleSubmit}>
        <div className="settings-appearance__main">
          <div className="settings-card__header settings-card__header--appearance">
            <div>
              <p className="settings-card__eyebrow">Appearance</p>
              <h2>Theme and accent</h2>
              <p className="settings-card__copy settings-card__copy--lead">
                One centralized theme system controls the whole Crossworld experience.
              </p>
            </div>
          </div>

          <section className="settings-field settings-field--mode">
            <div className="settings-field__title-row">
              <span>Theme mode</span>
              <span
                className="settings-help-dot"
                title={selectedThemeOption.description}
                aria-hidden="true"
              >
                ?
              </span>
            </div>
            <div
              className="settings-theme-mode-pills"
              role="radiogroup"
              aria-label="Theme mode"
            >
              {themeModeOptions.map((option) => {
                const isSelected = values.themeMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`settings-theme-pill ${
                      isSelected ? "settings-theme-pill--selected" : ""
                    }`}
                    onClick={() =>
                      updateValues((currentValues) => ({
                        ...currentValues,
                        themeMode: option.value,
                      }))
                    }
                    disabled={disabled || status === "saving"}
                    title={option.description}
                  >
                    <span className="settings-theme-pill__label">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="settings-theme-mode-helper" role="status">
              {selectedThemeOption.description}
            </div>
          </section>

          {isGlobalMode ? (
            <section className="settings-field">
              <div className="settings-field__title-stack">
                <div className="settings-field__title-row">
                  <span>Choose global style</span>
                </div>
                <p className="settings-field__helper">
                  Apply one Crossworld app identity across the entire site shell.
                </p>
              </div>

              <div className="settings-flavor-grid" role="radiogroup" aria-label="Global style presets">
                {globalStyleOptions.map((option) => {
                  const isSelected = values.globalStyle === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`settings-theme-option settings-theme-option--flavor ${
                        isSelected ? "settings-theme-option--selected" : ""
                      }`}
                      style={{ "--settings-style-accent": option.accent }}
                      onClick={() =>
                        updateValues((currentValues) => ({
                          ...currentValues,
                          globalStyle: option.value,
                        }))
                      }
                      disabled={disabled || status === "saving"}
                    >
                      <div className="settings-theme-option__media">
                        <span className="settings-theme-option__icon" aria-hidden="true">
                          {option.glyph}
                        </span>
                        {isSelected ? (
                          <span className="settings-theme-option__check" aria-hidden="true">
                            OK
                          </span>
                        ) : null}
                      </div>
                      <span className="settings-theme-option__label">{option.label}</span>
                      <span className="settings-theme-option__description">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="settings-field">
            <div className="settings-field__title-stack">
              <div className="settings-field__title-row">
                <span>Accent color</span>
              </div>
              <p className="settings-field__helper">
                Optional override for the shared Crossworld accent.
              </p>
            </div>

            <div className="settings-accent-controls">
              <input
                className="settings-color"
                type="color"
                name="accentColor"
                value={colorInputValue}
                onChange={handleChange}
                disabled={disabled || status === "saving"}
                aria-label="Select accent color"
              />
              <input
                className="settings-input"
                type="text"
                name="accentColor"
                value={nextAccentColor}
                onChange={handleChange}
                placeholder="#e5be6e"
                disabled={disabled || status === "saving"}
              />
            </div>
            <p className="settings-field__helper">{selectedAccentInfo}</p>
            <div className="settings-preset-list" role="list" aria-label="Accent presets">
              <button
                type="button"
                className={`settings-preset settings-preset--default ${
                  !values.accentColor ? "settings-preset--active" : ""
                }`}
                onClick={() =>
                  updateValues((currentValues) => ({
                    ...currentValues,
                    accentColor: DEFAULT_ACCENT_OVERRIDE,
                  }))
                }
                disabled={disabled || status === "saving"}
                aria-label="Use the theme's native accent"
              >
                <span className="settings-preset__label">Default</span>
              </button>
              {accentPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`settings-preset ${
                    values.accentColor === preset ? "settings-preset--active" : ""
                  }`}
                  style={{ "--settings-accent": preset }}
                  onClick={() =>
                    updateValues((currentValues) => ({
                      ...currentValues,
                      accentColor: preset,
                    }))
                  }
                  disabled={disabled || status === "saving"}
                  aria-label={`Select accent ${preset}`}
                >
                  <span className="settings-preset__swatch" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="settings-appearance__sidebar">
          <section className="settings-info-card">
            <div className="settings-info-card__header">
              <h3>{isGlobalMode ? selectedGlobalStyleMeta.label : selectedThemeOption.label}</h3>
            </div>
            <div className="settings-info-list">
              <div className="settings-info-item">
                <span className="settings-info-item__icon" aria-hidden="true">
                  +
                </span>
                <p>
                  {isGlobalMode
                    ? selectedGlobalStyleMeta.description
                    : activeModeMeta.summaryBody}
                </p>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-item__icon" aria-hidden="true">
                  +
                </span>
                <p>{selectedAccentInfo}</p>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-item__icon" aria-hidden="true">
                  +
                </span>
                <p>
                  Preview uses the same shared tokens that drive dashboard, community,
                  profile, navbar, modals, and settings.
                </p>
              </div>
            </div>
          </section>

          <div className="settings-save-rail">
            <button
              className="settings-button settings-button--appearance"
              type="submit"
              disabled={disabled || status === "saving" || !isDirty}
            >
              {status === "saving" ? "Saving..." : "Save appearance"}
            </button>
            <p className="settings-save-rail__caption">Changes apply across Crossworld.</p>
            {visibleFeedback ? (
              <p className={`settings-feedback settings-feedback--${visibleFeedback.tone}`}>
                {visibleFeedback.text}
              </p>
            ) : null}
          </div>
        </aside>
      </form>
    </article>
  );
}

export default AppearanceSettingsForm;
