import { useState } from "react";

const INITIAL_VALUES = {
  name: "",
  description: "",
  icon: "",
  visibility: "public",
  joinMode: "request",
};

function CreateSpaceModal({ isOpen, isSubmitting, onClose, onSubmit }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!values.name.trim()) {
      setError("Give the space a name before opening it to the network.");
      return;
    }

    setError("");
    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      icon: values.icon.trim(),
      visibility: values.visibility,
      joinMode: values.joinMode,
    });
    setValues(INITIAL_VALUES);
  }

  return (
    <div
      aria-labelledby="community-create-space-title"
      aria-modal="true"
      className="community-modal"
      role="dialog"
    >
      <div className="community-modal__scrim" onClick={onClose} role="presentation" />
      <form className="community-modal__panel" onSubmit={handleSubmit}>
        <div className="community-modal__header">
          <div>
            <span className="community-eyebrow">Launch A Space</span>
            <h3 id="community-create-space-title">Create a new network space</h3>
          </div>
          <button
            className="community-button community-button--ghost"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <label className="community-field">
          <span>Name</span>
          <input
            name="name"
            onChange={handleChange}
            placeholder="Worldbuilders Circle"
            type="text"
            value={values.name}
          />
        </label>

        <label className="community-field">
          <span>Description</span>
          <textarea
            name="description"
            onChange={handleChange}
            placeholder="What kind of people and ideas belong here?"
            rows="4"
            value={values.description}
          />
        </label>

        <div className="community-modal__grid">
          <label className="community-field">
            <span>Icon</span>
            <input
              name="icon"
              onChange={handleChange}
              placeholder="W"
              type="text"
              value={values.icon}
            />
          </label>

          <label className="community-field">
            <span>Visibility</span>
            <select name="visibility" onChange={handleChange} value={values.visibility}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
        </div>

        <label className="community-field">
          <span>Join mode</span>
          <select name="joinMode" onChange={handleChange} value={values.joinMode}>
            <option value="request">Request</option>
            <option value="open">Open</option>
            <option value="invite">Invite</option>
          </select>
        </label>

        {error ? <p className="community-form-error">{error}</p> : null}

        <div className="community-modal__actions">
          <button
            className="community-button community-button--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="community-button community-button--primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating..." : "Create Space"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateSpaceModal;
