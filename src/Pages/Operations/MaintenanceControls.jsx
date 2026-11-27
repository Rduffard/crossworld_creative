import { useEffect, useState } from "react";

export default function MaintenanceControls({ request }) {
  const [status, setStatus] = useState(null);
  const [dispatch, setDispatch] = useState(null);
  const [holdError, setHoldError] = useState("");
  const [dispatchError, setDispatchError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [refreshing, setRefreshing] = useState([]);
  const refreshingHold = refreshing.includes("maintenance-hold");
  const refreshingDispatch = refreshing.includes("dispatch-pause");
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
    function poll(path, target, setValue, setFailure) {
      let timer;
      async function read() {
        try {
          const value = await request(path);
          if (active) {
            setValue(value);
            setFailure("");
          }
        } catch (failure) {
          if (active) setFailure(failure.message);
        } finally {
          if (active) {
            setRefreshing(current => current.includes(target) ? current.filter(item => item !== target) : current);
            timer = setTimeout(read, 5000);
          }
        }
      }
      read();
      return () => clearTimeout(timer);
    }
    const stopHold = poll("/maintenance", "maintenance-hold", setStatus, setHoldError);
    const stopDispatch = poll("/dispatch", "dispatch-pause", setDispatch, setDispatchError);
    return () => {
      active = false;
      stopHold();
      stopDispatch();
    };
  }, [request, revision]);

  async function change(path, body) {
    const target = path === "/maintenance" ? "maintenance-hold" : "dispatch-pause";
    const group = document.getElementById(target);
    if (group?.contains(document.activeElement)) group.focus({ preventScroll: true });
    setPending(target);
    setError("");
    setNotice("");
    try {
      await request(path, { method: "PATCH", body });
      setRefreshing(current => [...current, target]);
      setNotice(target === "maintenance-hold" ? "Maintenance hold updated." : "Dispatch pause updated.");
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending("");
    }
  }

  const holdIsStale = Boolean(holdError || refreshingHold || pending === "maintenance-hold");
  const dispatchIsStale = Boolean(dispatchError || refreshingDispatch || pending === "dispatch-pause");
  const effectiveDispatch = !status || !dispatch || holdIsStale || dispatchIsStale
    ? "Status unconfirmed"
    : dispatch.paused ? "Paused by owner" : status.active ? "Held for maintenance" : "Open";

  return <section aria-label="Maintenance controls">
    <h3>Maintenance</h3>
    {error && <p role="alert">{error}</p>}
    <div role="status">{notice}</div>
    {status && <>
      {holdIsStale && <p id="maintenance-snapshot-status" role="status"><strong>Last known maintenance status</strong></p>}
      <dl className="operations__execution-summary" aria-describedby={holdIsStale ? "maintenance-snapshot-status" : undefined}>
        <div><dt>Maintenance hold</dt><dd>{status.active
          ? <>Until <time dateTime={status.expiresAt}>{new Date(status.expiresAt).toLocaleString()}</time></>
          : "Inactive"}</dd></div>
        <div><dt>New execution and media admission</dt><dd>{status.active ? "Held" : "Open"}</dd></div>
        <div><dt>Active executions</dt><dd>{status.executions}</dd></div>
        {status.unconfirmedExecutions > 0 && <div><dt>Executions awaiting reconciliation</dt><dd>{status.unconfirmedExecutions}</dd></div>}
        <div><dt>Active media transfers</dt><dd>{status.mediaTransfers}</dd></div>
        <div><dt>Claims entering dispatch</dt><dd>{status.claimAdmissions}</dd></div>
        <div><dt>Drain status</dt><dd>{status.ready ? "Drained" : status.unconfirmedExecutions > 0
          ? "Waiting for lease reconciliation" : status.active ? "Draining" : "Hold required"}</dd></div>
      </dl>
    </>}
    <div id="maintenance-hold" tabIndex={-1} role="group" aria-labelledby="maintenance-hold-label">
      <h4 id="maintenance-hold-label">Maintenance hold</h4>
      {holdError && <p role="alert">Maintenance hold status unavailable. {holdError}</p>}
      {((!status && !holdError) || pending === "maintenance-hold" || refreshingHold) && <p role="status">
        {pending === "maintenance-hold" ? "Updating maintenance hold…"
          : refreshingHold ? "Refreshing maintenance hold…" : "Checking maintenance hold…"}
      </p>}
      {status && (status.active
        ? <button type="button" disabled={Boolean(pending || holdError || refreshingHold)} onClick={() => change("/maintenance", { minutes: 0 })}>End maintenance hold</button>
        : <form onSubmit={event => {
          event.preventDefault();
          const minutes = Number(new FormData(event.currentTarget).get("minutes"));
          change("/maintenance", { minutes });
        }}>
          <label>Hold duration in minutes <input name="minutes" type="number" min="1" max="60" defaultValue="15" required /></label>
          <button type="submit" disabled={Boolean(pending || holdError || refreshingHold)}>Start maintenance hold</button>
        </form>)}
    </div>
    <div id="dispatch-pause" tabIndex={-1} role="group" aria-labelledby="dispatch-pause-label">
      <h4 id="dispatch-pause-label">Dispatch pause</h4>
      {dispatch && <p>{dispatchIsStale && <small>Last known · </small>}{dispatch.paused ? "Paused by owner" : "Unpaused by owner"}</p>}
      <dl className="operations__execution-summary">
        <div><dt>Effective dispatch</dt><dd>{effectiveDispatch}</dd></div>
      </dl>
      {dispatchError && <p role="alert">Dispatch pause status unavailable. {dispatchError}</p>}
      {((!dispatch && !dispatchError) || pending === "dispatch-pause" || refreshingDispatch) && <p role="status">
        {pending === "dispatch-pause" ? "Updating dispatch pause…"
          : refreshingDispatch ? "Refreshing dispatch pause…" : "Checking dispatch pause…"}
      </p>}
      {dispatch && <button type="button" disabled={Boolean(pending || dispatchError || refreshingDispatch)} onClick={() => change("/dispatch", { paused: !dispatch.paused })}>
        {dispatch.paused ? "Clear dispatch pause" : "Pause future dispatch"}
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
