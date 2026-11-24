import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const subscriptionPath = "/operations?workspace=finance&source=finance&record=usage";

function useUsageClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function usageState(observation, now) {
  if (!observation) return "Unavailable";
  const windows = [observation.primary, observation.secondary].filter(Boolean);
  const expired = windows.length > 0 && windows.every(window => window.resetsAt && window.resetsAt * 1000 <= now);
  return expired || now - observation.observedAt > 600_000 ? "Stale" : "Fresh";
}

function windowLabel(minutes) {
  if (minutes % 1440 === 0) return `${(minutes / 1440).toLocaleString()}-day window`;
  if (minutes % 60 === 0) return `${(minutes / 60).toLocaleString()}-hour window`;
  return `${minutes.toLocaleString()}-minute window`;
}

function remainingAllowance(window) {
  const used = window?.usedPercent;
  return typeof used === "number" && Number.isFinite(used) && used >= 0 && used <= 100 ? 100 - used : null;
}

function percent(value) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function SubscriptionLink({ observation }) {
  const now = useUsageClock();
  const state = usageState(observation, now);
  const window = [observation?.primary, observation?.secondary].find(window =>
    window?.windowDurationMins === 10_080 && (!window.resetsAt || window.resetsAt * 1000 > now));
  const remaining = state === "Fresh" ? remainingAllowance(window) : null;
  const label = remaining === null ? "Usage: " + (state === "Fresh" ? "weekly data unavailable" : state.toLowerCase())
    : "Weekly: " + percent(remaining) + "% remaining";
  return <Link to={subscriptionPath} className="operations__subscription-link"
    data-low={remaining !== null && remaining <= 15}
    title={window?.resetsAt ? "Resets " + new Date(window.resetsAt * 1000).toLocaleString() : undefined}>
    {label}
  </Link>;
}

function UsageHistory({ request, host, observedAt }) {
  const [result, setResult] = useState(null);
  const [visible, setVisible] = useState(12);
  useEffect(() => {
    let active = true;
    request(`/hosts/${encodeURIComponent(host)}/usage`).then(({ observations }) => {
      if (active) setResult({ observations });
    }).catch(error => {
      if (active) setResult({ error: error.status === 404 ? "Usage history is unavailable on this backend." : error.message });
    });
    return () => { active = false; };
  }, [request, host, observedAt]);
  if (!result) return <p role="status">Loading usage history…</p>;
  if (result.error) return <p role="status">{result.error}</p>;
  if (!result.observations?.length) return <p>No historical observations have been captured for this relay.</p>;
  return <>
    <p>Up to 96 samples from new relay reports, sampled every 15 minutes when observations arrive and at allowance window changes.</p>
    <div className="operations-finance__history">
      <table>
        <caption>Provider allowance observations</caption>
        <thead><tr><th scope="col">Observed</th><th scope="col">Primary</th><th scope="col">Secondary</th></tr></thead>
        <tbody>{result.observations.slice(0, visible).map(point => <tr key={point.observedAt}>
          <td><time dateTime={new Date(point.observedAt).toISOString()}>{new Date(point.observedAt).toLocaleString()}</time></td>
          {[point.primary, point.secondary].map((window, index) => <td key={index}>{window ? <>
            {remainingAllowance(window) === null ? "Unavailable" : percent(remainingAllowance(window)) + "% remaining"}
            {window.resetsAt && <small>Reset {new Date(window.resetsAt * 1000).toLocaleString()}</small>}
          </> : "Unavailable"}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {result.observations.length > visible && <button type="button" onClick={() => setVisible(count => count + 12)}>Show earlier observations</button>}
  </>;
}

export function SubscriptionDetails({ hosts, request }) {
  const now = useUsageClock();
  const [selectedId, setSelectedId] = useState("");
  const selected = hosts.find(host => host._id === selectedId) || hosts.find(host => host.online) || hosts[0];
  return <section aria-label="Subscriptions and usage">
    <h2>Subscriptions &amp; Usage</h2>
    <p>Source · Provider rate-limit observations reported by the Codex CLI relay. These are allowance measurements. Monetary expenses are recorded in the ledger.</p>
    {!hosts.length && <p>No registered relay is available to report subscription usage.</p>}
    {hosts.map(({ _id, label, usage, online }) => <section key={_id}>
      <h3>{label}</h3>
      <p>{usageState(usage, now)} · Relay {online ? "online" : "offline"}</p>
      {usage ? <>
        <p>Last observation <time dateTime={new Date(usage.observedAt).toISOString()}>{new Date(usage.observedAt).toLocaleString()}</time></p>
        <dl>{[["Primary", usage.primary], ["Secondary", usage.secondary]].map(([name, window]) => {
          if (!window) return <div key={name}><dt>{name} window</dt><dd>Unavailable</dd></div>;
          const reset = window.resetsAt ? new Date(window.resetsAt * 1000) : null;
          const remaining = remainingAllowance(window);
          return <div key={name}>
            <dt>{window.windowDurationMins === 10_080 ? "Weekly" : name} allowance</dt>
            <dd>{remaining === null ? "Unavailable" : percent(remaining) + "% remaining"} · {window.usedPercent}% used
              {window.windowDurationMins && ` · ${windowLabel(window.windowDurationMins)}`}</dd>
            <dd>Reset {reset ? <time dateTime={reset.toISOString()}>{reset.toLocaleString()}</time> : "unreported"}</dd>
          </div>;
        })}</dl>
      </> : <p>No provider observation has been reported by this relay.</p>}
    </section>)}
    {selected && <section aria-label="Usage history">
      <h3>Usage history</h3>
      {hosts.length > 1 && <label>Relay <select value={selected._id} onChange={event => setSelectedId(event.target.value)}>
        {hosts.map(host => <option key={host._id} value={host._id}>{host.label}</option>)}
      </select></label>}
      <UsageHistory key={selected._id} host={selected._id} request={request} observedAt={selected.usage?.observedAt} />
    </section>}
    <p>Per-model allowances and employee or project attribution are unavailable from this account-level feed.</p>
  </section>;
}
