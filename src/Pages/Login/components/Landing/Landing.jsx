import logo from "../../../../assets/logo-noBG.png";
import "./Landing.css";

function Landing({ phase, onEnter, onTransitionEnd }) {
  return (
    <section
      className="login__landing"
      aria-hidden={phase !== "landing"}
      onTransitionEnd={onTransitionEnd}
    >
      <div className="login__landing-stack">
        <div className="login__brand">
          <img
            className="login__logo"
            src={logo}
            alt="Crossworld Creative"
            draggable="false"
          />
          <p className="login__tagline">Reality is just the first draft.</p>
        </div>

        <button
          type="button"
          className="login__enter-button"
          onClick={onEnter}
          disabled={phase !== "landing"}
        >
          Enter
        </button>
      </div>
    </section>
  );
}

export default Landing;
