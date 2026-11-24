import { useEffect, useState } from "react";

const counters = [
  ["Executing", "running"], ["Stopping", "cancelling"], ["Queued", "queued"],
  ["Awaiting predecessor", "waiting"], ["Scheduled", "scheduled"], ["Finished turns", "completed"],
  ["Failed", "failed"], ["Interrupted", "interrupted"],
];

export default function Headquarters({ api, openJob }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let timer;
    async function refresh() {
      try {
        const result = await api("/headquarters");
        if (mounted) {
          setData(result);
          setError("");
        }
      } catch (failure) {
        if (mounted) setError(failure.message);
      }
      if (mounted) timer = setTimeout(refresh, 5000);
    }
    refresh();
    return () => { mounted = false; clearTimeout(timer); };
  }, [api]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading headquarters…</p>;

  return <section className="operations__headquarters" aria-label="Headquarters">
    <section className="operations__panel">
      <h2>Host and relay activity</h2>
      <p>{data.hosts.online || 0} hosts online · {data.hosts.offline || 0} offline</p>
      <dl className="operations__counters">{counters.map(([label, key]) => <div key={key}>
        <dt>{label}</dt><dd>{data.jobs[key] || 0}</dd>
      </div>)}</dl>
    </section>
    <section className="operations__panel">
      <h2>Live approvals</h2>
      {data.approvals.length === 0 && <p>No pending worker approvals.</p>}
      <ul>{data.approvals.map((entry) => <li key={entry._id}>
        <button type="button" onClick={() => openJob(entry._id, "Execution")}>{entry.approval.operation}</button>
      </li>)}</ul>
    </section>
    <section className="operations__panel">
      <h2>Recent turn outcomes</h2>
      {data.recent.length === 0 && <p>No finished turns recorded.</p>}
      <ul>{data.recent.map((entry) => <li key={entry._id}>
        <button type="button" onClick={() => openJob(entry._id, "Conversation")}>
          {entry.workspace} · {entry.status}
        </button>{" "}
        <time dateTime={entry.finishedAt}>{new Date(entry.finishedAt).toLocaleString()}</time>
      </li>)}</ul>
    </section>
  </section>;
}
