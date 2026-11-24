import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { groups } from "./workspaces";

export default function OperationsShell({ page, navigate, health, paused, keyboardOpen, children }) {
  const current = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      current.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [page]);

  return <main className="operations operations--shell" data-workspace={page} data-keyboard={keyboardOpen}>
    <a className="operations__skip" href="#operations-workspace">Skip to workspace</a>
    <header className="operations__topbar">
      <Link className="operations__wordmark" to="/dashboard">Crossworld <span>Operations</span></Link>
      <div className="operations__topbar-tools">
        <span className="operations__health" data-online={health.online} role="status">{health.label}</span>
        {paused && <button type="button" onClick={() => navigate("Settings")}>Dispatch paused</button>}
        <Link className="operations__account" to="/profile">Account</Link>
      </div>
    </header>
    <nav className="operations__navigation" aria-label="Operations workspaces">
      {groups.map(([group, entries]) => <div key={group}>
        <span>{group}</span>
        {entries.map(([, name]) => <button type="button" key={name} ref={page === name ? current : null} aria-current={page === name ? "page" : undefined}
          onClick={() => navigate(name)}>{name}</button>)}
      </div>)}
    </nav>
    <div id="operations-workspace" className="operations__workspace" tabIndex={-1}>
      {page !== "Command Center" && <h1>{page}</h1>}
      {children}
    </div>
  </main>;
}
