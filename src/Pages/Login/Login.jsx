import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import Landing from "./components/Landing/Landing.jsx";
import LoginShell from "./components/LoginShell/LoginShell.jsx";

import "./Login.css";

function Login() {
  // landing | opening | open | closing
  const [phase, setPhase] = useState("landing");

  // pre-enter shell flag (prevents pop-in)
  const [shellActive, setShellActive] = useState(false);

  // first-load animation flag
  const [isBooting, setIsBooting] = useState(true);

  const emailInputRef = useRef(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Keep landing mounted during closing so it can fade back in smoothly
  const isLandingMounted =
    phase === "landing" || phase === "opening" || phase === "closing";

  const isShellMounted =
    phase === "opening" || phase === "open" || phase === "closing";

  // first frame: remove boot class so landing eases in
  useEffect(() => {
    requestAnimationFrame(() => setIsBooting(false));
  }, []);

  const openShell = () => {
    if (phase !== "landing") return;

    setPhase("opening");

    // mount shell in pre-enter state, then activate it next frame so it transitions in
    setShellActive(false);
    requestAnimationFrame(() => setShellActive(true));
  };

  const closeShell = () => {
    if (phase !== "open") return;

    setPhase("closing");
    setShellActive(false);
  };

  // ESC closes the shell (only when fully open)
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && phase === "open") closeShell();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [phase]);

  // Focus email when fully open
  useEffect(() => {
    if (phase === "open") {
      window.setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, [phase]);

  async function handleSubmit({ email, password }) {
    await login({ email, password });
    navigate("/dashboard", { replace: true });
  }

  function handleGuest() {
    navigate("/dashboard?demo=true");
  }

  function handleGoDashboard() {
    navigate("/dashboard");
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

  // Landing finished fading OUT during opening -> shell becomes "open"
  const handleLandingTransitionEnd = (e) => {
    // Landing transitions both opacity and transform; we only care about opacity finishing.
    if (e.propertyName !== "opacity") return;
    if (phase !== "opening") return;

    setPhase("open");
  };

  // Shell finished fading OUT during closing -> return to landing
  const handleShellTransitionEnd = (e) => {
    if (e.propertyName !== "opacity") return;
    if (phase !== "closing") return;

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
        <LoginShell
          phase={phase}
          shellActive={shellActive}
          isAuthenticated={isAuthenticated}
          emailInputRef={emailInputRef}
          onClose={closeShell}
          onSubmit={handleSubmit}
          onGuest={handleGuest}
          onGoDashboard={handleGoDashboard}
          onRequestInvite={handleRequestInvite}
          onTransitionEnd={handleShellTransitionEnd}
        />
      )}
    </main>
  );
}

export default Login;
