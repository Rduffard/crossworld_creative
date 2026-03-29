import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import Landing from "./components/Landing/Landing.jsx";
import AuthShell from "./components/AuthShell/AuthShell.jsx";

import LoginForm from "../../components/Auth/LoginForm.jsx";
import SignupForm from "../../components/Auth/SignupForm.jsx";

import "./Login.css";

function Login() {
  // landing | opening | open | closing
  const [phase, setPhase] = useState("landing");

  // auth view inside the shell
  const [authMode, setAuthMode] = useState("login");

  // direction hint for swap animation
  const [swapDir, setSwapDir] = useState("forward");

  // pre-enter shell flag
  const [shellActive, setShellActive] = useState(false);

  // first-load animation flag
  const [isBooting, setIsBooting] = useState(true);

  // where to go after the closing animation finishes
  const [pendingRoute, setPendingRoute] = useState(null);

  // auth error shown inside the modal
  const [authError, setAuthError] = useState("");

  const emailInputRef = useRef(null);

  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isLandingMounted =
    phase === "landing" || phase === "opening" || phase === "closing";

  const isShellMounted =
    phase === "opening" || phase === "open" || phase === "closing";

  useEffect(() => {
    requestAnimationFrame(() => setIsBooting(false));
  }, []);

  const openShell = () => {
    if (phase !== "landing") return;

    setAuthError("");
    setPhase("opening");
    setShellActive(false);
    requestAnimationFrame(() => setShellActive(true));
  };

  const closeShell = () => {
    if (phase !== "open") return;

    setAuthError("");
    setPendingRoute(null);
    setPhase("closing");
    setShellActive(false);
    setAuthMode("login");
    setSwapDir("back");
  };

  function beginExitTo(route) {
    setAuthError("");
    setPendingRoute(route);
    setPhase("closing");
    setShellActive(false);
  }

  function switchMode(nextMode) {
    setAuthError("");
    setSwapDir(nextMode === "signup" ? "forward" : "back");
    setAuthMode(nextMode);
  }

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && phase === "open") closeShell();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [phase]);

  useEffect(() => {
    if (phase === "open" && authMode === "login") {
      window.setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, [phase, authMode]);

  async function handleLoginSubmit({ email, password }) {
    setAuthError("");

    try {
      await login({ email, password });
      beginExitTo("/dashboard");
    } catch (err) {
      setAuthError(err.message || "Invalid email or password.");
    }
  }

  async function handleSignupSubmit({ name, email, password, avatar }) {
    setAuthError("");

    try {
      await signup({ name, email, password, avatar });
      beginExitTo("/dashboard");
    } catch (err) {
      setAuthError(err.message || "Could not create account.");
    }
  }

  function handleGuest() {
    beginExitTo("/dashboard?demo=true");
  }

  function handleGoDashboard() {
    beginExitTo("/dashboard");
  }

  function handleRequestInvite() {
    const subject = encodeURIComponent(
      "Invite Access Request — Crossworld Demo",
    );
    const body = encodeURIComponent(
      `Hey Romain,\n\nI'd like invite access.\n\nName:\nCompany (optional):\nReason / use-case:\n\nThanks!`,
    );
    window.location.href = `mailto:youremail@example.com?subject=${subject}&body=${body}`;
  }

  const handleLandingTransitionEnd = (e) => {
    if (e.propertyName !== "opacity") return;
    if (phase !== "opening") return;

    setPhase("open");
  };

  const handleShellTransitionEnd = (e) => {
    if (e.propertyName !== "opacity") return;
    if (phase !== "closing") return;

    if (pendingRoute) {
      navigate(pendingRoute, { replace: true });
      return;
    }

    setPhase("landing");
  };

  const pageClass = useMemo(() => {
    return [
      "login__page",
      phase === "landing" ? "login__page--landing" : "login__page--shell",
      phase === "opening" ? "login__page--opening" : "",
      phase === "open" ? "login__page--open" : "",
      phase === "closing" ? "login__page--closing" : "",
      shellActive ? "login__page--shell-active" : "",
      isBooting ? "login__page--boot" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [phase, shellActive, isBooting]);

  return (
    <main className={pageClass}>
      {isLandingMounted && (
        <Landing
          phase={phase}
          onEnter={openShell}
          onTransitionEnd={handleLandingTransitionEnd}
        />
      )}

      {isShellMounted && (
        <AuthShell
          phase={phase}
          shellActive={shellActive}
          onTransitionEnd={handleShellTransitionEnd}
          contentKey={authMode}
          swapDir={swapDir}
        >
          {authMode === "login" ? (
            <LoginForm
              emailInputRef={emailInputRef}
              isAuthenticated={isAuthenticated}
              error={authError}
              onClose={closeShell}
              onSubmit={handleLoginSubmit}
              onGuest={handleGuest}
              onGoDashboard={handleGoDashboard}
              onRequestInvite={handleRequestInvite}
              onSwitchMode={switchMode}
            />
          ) : (
            <SignupForm
              error={authError}
              onSubmit={handleSignupSubmit}
              onSwitchMode={switchMode}
            />
          )}
        </AuthShell>
      )}
    </main>
  );
}

export default Login;
