import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login({ onLogin, isLoggedIn }) {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    onLogin();
    navigate("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-title">Welcome to Crossworld Creative</h1>
        <p className="login-subtitle">
          Log in to access your projects, portfolio, and tools.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            Email
            <input
              className="login-input"
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="login-label">
            Password
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              required
            />
          </label>

          <button className="login-button" type="submit">
            Log In
          </button>
        </form>

        {isLoggedIn && (
          <p className="login-already-text">
            You&apos;re already logged in —{" "}
            <button
              type="button"
              className="login-link-button"
              onClick={() => navigate("/dashboard")}
            >
              go to your dashboard
            </button>
          </p>
        )}
      </section>
    </main>
  );
}

export default Login;
