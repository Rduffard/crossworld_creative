import { useEffect, useState } from "react";

export default function MaintenanceControls({ request }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [refreshing, setRefreshing] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    function focusTarget() {
      const target = window.location.hash.slice(1);
      if (!["maintenance-hold", "dispatch-pause"].includes(target)) return;
      const control = document.getElementById(target);
      if (!control) return;
      control.scrollIntoView({ block: "center" });
      control.focus({ preventScroll: true });
    }
    focusTarget();
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);

  useEffect(() => {
    let active = true;
    let timer;
    async function read() {
      try {
        const [maintenance, dispatch] = await Promise.all([
          request("/maintenance"), request("/dispatch"),
        ]);
        if (active) {
          setStatus({ ...maintenance, paused: dispatch.paused });
          setError("");
          setRefreshing("");
        }
      } catch (failure) {
        if (active) {
          setStatus(null);
          setError(failure.message);
        }
      } finally {
        if (active) timer = setTimeout(read, 5000);
      }
    }
    read();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, revision]);

  async function change(path, body) {
    const target = path === "/maintenance" ? "maintenance-hold" : "dispatch-pause";
    const group = document.getElementById(target);
    if (group?.contains(document.activeElement)) group.focus({ preventScroll: true });
    setPending(target);
    setError("");
    try {
      await request(path, { method: "PATCH", body });
      setStatus(null);
      setRefreshing(target);
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending("");
    }
  }

  return <section aria-label="Maintenance controls">
    <h3>Maintenance</h3>
    {error && <p role="alert">{error}</p>}
    {status &&
      <dl className="operations__execution-summary">
        <div><dt>Maintenance hold</dt><dd>{status.active
          ? <>Until <time dateTime={status.expiresAt}>{new Date(status.expiresAt).toLocaleString()}</time></>
          : "Inactive"}</dd></div>
        <div><dt>New execution and media admission</dt><dd>{status.active ? "Held" : "Open"}</dd></div>
        <div><dt>Dispatch</dt><dd>{status.paused ? "Paused by owner" : status.active ? "Held for maintenance" : "Open"}</dd></div>
        <div><dt>Active executions</dt><dd>{status.executions}</dd></div>
        {status.unconfirmedExecutions > 0 && <div><dt>Executions awaiting reconciliation</dt><dd>{status.unconfirmedExecutions}</dd></div>}
        <div><dt>Active media transfers</dt><dd>{status.mediaTransfers}</dd></div>
        <div><dt>Claims entering dispatch</dt><dd>{status.claimAdmissions}</dd></div>
        <div><dt>Drain status</dt><dd>{status.ready ? "Drained" : status.unconfirmedExecutions > 0
          ? "Waiting for lease reconciliation" : status.active ? "Draining" : "Hold required"}</dd></div>
      </dl>}
    <div id="maintenance-hold" tabIndex={-1} role="group" aria-labelledby="maintenance-hold-label">
      <h4 id="maintenance-hold-label">Maintenance hold</h4>
      {(!status || pending === "maintenance-hold") && <p role="status">
        {pending === "maintenance-hold" ? "Updating maintenance hold…"
          : error ? "Maintenance hold status unavailable." : refreshing === "maintenance-hold" ? "Refreshing maintenance hold…" : "Checking maintenance hold…"}
      </p>}
      {status && (status.active
        ? <button type="button" disabled={pending} onClick={() => change("/maintenance", { minutes: 0 })}>End maintenance hold</button>
        : <form onSubmit={event => {
          event.preventDefault();
          const minutes = Number(new FormData(event.currentTarget).get("minutes"));
          change("/maintenance", { minutes });
        }}>
          <label>Hold duration in minutes <input name="minutes" type="number" min="1" max="60" defaultValue="15" required /></label>
          <button type="submit" disabled={pending}>Start maintenance hold</button>
        </form>)}
    </div>
    <div id="dispatch-pause" tabIndex={-1} role="group" aria-labelledby="dispatch-pause-label">
      <h4 id="dispatch-pause-label">Dispatch pause</h4>
      {(!status || pending === "dispatch-pause") && <p role="status">
        {pending === "dispatch-pause" ? "Updating dispatch pause…"
          : error ? "Dispatch pause status unavailable." : refreshing === "dispatch-pause" ? "Refreshing dispatch pause…" : "Checking dispatch pause…"}
      </p>}
      {status && <button type="button" disabled={pending} onClick={() => change("/dispatch", { paused: !status.paused })}>
        {status.paused ? "Clear dispatch pause" : "Pause future dispatch"}
      </button>}
    </div>
      {status?.history?.length > 0 && <details>
        <summary>Recent maintenance changes</summary>
        <ul>{[...status.history].reverse().map((entry, index) => <li key={entry.at + "/" + index}>
          <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
          {entry.expiresAt ? ` · Hold set until ${new Date(entry.expiresAt).toLocaleString()}` : " · Hold cleared"}
        </li>)}</ul>
      </details>}
  </section>;
}
