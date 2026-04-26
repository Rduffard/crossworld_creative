import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import "./Navbar.css";

function getAccountTriggerLabel(user) {
  if (typeof user?.displayName === "string" && user.displayName.trim()) {
    return user.displayName.trim();
  }

  if (typeof user?.name === "string" && user.name.trim()) {
    return user.name.trim();
  }

  if (typeof user?.email === "string" && user.email.trim()) {
    return user.email.trim();
  }

  return "Account";
}

function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const displayName = getAccountTriggerLabel(user);

  const linkClass = ({ isActive }) =>
    `navbar__link ${isActive ? "navbar__link--active" : ""}`;

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <NavLink
            to="/dashboard"
            className="navbar__brand"
            aria-label="Go to dashboard"
          >
            <img
              className="navbar__brand-mark"
              src="/logo.png"
              alt="Crossworld logo"
            />
            <div className="navbar__brand-text">
              <span className="navbar__brand-title">CROSSWORLD</span>
              <span className="navbar__brand-subtitle">CREATIVE</span>
            </div>
          </NavLink>

          <nav className="navbar__nav" aria-label="Primary">
            <NavLink to="/dashboard" end className={linkClass}>
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
          {user && (
            <div className="navbar__account" ref={menuRef}>
              <button
                type="button"
                className={`navbar__trigger ${menuOpen ? "navbar__trigger--open" : ""}`}
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-controls="navbar-account-menu"
              >
                <span className="navbar__trigger-label">{displayName}</span>
                <span className="navbar__trigger-caret" aria-hidden="true">
                  v
                </span>
              </button>

              {menuOpen && (
                <div
                  id="navbar-account-menu"
                  className="navbar__menu"
                  role="menu"
                  aria-label="Account menu"
                >
                  <NavLink
                    to="/settings"
                    className="navbar__menu-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Settings</span>
                    <span className="navbar__menu-copy">
                      Tweak the shared layer
                    </span>
                  </NavLink>

                  <button
                    type="button"
                    className="navbar__menu-item navbar__menu-item--disabled"
                    role="menuitem"
                    disabled
                  >
                    <span>Theme</span>
                    <span className="navbar__menu-copy">
                      Quick switch landing soon
                    </span>
                  </button>

                  <button
                    type="button"
                    className="navbar__menu-item navbar__menu-item--disabled"
                    role="menuitem"
                    disabled
                  >
                    <span>Profile</span>
                    <span className="navbar__menu-copy">
                      Public identity lives here later
                    </span>
                  </button>

                  <button
                    type="button"
                    className="navbar__menu-item navbar__menu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    <span>Log out</span>
                    <span className="navbar__menu-copy">
                      Leave Crossworld for now
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
