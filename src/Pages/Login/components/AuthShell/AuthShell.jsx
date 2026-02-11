import LeftRail from "../LeftRail/LeftRail.jsx";
import InfoPanel from "../InfoPanel/InfoPanel.jsx";

import "./AuthShell.css";

function AuthShell({
  phase,
  shellActive,
  onTransitionEnd,
  children,

  // NEW: used to trigger swap animation when mode changes
  contentKey = "login",
  swapDir = "forward", // "forward" | "back"
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
        <div
          key={contentKey}
          className={
            "login__center-content " +
            (swapDir === "back"
              ? "login__center-content--back"
              : "login__center-content--forward")
          }
        >
          {children}
        </div>
      </section>

      {/* RIGHT */}
      <aside className="login__right">
        <InfoPanel />
      </aside>
    </div>
  );
}

export default AuthShell;
