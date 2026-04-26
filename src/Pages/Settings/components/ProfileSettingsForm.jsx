import { useEffect, useId, useRef, useState } from "react";

const landingAppOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "squash", label: "Squash" },
  { value: "wtwr", label: "WTWR" },
  { value: "archipelago", label: "Archipelago" },
];

function ProfileSettingsForm({ initialValues, onSave, disabled = false }) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const isDirty =
    values.profileDisplayName !== initialValues.profileDisplayName ||
    values.avatarUrl !== initialValues.avatarUrl ||
    values.defaultLandingApp !== initialValues.defaultLandingApp;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      await onSave({
        profileDisplayName: values.profileDisplayName,
        avatarUrl: values.avatarUrl,
        defaultLandingApp: values.defaultLandingApp,
      });
      setStatus("success");
      setMessage("Profile settings saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save profile settings.");
    }
  };

  const selectedLandingApp =
    landingAppOptions.find((option) => option.value === values.defaultLandingApp) ||
    landingAppOptions[0];

  const handleLandingAppSelect = (nextApp) => {
    setValues((currentValues) => ({
      ...currentValues,
      defaultLandingApp: nextApp,
    }));
    setMenuOpen(false);
  };

  return (
    <article className="settings-card settings-card--span-2 settings-card--profile">
      <div className="settings-card__header">
        <div>
          <p className="settings-card__eyebrow">Profile</p>
          <h2>Shared profile settings</h2>
        </div>
      </div>

      <form className="settings-form settings-form--profile" onSubmit={handleSubmit}>
        <div className="settings-inline-fields settings-inline-fields--profile">
          <label className="settings-field">
            <span>Display name</span>
            <input
              className="settings-input"
              type="text"
              name="profileDisplayName"
              value={values.profileDisplayName}
              onChange={handleChange}
              placeholder="How Crossworld apps should address you"
              disabled={disabled || status === "saving"}
            />
          </label>

          <label className="settings-field">
            <span>Avatar URL</span>
            <input
              className="settings-input"
              type="url"
              name="avatarUrl"
              value={values.avatarUrl}
              onChange={handleChange}
              placeholder="https://example.com/avatar.png"
              disabled={disabled || status === "saving"}
            />
          </label>

          <div className="settings-field settings-field--dropdown" ref={dropdownRef}>
            <span>Default landing app</span>
            <button
              type="button"
              className={`settings-selectbox ${menuOpen ? "settings-selectbox--open" : ""}`}
              onClick={() => setMenuOpen((open) => !open)}
              disabled={disabled || status === "saving"}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              aria-controls={menuId}
            >
              <span className="settings-selectbox__value">
                {selectedLandingApp.label}
              </span>
              <span className="settings-selectbox__caret" aria-hidden="true">
                v
              </span>
            </button>

            {menuOpen && (
              <div
                id={menuId}
                className="settings-selectbox__menu"
                role="listbox"
                aria-label="Default landing app"
              >
                {landingAppOptions.map((option) => {
                  const isSelected = option.value === values.defaultLandingApp;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`settings-selectbox__option ${
                        isSelected ? "settings-selectbox__option--selected" : ""
                      }`}
                      onClick={() => handleLandingAppSelect(option.value)}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <span
                          className="settings-selectbox__option-check"
                          aria-hidden="true"
                        >
                          OK
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="settings-form__footer settings-form__footer--compact-actions">
          <p className={`settings-feedback settings-feedback--${status}`}>
            {status === "saving" ? "Saving profile settings..." : message}
          </p>
          <button
            className="settings-button"
            type="submit"
            disabled={disabled || status === "saving" || !isDirty}
          >
            {status === "saving" ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </article>
  );
}

export default ProfileSettingsForm;
