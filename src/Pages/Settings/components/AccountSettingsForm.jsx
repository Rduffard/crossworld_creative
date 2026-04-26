import { useEffect, useState } from "react";

function AccountSettingsForm({ initialValues, onSave, disabled = false }) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const isDirty =
    values.name !== initialValues.name || values.email !== initialValues.email;

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
        name: values.name,
        email: values.email,
      });
      setStatus("success");
      setMessage("Account details updated.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to update account details.");
    }
  };

  return (
    <article className="settings-card">
      <div className="settings-card__header">
        <div>
          <p className="settings-card__eyebrow">Account</p>
          <h2>Name and email</h2>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="settings-field">
          <span>Account name</span>
          <input
            className="settings-input"
            type="text"
            name="name"
            value={values.name}
            onChange={handleChange}
            placeholder="Your Crossworld account name"
            disabled={disabled || status === "saving"}
            required
          />
        </label>

        <label className="settings-field">
          <span>Email</span>
          <input
            className="settings-input"
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            placeholder="you@example.com"
            disabled={disabled || status === "saving"}
            required
          />
        </label>

        <div className="settings-form__footer">
          <p className={`settings-feedback settings-feedback--${status}`}>
            {status === "saving" ? "Saving account details..." : message}
          </p>
          <button
            className="settings-button"
            type="submit"
            disabled={disabled || status === "saving" || !isDirty}
          >
            {status === "saving" ? "Saving..." : "Save account"}
          </button>
        </div>
      </form>
    </article>
  );
}

export default AccountSettingsForm;
