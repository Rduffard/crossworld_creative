import { useState } from "react";

const initialValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function SecuritySettingsForm({ onSave, disabled = false }) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const hasValues =
    values.currentPassword || values.newPassword || values.confirmPassword;

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
      await onSave(values);
      setValues(initialValues);
      setStatus("success");
      setMessage("Password changed successfully.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to change your password.");
    }
  };

  return (
    <article className="settings-card">
      <div className="settings-card__header">
        <div>
          <p className="settings-card__eyebrow">Security</p>
          <h2>Password and protection</h2>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="settings-field">
          <span>Current password</span>
          <input
            className="settings-input"
            type="password"
            name="currentPassword"
            value={values.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={disabled || status === "saving"}
            required
          />
        </label>

        <label className="settings-field">
          <span>New password</span>
          <input
            className="settings-input"
            type="password"
            name="newPassword"
            value={values.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={disabled || status === "saving"}
            required
          />
        </label>

        <label className="settings-field">
          <span>Confirm new password</span>
          <input
            className="settings-input"
            type="password"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={disabled || status === "saving"}
            required
          />
        </label>

        <div className="settings-disabled-row" aria-disabled="true">
          <div>
            <strong>Two-factor authentication</strong>
            <p>Coming later for Crossworld accounts.</p>
          </div>
          <button className="settings-button settings-button--ghost" disabled>
            Coming later
          </button>
        </div>

        <div className="settings-form__footer">
          <p className={`settings-feedback settings-feedback--${status}`}>
            {status === "saving" ? "Updating password..." : message}
          </p>
          <button
            className="settings-button"
            type="submit"
            disabled={disabled || status === "saving" || !hasValues}
          >
            {status === "saving" ? "Saving..." : "Change password"}
          </button>
        </div>
      </form>
    </article>
  );
}

export default SecuritySettingsForm;
