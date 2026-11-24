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
        <p>Remote relay restart and update are unavailable. Supervisor activation and device readiness require verification on the Windows host.</p>
        {!snapshot.devices.length && <p>No home relays are registered.</p>}
        <ul className="operations-finance__entries">
          {snapshot.devices.map(device => <li key={device._id}>
            <div>
              <strong>{device.name}</strong>
              <small>{device.online ? "Relay online" : "Relay offline"}
                {device.lastSeen && ` · Heartbeat ${new Date(device.lastSeen).toLocaleString()}`}
              </small>
              <small>{device.online && device.media ? "Media enabled" : "Media unavailable"}</small>
              <dl className="operations__execution-summary">
                <div><dt>Last reported relay version</dt><dd>{device.relayVersion || "Unknown"}</dd></div>
                <div><dt>Installed relay version</dt><dd>Unknown from this view</dd></div>
                <div><dt>Supervisor</dt><dd>{device.supervised == null ? "Unreported" : device.supervised ? "Reported attached" : "Standalone"}</dd></div>
                <div><dt>Profiles</dt><dd>{device.profiles?.join(", ") || "Unreported"}</dd></div>
                <div><dt>Review slot</dt><dd>{device.reviewSlot ? "Advertised" : "Unreported"}</dd></div>
              </dl>
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
