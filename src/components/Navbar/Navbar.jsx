import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useOperationsAccess } from "../../hooks/useOperationsAccess";
import { getUserDisplayName } from "../../utils/userDisplay";

const destinations = [
  ["/dashboard", "Studio"],
  ["/dashboard/projects", "Projects"],
  ["/dashboard/games", "Games"],
  ["/dashboard/music", "Music"],
  ["/dashboard/literature", "Literature"],
  ["/dashboard/community", "Community"],
];

function Navbar() {
  const { loaded, user, logout } = useAuth();
  const operations = useOperationsAccess();
  const { key } = useLocation();
  const [openAt, setOpenAt] = useState(null);
  const open = openAt === key;
  const account = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!account.current?.contains(event.target)) setOpenAt(null);
    }
    function escape(event) {
      if (event.key !== "Escape") return;
      setOpenAt(null);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <header className="studio-nav">
      <div className="studio-nav__inner">
        <Link className="studio-brand" to="/dashboard" aria-label="Crossworld Creative studio">
          <img src="/logo.png" width="38" height="38" alt="" />
          <span>Crossworld <b>Creative</b></span>
        </Link>
        <nav className="studio-nav__links" aria-label="Primary">
          {destinations.map(([to, label], index) => (
            <NavLink key={to} to={to} end={index === 0}>{label}</NavLink>
          ))}
        </nav>
        <div className="studio-nav__utilities">
          {operations && (
            <NavLink className="studio-hq" to="/operations?workspace=headquarters">
              <span className="studio-hq__mark" aria-hidden="true" /> Operations
            </NavLink>
          )}
          {loaded && (user ? (
            <div className="studio-account" ref={account} onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpenAt(null);
            }}>
              <button ref={trigger} type="button" aria-expanded={open} aria-controls={open ? "studio-account-menu" : undefined}
                onClick={() => setOpenAt(open ? null : key)}>
                <span className="studio-account__name">{getUserDisplayName(user)}</span>
                <span className="studio-account__label">Account</span><span aria-hidden="true">▾</span>
              </button>
              {open && (
                <div id="studio-account-menu" className="studio-account__menu">
                  <Link to="/profile" onClick={() => setOpenAt(null)}>Profile</Link>
                  <Link to="/settings" onClick={() => setOpenAt(null)}>Settings</Link>
                  <button type="button" onClick={() => { setOpenAt(null); logout(); }}>Log out</button>
                </div>
              )}
            </div>
          ) : <Link className="studio-signin" to="/">Sign in</Link>)}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
