import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `navbar__link ${isActive ? "navbar__link--active" : ""}`;

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <NavLink
            to="/dashboard"
            className="navbar__brand"
            aria-label="Go to dashboard"
          >
            <span className="navbar__brand-mark" aria-hidden="true">
              ∞
            </span>
            <div className="navbar__brand-text">
              <span className="navbar__brand-title">CROSSWORLD</span>
              <span className="navbar__brand-subtitle">CREATIVE</span>
            </div>
          </NavLink>

          <nav className="navbar__nav" aria-label="Primary">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/dashboard/projects" className={linkClass}>
              Projects
            </NavLink>
            <NavLink to="/dashboard/music" className={linkClass}>
              Music
            </NavLink>
            <NavLink to="/dashboard/games" className={linkClass}>
              Games
            </NavLink>
            <NavLink to="/dashboard/literature" className={linkClass}>
              Literature
            </NavLink>
            <NavLink to="/dashboard/community" className={linkClass}>
              Community
            </NavLink>
          </nav>
        </div>

        <div className="navbar__right">
          {user?.email && <p className="navbar__user">{user.email}</p>}
          <button className="navbar__logout" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
