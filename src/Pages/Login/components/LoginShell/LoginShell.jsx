import LeftRail from "../LeftRail/LeftRail.jsx";
import InfoPanel from "../InfoPanel/InfoPanel.jsx";
import LoginForm from "../../../../components/Auth/LoginForm.jsx"; // <-- match your actual path/case

import "./LoginShell.css";

function LoginShell({
  phase,
  shellActive,
  isAuthenticated,
  emailInputRef,
  onClose,
  onSubmit,
  onGuest,
  onGoDashboard,
  onRequestInvite,
  onTransitionEnd,
}) {
  return (
    <div
      className="login__shell"
      aria-hidden={phase !== "open"}
      onTransitionEnd={onTransitionEnd}
    >
      {/* LEFT */}
      <aside className="login__left">
        <LeftRail shellActive={shellActive} />
      </aside>

      {/* CENTER */}
      <section className="login__center">
        <LoginForm
          emailInputRef={emailInputRef}
          isAuthenticated={isAuthenticated}
          onClose={onClose}
          onSubmit={onSubmit}
          onGuest={onGuest}
          onGoDashboard={onGoDashboard}
          onRequestInvite={onRequestInvite}
        />
      </section>

      {/* RIGHT */}
      <aside className="login__right">
        <InfoPanel />
      </aside>
    </div>
  );
}

export default LoginShell;
