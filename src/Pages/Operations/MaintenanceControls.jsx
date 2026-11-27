import { useEffect, useState } from "react";

export default function MaintenanceControls({ request }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const hasStatus = status !== null;

  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (hasStatus && ["maintenance-hold", "dispatch-pause"].includes(target)) {
      const control = document.getElementById(target);
      control?.scrollIntoView({ block: "center" });
      control?.focus({ preventScroll: true });
    }
  }, [hasStatus]);

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
    setPending(true);
    setError("");
    try {
      await request(path, { method: "PATCH", body });
      setStatus(null);
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  return <section aria-label="Maintenance controls">
    <h3>Maintenance</h3>
    {error && <p role="alert">{error}</p>}
    {!status && !error && <p role="status">Checking maintenance status…</p>}
    {status && <>
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
      </dl>
      {status.active
        ? <button id="maintenance-hold" type="button" disabled={pending} onClick={() => change("/maintenance", { minutes: 0 })}>End maintenance hold</button>
        : <form id="maintenance-hold" tabIndex={-1} onSubmit={event => {
          event.preventDefault();
          const minutes = Number(new FormData(event.currentTarget).get("minutes"));
          change("/maintenance", { minutes });
        }}>
          <label>Hold duration in minutes <input name="minutes" type="number" min="1" max="60" defaultValue="15" required /></label>
          <button type="submit" disabled={pending}>Start maintenance hold</button>
        </form>}
      <button id="dispatch-pause" type="button" disabled={pending} onClick={() => change("/dispatch", { paused: !status.paused })}>
        {status.paused ? "Clear dispatch pause" : "Pause future dispatch"}
      </button>
      {status.history?.length > 0 && <details>
        <summary>Recent maintenance changes</summary>
        <ul>{[...status.history].reverse().map((entry, index) => <li key={entry.at + "/" + index}>
          <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
          {entry.expiresAt ? ` · Hold set until ${new Date(entry.expiresAt).toLocaleString()}` : " · Hold cleared"}
        </li>)}</ul>
      </details>}
    </>}
  </section>;
}
