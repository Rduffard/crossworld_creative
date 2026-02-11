import { useState } from "react";
import "./SignupForm.css";

function SignupForm({
  onSubmit,
  onSwitchMode,
  onClose,
  title = "Create Account",
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit?.({ name, email, password });
  }

  return (
    <div className="auth">
      {onClose && (
        <button
          type="button"
          className="auth__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      )}

      <h2 className="auth__title">{title}</h2>

      <form className="auth__form" onSubmit={handleSubmit}>
        <label className="auth__field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="auth__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="auth__field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className="auth__submit">
          Create Account
        </button>
      </form>

      <p className="auth__switch">
        Already have an account?{" "}
        <button
          type="button"
          className="auth__link"
          onClick={() => onSwitchMode?.("login")}
        >
          Log in
        </button>
      </p>
    </div>
  );
}

export default SignupForm;
