import { useEffect, useState } from "react";

function NotificationSettingsForm({
  initialValues,
  onSave,
  disabled = false,
}) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const isDirty =
    values.emailNotifications !== initialValues.emailNotifications ||
    values.productUpdates !== initialValues.productUpdates;

  const handleChange = (event) => {
    const { name, checked } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: checked,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      await onSave({
        emailNotifications: values.emailNotifications,
        productUpdates: values.productUpdates,
      });
      setStatus("success");
      setMessage("Notification preferences saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save notification preferences.");
    }
  };

  return (
    <article className="settings-card">
      <div className="settings-card__header">
        <div>
          <p className="settings-card__eyebrow">Notifications</p>
          <h2>Email preferences</h2>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="settings-toggle">
          <input
            type="checkbox"
            name="emailNotifications"
            checked={values.emailNotifications}
            onChange={handleChange}
            disabled={disabled || status === "saving"}
          />
          <span>
            <strong>Email notifications</strong>
            <small>Receive account and activity-related emails.</small>
          </span>
        </label>

        <label className="settings-toggle">
          <input
            type="checkbox"
            name="productUpdates"
            checked={values.productUpdates}
            onChange={handleChange}
            disabled={disabled || status === "saving"}
          />
          <span>
            <strong>Product updates</strong>
            <small>Hear about new Crossworld features and launches.</small>
          </span>
        </label>

        <div className="settings-form__footer">
          <p className={`settings-feedback settings-feedback--${status}`}>
            {status === "saving" ? "Saving notification settings..." : message}
          </p>
          <button
            className="settings-button"
            type="submit"
            disabled={disabled || status === "saving" || !isDirty}
          >
            {status === "saving" ? "Saving..." : "Save notifications"}
          </button>
        </div>
      </form>
    </article>
  );
}

export default NotificationSettingsForm;
