import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import logo from "../../assets/logo-noBG.png";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const emailInputRef = useRef(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ESC closes the modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setShowLoginModal(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Focus email when modal opens
  useEffect(() => {
    if (showLoginModal) {
      setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, [showLoginModal]);

  // Clear password when modal closes
  useEffect(() => {
    if (!showLoginModal) setPassword("");
  }, [showLoginModal]);

  async function handleSubmit(e) {
    e.preventDefault();
    await login({ email, password });
    navigate("/dashboard", { replace: true });
  }

  return (
    <main
      className={`login__page ${showLoginModal ? "login__page--active" : ""}`}
    >
      {/* LEFT: brand + links */}
      <aside className="login__left">
        {/* ✅ WRAPPER that keeps logo/links/button aligned together */}
        <div className="login__left-stack">
          <div className="login__brand">
            <img
              className="login__logo"
              src={logo}
              alt="Crossworld Creative"
              draggable="false"
            />
            <p className="login__tagline">Reality is just the first draft.</p>
          </div>

          <nav className="login__links">
            <a
              className="login__link"
              href="https://github.com/CrossworldCreative"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="login__link"
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
            <a className="login__link" href="mailto:youremail@example.com">
              Contact
            </a>
          </nav>

          {!showLoginModal && (
            <button
              type="button"
              className="login__enter-button"
              onClick={() => setShowLoginModal(true)}
            >
              Enter
            </button>
          )}
        </div>
      </aside>

      {/* MIDDLE: login + guest */}
      <section className="login__center" aria-hidden={!showLoginModal}>
        <div className="login__card">
          <button
            type="button"
            className="login__close"
            onClick={() => setShowLoginModal(false)}
            aria-label="Close"
          >
            ✕
          </button>

          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">
            Log in for full access, or continue as a guest to explore the demo.
          </p>

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
              Log In
            </button>
          </form>

          <div className="login__or">
            <span className="login__or-line" />
            <span className="login__or-text">or</span>
            <span className="login__or-line" />
          </div>

          <button
            type="button"
            className="login__button login__button--ghost"
            onClick={() => navigate("/dashboard?demo=true")}
          >
            Continue as Guest (Demo)
          </button>

          {isAuthenticated && (
            <p className="login__already-text">
              You&apos;re already logged in —{" "}
              <button
                type="button"
                className="login__link-button"
                onClick={() => navigate("/dashboard")}
              >
                go to your dashboard
              </button>
            </p>
          )}
        </div>
      </section>

      {/* RIGHT: tiers + updates (info only) */}
      <aside className="login__right" aria-hidden={!showLoginModal}>
        <div className="login__info">
          <h2 className="login__info-title">Access tiers</h2>

          <div className="login__tiers">
            <div className="login__tier">
              <div className="login__tier-head">
                <h3 className="login__tier-title">Guest (Demo)</h3>
                <span className="login__badge">Read-only</span>
              </div>
              <ul className="login__tier-list">
                <li>Explore the UI, routing, and components</li>
                <li>View curated sample projects and data</li>
                <li>No uploads, saving, or paid API calls</li>
              </ul>
            </div>

            <div className="login__tier">
              <div className="login__tier-head">
                <h3 className="login__tier-title">Invite Access</h3>
                <span className="login__badge login__badge--gold">Full</span>
              </div>
              <ul className="login__tier-list">
                <li>Full app functionality + persistent data</li>
                <li>Uploads enabled (limited while in early access)</li>
                <li>Access to in-progress backend features</li>
              </ul>
            </div>

            <div className="login__tier">
              <div className="login__tier-head">
                <h3 className="login__tier-title">Recruiter Pass</h3>
                <span className="login__badge login__badge--outline">
                  Optional
                </span>
              </div>
              <ul className="login__tier-list">
                <li>Short-term access link (if needed)</li>
                <li>Stable review dataset + rate limits</li>
                <li>Designed to avoid cost spikes</li>
              </ul>
            </div>
          </div>

          <div className="login__divider" />

          <h2 className="login__info-title">Current updates</h2>
          <ul className="login__info-list">
            <li>Crossworld: demo mode + portfolio polish</li>
            <li>Squash: Express backend + storage pipeline</li>
            <li>Sanguine Archipelago: tooling + worldbuilding</li>
            <li>Taxi Cop: audiobook + print release planning</li>
          </ul>

          <div className="login__divider" />

          <p className="login__info-text">
            Invite access is limited while hosting + storage are being
            finalized.
          </p>
        </div>
      </aside>
    </main>
  );
}

export default Login;
