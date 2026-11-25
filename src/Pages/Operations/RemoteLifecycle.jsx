import { useEffect, useState } from "react";

const short = value => value?.slice(0, 12) || "Unavailable";

export default function RemoteLifecycle({ request }) {
  const [snapshot, setSnapshot] = useState(null);
  const [selection, setSelection] = useState({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let live = true;
    let timer;
    async function poll() {
      try {
        const result = await request("/supervisor");
        if (live) setSnapshot(result);
      } catch (failure) {
        if (live && failure.status !== 404) setError(failure.message);
      } finally {
        if (live) timer = setTimeout(poll, 5000);
      }
    }
    poll();
    return () => { live = false; clearTimeout(timer); };
  }, [request, revision]);

  async function authorize(device, operation, target) {
    if (!target || !window.confirm("Authorize " + operation + " on " + device.label + " with release " + short(target) + "?")) return;
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

  return <section className="operations__panel" aria-label="Remote worker lifecycle">
    <h3>Remote worker lifecycle</h3>
    <p>Pause dispatch and start a maintenance hold before authorizing a worker change. The independent supervisor waits for the drain.</p>
    {error && <p role="alert">{error}</p>}
    {snapshot?.devices.length === 0 && <p>No release-managed supervisor has reported in.</p>}
    {!snapshot && !error && <p>Release-managed supervisor status unavailable.</p>}
    {snapshot?.devices.map(device => {
      const target = selection[device._id];
      const blocked = pending || !device.online || snapshot.requests.some(item => item.hostId === device._id &&
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
