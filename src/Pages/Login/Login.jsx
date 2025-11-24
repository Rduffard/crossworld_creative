import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    login({ email });
    navigate("/dashboard");
  }

  return (
    <main className="login__page">
      {/* Landing state: just the background + Enter button */}
      {!showLoginModal && (
        <button
          type="button"
          className="login__enter-button"
          onClick={() => setShowLoginModal(true)}
        >
          Enter
        </button>
      )}

      {/* Modal overlay with the login card */}
      {showLoginModal && (
        <div className="login__overlay">
          <section className="login__card">
            <button
              type="button"
              className="login__close"
              onClick={() => setShowLoginModal(false)}
            >
              ✕
            </button>

            <h1 className="login__title">Welcome to Crossworld Creative</h1>
            <p className="login__subtitle">
              Log in to access your projects, music, games, and more.
            </p>

            <form className="login__form" onSubmit={handleSubmit}>
              <label className="login__label">
                Email
                <input
                  className="login__input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                />
              </label>

              <button className="login__button" type="submit">
                Log In
              </button>
            </form>

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
          </section>
        </div>
      )}
    </main>
  );
}

export default Login;
