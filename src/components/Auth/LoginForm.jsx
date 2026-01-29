import { useEffect, useState } from "react";
import "./LoginForm.css";

function LoginForm({
  emailInputRef,
  isAuthenticated,
  onClose,
  onSubmit,
  onGuest,
  onGoDashboard,
  onRequestInvite,
  title = "Welcome back",
  subtitle = "Log in for full access, or continue as a guest to explore the demo.",
  submitLabel = "Log In",
  guestLabel = "Continue as Guest (Demo)",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Clear sensitive data when unmounting
  useEffect(() => {
    return () => {
      setPassword("");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit({ email, password });
  };

  return (
    <div className="login__card">
      <button
        type="button"
        className="login__close"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>

      <h1 className="login__title">{title}</h1>
      <p className="login__subtitle">{subtitle}</p>

      <form className="login__form" onSubmit={handleSubmit}>
        <label className="login__label">
          Email
          <input
            ref={emailInputRef}
            className="login__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="login__label">
          Password
          <input
            className="login__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <button className="login__button" type="submit">
          {submitLabel}
        </button>

        <div className="login__invite">
          <span className="login__invite-text">Need access?</span>
          <button
            type="button"
            className="login__invite-link"
            onClick={onRequestInvite}
          >
            Request invite
          </button>
        </div>
      </form>

      <div className="login__or">
        <span className="login__or-line" />
        <span className="login__or-text">or</span>
        <span className="login__or-line" />
      </div>

      <button type="button" className="login__guest-button" onClick={onGuest}>
        {guestLabel}
      </button>

      {isAuthenticated && (
        <p className="login__already-text">
          You&apos;re already logged in —{" "}
          <button
            type="button"
            className="login__link-button"
            onClick={onGoDashboard}
          >
            go to your dashboard
          </button>
        </p>
      )}
    </div>
  );
}

export default LoginForm;
