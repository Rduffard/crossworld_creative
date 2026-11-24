import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { groups } from "./workspaces";

function StudioClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  return <time className="operations__studio-clock" dateTime={now.toISOString()} title="Local time">
    {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
  </time>;
}

function WorkspaceLinks({ page, navigate }) {
  return groups.map(([group, entries]) => <div key={group}>
    <span>{group}</span>
    {entries.map(([, name]) => <button type="button" key={name} aria-current={page === name ? "page" : undefined}
      onClick={() => navigate(name)}>{name}</button>)}
  </div>);
}

export default function OperationsShell({ page, navigate, health, paused, keyboardOpen, subscription, occupancy,
  pendingApprovals, openApprovals, children }) {
  const workspaces = useRef(null);
  const workspace = useRef(null);

  function navigateMobile(name) {
    workspaces.current?.close();
    navigate(name);
    requestAnimationFrame(() => workspace.current?.focus());
  }

  return <main className="operations operations--shell" data-workspace={page} data-keyboard={keyboardOpen}>
    <a className="operations__skip" href="#operations-workspace">Skip to workspace</a>
    <header className="operations__topbar">
      <button type="button" className="operations__wordmark" onClick={() => navigate("Headquarters")}>Crossworld <span>Operations</span></button>
      <div className="operations__topbar-tools">
        {subscription}
        {occupancy && <span className="operations__topbar-capacity" title="Unoccupied relay slots; dispatch and provider limits still apply">
          {occupancy.active} active · {occupancy.open} open
        </span>}
        <span className="operations__health" data-online={health.online} role="status">{health.label}</span>
        {pendingApprovals > 0 && <button type="button" onClick={openApprovals}>{pendingApprovals} pending approvals</button>}
        {paused && <button type="button" onClick={() => navigate("Settings")}>Dispatch paused</button>}
        <StudioClock />
        <Link className="operations__account" to="/profile">Account</Link>
      </div>
    </header>
    <nav className="operations__navigation" aria-label="Operations workspaces">
      <WorkspaceLinks page={page} navigate={navigate} />
    </nav>
    <div className="operations__mobile-nav">
      <span>{page}{paused && <small>Dispatch paused</small>}</span>
      <button type="button" aria-haspopup="dialog" onClick={() => workspaces.current?.showModal()}>Workspaces</button>
    </div>
    <dialog ref={workspaces} className="operations__dialog operations__workspace-menu" aria-labelledby="operations-workspace-menu-title">
      <div className="operations__briefing-title">
        <h2 id="operations-workspace-menu-title">Workspaces</h2>
        <form method="dialog"><button>Close</button></form>
      </div>
      <nav aria-label="Available workspaces"><WorkspaceLinks page={page} navigate={navigateMobile} /></nav>
    </dialog>
    <div ref={workspace} id="operations-workspace" className="operations__workspace" tabIndex={-1}>
      {page !== "Command Center" && page !== "Headquarters" && <h1>{page}</h1>}
      {children}
    </div>
  </main>;
}
