// src/pages/Login/components/LeftRail/LeftRail.jsx
import logo from "../../../../assets/logo-noBG.png";
import "./LeftRail.css";

function LeftRail({ shellActive }) {
  return (
    <div className="login__left-stack">
      <div className="login__brand login__brand--shell">
        <img
          className="login__logo"
          src={logo}
          alt="Crossworld Creative"
          draggable="false"
        />
        <p className="login__tagline">Reality is just the first draft.</p>
      </div>

      <nav className={`login__links ${shellActive ? "is-active" : ""}`}>
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
    </div>
  );
}

export default LeftRail;
