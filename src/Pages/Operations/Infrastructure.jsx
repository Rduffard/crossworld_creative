import { useEffect, useState } from "react";
import "./finance.css";

const gib = (value) => (value / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 1 });
const capacity = (value) => value ? `${gib(value.free)} GiB available of ${gib(value.total)} GiB` : "Unavailable";

export default function Infrastructure({ request }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    request("/infrastructure").then(value => {
      if (current) setSnapshot(value);
    }).catch(failure => {
      if (current) setError(failure.message);
    });
    return () => { current = false; };
  }, [request, revision]);
  return (
    <section className="operations-finance" aria-label="Infrastructure">
      <div className="operations-finance__toolbar">
        <h2>Infrastructure</h2>
        <button onClick={() => {
          setSnapshot(null);
          setError("");
          setRevision(value => value + 1);
        }}>Refresh status</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!snapshot && !error && <p role="status">Checking relay status…</p>}
      {snapshot && <>
        <small>Checked {new Date(snapshot.observedAt).toLocaleTimeString()} · Cloud VM telemetry unavailable</small>
        {!snapshot.devices.length && <p>No home relays are registered.</p>}
        <ul className="operations-finance__entries">
          {snapshot.devices.map(device => <li key={device._id}>
            <div>
              <strong>{device.name}</strong>
              <small>{device.online ? "Relay online" : "Relay offline"}
                {device.lastSeen && ` · Heartbeat ${new Date(device.lastSeen).toLocaleString()}`}
              </small>
              <small>{device.online && device.media ? "Media enabled" : "Media unavailable"}</small>
              {device.resources ? <dl>
                <dt>CPU utilization</dt><dd>{device.resources.cpu == null ? "Unavailable" : `${device.resources.cpu}%`}</dd>
                <dt>Memory</dt><dd>{capacity(device.resources.memory)}</dd>
                <dt>C drive</dt><dd>{capacity(device.resources.drives.C)}</dd>
                <dt>D drive</dt><dd>{capacity(device.resources.drives.D)}</dd>
                <dt>Sampled</dt><dd>{new Date(device.resources.observedAt).toLocaleTimeString()}</dd>
              </dl> : <small>Local resource data unavailable. Set <code>OPERATIONS_RESOURCE_TELEMETRY=1</code> when starting a supported worker to report it.</small>}
            </div>
          </li>)}
        </ul>
      </>}
    </section>
  );
}
