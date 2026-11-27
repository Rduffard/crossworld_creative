import { useEffect, useState } from "react";

const short = value => value?.slice(0, 12) || "Unavailable";
const infrastructure = "/operations?workspace=infrastructure";

export default function RemoteLifecycle({ request }) {
  const [snapshot, setSnapshot] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [selection, setSelection] = useState({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [maintenanceError, setMaintenanceError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let live = true;
    function startPolling(path, setValue, setFailure, unavailable) {
      let timer;
      async function poll() {
        try {
          const result = await request(path);
          if (!live) return;
          setValue(result);
          setFailure("");
        } catch (failure) {
          if (!live) return;
          setValue(null);
          setFailure(failure.status === 404 ? unavailable : failure.message);
        } finally {
          if (live) timer = setTimeout(poll, 5000);
        }
      }
      poll();
      return () => clearTimeout(timer);
    }
    const stopSupervisor = startPolling("/supervisor", setSnapshot, setPollError, "Release-managed supervisor status unavailable.");
    const stopMaintenance = startPolling("/maintenance", setMaintenance, setMaintenanceError, "Maintenance status unavailable.");
    return () => { live = false; stopSupervisor(); stopMaintenance(); };
  }, [request, revision]);

  async function authorize(device, operation, target) {
    if (!target || !window.confirm("Authorize " + operation + " on " + device.label + " with release " + target + "?")) return;
    setPending(true);
    setError("");
    try {
      await request("/supervisor", { method: "POST", body: {
        id: crypto.randomUUID(), hostId: device._id, operation, current: device.active, target,
      } });
      setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  async function cancel(id) {
    setPending(true);
    setError("");
    try {
      await request("/supervisor/" + id + "/cancel", { method: "POST", body: {} });
      setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  const holdReady = maintenance?.active && Date.parse(maintenance.expiresAt) - Date.now() >= 300_000;
  const canAuthorize = maintenance?.paused && holdReady;
  return <section className="operations__panel" aria-label="Remote worker lifecycle">
    <h3>Remote worker lifecycle</h3>
    {pollError && <p role="alert">{pollError}</p>}
    {!snapshot && !pollError && <p role="status">Checking supervisor status…</p>}
    {maintenanceError && <p role="alert">{maintenanceError}</p>}
    {!maintenance && !maintenanceError && <p role="status">Checking maintenance status…</p>}
    {maintenance && <dl className="operations__execution-summary">
      <div>
        <dt><a href={infrastructure + "#dispatch-pause"}>Owner pause required for worker actions</a></dt>
        <dd>{maintenance.paused ? "Paused" : "Pause required"}</dd>
      </div>
      <div>
        <dt><a href={infrastructure + "#maintenance-hold"}>Maintenance hold</a></dt>
        <dd>{maintenance.active
          ? <>Ends at <time dateTime={maintenance.expiresAt}>{new Date(maintenance.expiresAt).toLocaleString()}</time>.{" "}</>
          : "Inactive. "}
        {holdReady ? "At least five minutes remain." : "At least five minutes must remain."}</dd>
      </div>
      <div>
        <dt>Drain status</dt>
        <dd>{maintenance.ready ? "Drained" : maintenance.active ? "Waiting for active work to drain" : "Maintenance hold required"}</dd>
      </div>
    </dl>}
    {error && <p role="alert">{error}</p>}
    {snapshot?.devices.length === 0 && <p>No release-managed supervisor has reported in.</p>}
    {snapshot?.devices.map(device => {
      const target = selection[device._id];
      const blocked = pending || !canAuthorize || !device.online || snapshot.requests.some(item => item.hostId === device._id &&
        ["authorized", "running"].includes(item.status));
      return <section key={device._id}>
        <h4>{device.label}</h4>
        <p>{device.online ? "Supervisor online" : "Supervisor offline"} · Active {short(device.active)} · Previous {short(device.previous)}</p>
        <label>Staged release <select value={target || ""} onChange={event => setSelection(value => ({ ...value, [device._id]: event.target.value }))}>
          <option value="">Select release</option>
          {device.releases.filter(version => version !== device.active).map(version =>
            <option key={version} value={version}>{short(version)}</option>)}
        </select></label>
        <div className="operations__modes">
          <button type="button" disabled={blocked} onClick={() => authorize(device, "restart", device.active)}>Restart worker</button>
          <button type="button" disabled={blocked || !device.releases.includes(target)} onClick={() => authorize(device, "update", target)}>Update worker</button>
          <button type="button" disabled={blocked || !device.previous} onClick={() => authorize(device, "rollback", device.previous)}>Roll back worker</button>
        </div>
      </section>;
    })}
    {snapshot?.requests.length > 0 && <ul className="operations__feed">{snapshot.requests.map(item => <li key={item._id}>
      <strong>{item.operation} · {short(item.target)} · {item.status}</strong>
      {item.status === "authorized" && <button type="button" disabled={pending} onClick={() => cancel(item._id)}>Cancel request</button>}
    </li>)}</ul>}
  </section>;
}
