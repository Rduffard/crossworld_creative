import { useEffect, useState } from "react";

const time = (value) => value
  ? <time dateTime={value}>{new Date(value).toLocaleString()}</time>
  : "No heartbeat recorded";

function Usage({ observation, resumesAt }) {
  if (!observation) return <small>Subscription usage unavailable</small>;
  const windows = [["Primary", observation.primary], ["Secondary", observation.secondary]];
  return <details className="operations__station-usage">
    <summary>Subscription usage</summary>
    {windows.map(([label, window]) => window && <p key={label}>
      {label} · {window.usedPercent}% used{window.windowDurationMins && ` over ${window.windowDurationMins.toLocaleString()} min`}
      <small>Resets {window.resetsAt ? time(new Date(window.resetsAt * 1000).toISOString()) : "at an unreported time"}</small>
    </p>)}
    {resumesAt && <p>Dependent turns are currently held until {time(new Date(resumesAt).toISOString())}.</p>}
    <small>Last observed {time(new Date(observation.observedAt).toISOString())}</small>
  </details>;
}

export default function Headquarters({ api, openJob, openObjectives, openWorkforce, pendingGovernance, openGovernance }) {
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

  if (!data) return <p role={error ? "alert" : "status"}>{error || "Loading headquarters…"}</p>;

  const { hosts, jobs, approvals, recent, workforce = [], next = [], objectives = {} } = data;
  const incidents = recent.filter((entry) => ["failed", "interrupted"].includes(entry.status));
  const open = (job, view = "Conversation") => (
    <button className="operations__source" type="button" onClick={() => openJob(job._id, view)}>
      {job.title || job.workspace}
    </button>
  );

  return <section className="operations__headquarters" aria-label="Headquarters">
    {error && <p className="operations__briefing" role="alert">Updates unavailable. Showing the last successful refresh. {error}</p>}
    <section className="operations__panel operations__briefing">
      <div className="operations__briefing-title">
        <h2>Operational briefing</h2>
        <span>{data.paused ? "Dispatch paused" : data.observedAt ? <>As of {time(data.observedAt)}</> : null}</span>
      </div>
      <dl className="operations__counters">
        <div><dt>Hosts online</dt><dd>{hosts.online || 0}<small>{hosts.offline || 0} offline</small></dd></div>
        <div><dt>Turns running</dt><dd>{(jobs.running || 0) + (jobs.cancelling || 0)}</dd></div>
        <div><dt>Turns waiting</dt><dd>{(jobs.queued || 0) + (jobs.waiting || 0)}</dd></div>
        <div><dt>Scheduled turns</dt><dd>{jobs.scheduled || 0}</dd></div>
        <div><dt>Active objectives</dt><dd><button type="button" onClick={openObjectives}>{objectives.active || 0}<span className="operations__sr-only"> active objectives</span></button></dd></div>
      </dl>
    </section>
    <section className="operations__panel operations__office" aria-labelledby="operations-office">
      <div className="operations__briefing-title">
        <h2 id="operations-office">Execution floor</h2>
        <button type="button" className="operations__source" onClick={openWorkforce}>View workforce</button>
      </div>
      {workforce.length === 0 && <p>No execution hosts reported.</p>}
      <ul className="operations__stations">{workforce.map((host) => <li key={host._id} data-online={host.online} data-state={host.state}>
        <div className="operations__station-title"><strong>{host.label}</strong><span>{host.online ? "Connected" : "Offline"}</span></div>
        {(host.online || host.job) && <p className="operations__station-state">{host.state}</p>}
        {host.job && <p>{open(host.job, "Execution")}</p>}
        <small>{host.profiles?.join(" · ") || "Capabilities pending"}</small>
        <small>{time(host.lastSeen)}</small>
        <Usage observation={host.usage} resumesAt={host.usageResumesAt} />
      </li>)}</ul>
    </section>
    <section className="operations__panel operations__attention">
      <h2>Attention</h2>
      {approvals.length === 0 && incidents.length === 0 && !pendingGovernance && <p>No approvals or recent failures.</p>}
      <ul className="operations__feed">
        {pendingGovernance > 0 && <li>
          <strong>{pendingGovernance} governance {pendingGovernance === 1 ? "request" : "requests"}</strong>
          <button type="button" className="operations__source" onClick={openGovernance}>Open approval inbox</button>
        </li>}
        {approvals.map((entry) => <li key={entry._id}>
          <strong>{entry.approval.operation} approval</strong>
          {open(entry, "Execution")}
          <small>Expires {time(new Date(entry.approval.expiresAt).toISOString())}</small>
        </li>)}
        {incidents.map((entry) => <li key={entry._id}>
          <strong>{entry.status}</strong>{open(entry, "Execution")}<small>{time(entry.finishedAt)}</small>
        </li>)}
      </ul>
    </section>
    <section className="operations__panel">
      <h2>Schedule</h2>
      {next.length === 0 && <p>No scheduled turns.</p>}
      <ul className="operations__feed">{next.map((entry) => <li key={entry._id}>
        {open(entry)}<small>{Date.parse(entry.scheduledAt) <= Date.parse(data.observedAt) ? "Overdue · " : ""}{time(entry.scheduledAt)}</small>
      </li>)}</ul>
    </section>
    <section className="operations__panel">
      <h2>Recent outcomes</h2>
      {recent.length === 0 && <p>No finished turns recorded.</p>}
      <ul className="operations__feed">{recent.map((entry) => <li key={entry._id}>
        {open(entry)}<small>{entry.status} · {time(entry.finishedAt)}</small>
      </li>)}</ul>
    </section>
  </section>;
}
