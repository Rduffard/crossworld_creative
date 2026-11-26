import { useEffect, useRef, useState } from "react";
import ExecutiveBriefing from "./ExecutiveBriefing";
import { SubscriptionLink } from "./subscriptionUsage";

const time = (value) => value
  ? <time dateTime={value}>{new Date(value).toLocaleString()}</time>
  : "No heartbeat recorded";

function Usage({ observation, resumesAt }) {
  return <div className="operations__station-usage">
    <SubscriptionLink observation={observation} />
    {resumesAt && <p>Dependent turns are currently held until {time(new Date(resumesAt).toISOString())}.</p>}
  </div>;
}

export default function Headquarters({ api, openJob, openObjectives, openWorkforce, openOffice, openProject, openFinance,
  pendingGovernance, openGovernance, openCommand, openSchedules }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [missions, setMissions] = useState(null);
  const [missionError, setMissionError] = useState(false);
  const [attentionError, setAttentionError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readLocally, setReadLocally] = useState([]);
  const attentionHeading = useRef(null);

  useEffect(() => {
    let mounted = true;
    let timer;
    async function refresh() {
      const missionUpdate = api("/missions").then(result => {
        if (mounted) {
          setMissions(result);
          setMissionError(false);
        }
      }).catch(() => {
        if (mounted) setMissionError(true);
      });
      try {
        const result = await api("/headquarters");
        if (mounted) {
          setData(result);
          setError("");
        }
      } catch (failure) {
        if (mounted) setError(failure.message);
      }
      await missionUpdate;
      if (mounted) timer = setTimeout(refresh, document.hidden ? 30000 : 10000);
    }
    refresh();
    return () => { mounted = false; clearTimeout(timer); };
  }, [api]);

  if (!data) return <p role={error ? "alert" : "status"}>{error || "Loading headquarters…"}</p>;

  const { hosts, jobs, approvals, recent, workforce = [], next = [], objectives = {}, activeProjects, finance } = data;
  const incidents = recent.filter((entry) => ["failed", "interrupted"].includes(entry.status));
  const read = new Set([...(data.attentionRead ?? []), ...readLocally]);
  const visibleIncidents = unreadOnly ? incidents.filter(entry => !read.has("incident:" + entry._id)) : incidents;
  const visibleApprovals = unreadOnly ? approvals.filter(entry => !read.has("approval:" + entry.approval.id)) : approvals;
  const attentionCount = (pendingGovernance || 0) +
    approvals.filter(entry => !read.has("approval:" + entry.approval.id)).length +
    incidents.filter(entry => !read.has("incident:" + entry._id)).length;
  async function markRead(kind, id) {
    try {
      await api("/headquarters/attention", { method: "POST", body: { kind, id } });
      setReadLocally(value => [...value, kind + ":" + id]);
      setAttentionError("");
    } catch (failure) {
      setAttentionError(failure.message);
    }
  }

  function receipt(kind, id) {
    if (!id) return null;
    return read.has(kind + ":" + id)
      ? <small>Read</small>
      : <button type="button" className="operations__source" onClick={() => markRead(kind, id)}>Mark read</button>;
  }
  const open = (job, view = "Conversation") => (
    <button className="operations__source" type="button" onClick={() => openJob(job._id, view)}>
      {job.title || job.workspace}
    </button>
  );

  return <section className="operations__headquarters" aria-label="Headquarters">
    {error && <p className="operations__briefing" role="alert">Updates unavailable. Showing the last successful refresh. {error}</p>}
    <section className="operations__command-deck" aria-labelledby="operations-command-title">
      <div className="operations__command-copy">
        <p className="operations__command-status" data-paused={!!data.paused}>{error ? "Dispatch status stale" : data.paused === true ? "Dispatch paused" : data.paused === false ? "Dispatch open" : "Dispatch status unavailable"}</p>
        <h1 id="operations-command-title">Headquarters</h1>
        <div className="operations__modes">
          <button type="button" onClick={openOffice}>Enter the office</button>
          <button type="button" onClick={openObjectives}>View objectives</button>
          {attentionCount > 0 && <button type="button" className="operations__attention-action"
            onClick={() => {
              setUnreadOnly(true);
              attentionHeading.current?.focus();
            }}>Attention ({attentionCount})</button>}
        </div>
      </div>
    </section>
    <ExecutiveBriefing data={data} missions={missions} missionError={missionError} pendingGovernance={pendingGovernance}
      openJob={openJob} openCommand={openCommand} openGovernance={openGovernance} openSchedules={openSchedules} time={time} />
    <section className="operations__panel operations__briefing">
      <div className="operations__briefing-title">
        <h2>Studio activity</h2>
      </div>
      <dl className="operations__counters">
        <div><dt>Hosts online</dt><dd>{hosts.online || 0}<small>{hosts.offline || 0} offline</small></dd></div>
        <div><dt>Turns running</dt><dd>{(jobs.running || 0) + (jobs.cancelling || 0)}</dd></div>
        <div><dt>Turns waiting</dt><dd>{(jobs.queued || 0) + (jobs.waiting || 0)}</dd></div>
        <div><dt>Scheduled turns</dt><dd>{jobs.scheduled || 0}</dd></div>
        <div><dt>Active objectives</dt><dd><button type="button" onClick={openObjectives}
          aria-label={`View objectives, ${objectives.active || 0} active`}>{objectives.active || 0}<small>View objectives</small></button></dd></div>
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
        {(host.jobs || (host.job ? [host.job] : [])).map(job => <p key={job._id}>
          {open(job, "Execution")}{job.employee && <small> {job.employee}</small>}
          {job.slot === "background review" && <small> Background review</small>}
        </p>)}
        <small>{host.profiles?.join(" · ") || "Capabilities pending"}</small>
        <small>{time(host.lastSeen)}</small>
        <Usage observation={host.usage} resumesAt={host.usageResumesAt} />
      </li>)}</ul>
    </section>
    <section className="operations__panel operations__attention">
      <div className="operations__briefing-title">
        <h2 ref={attentionHeading} tabIndex={-1}>Attention</h2>
        <label><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} /> Unread only</label>
      </div>
      {attentionError && <p role="alert">{attentionError}</p>}
      {visibleApprovals.length === 0 && visibleIncidents.length === 0 && !pendingGovernance &&
        <p>{unreadOnly ? "No unread approvals or recent failures." : "No approvals or recent failures."}</p>}
      <ul className="operations__feed">
        {pendingGovernance > 0 && <li>
          <strong>{pendingGovernance} governance {pendingGovernance === 1 ? "request" : "requests"}</strong>
          <button type="button" className="operations__source" onClick={openGovernance}>Open approval inbox</button>
        </li>}
        {visibleApprovals.map((entry) => <li key={entry._id}>
          <strong>{entry.approval.operation} approval</strong>
          {open(entry, "Execution")}
          <small>Expires {time(new Date(entry.approval.expiresAt).toISOString())}</small>
          {receipt("approval", entry.approval.id)}
        </li>)}
        {visibleIncidents.map((entry) => <li key={entry._id}>
          <strong>{entry.status}</strong>{open(entry, "Execution")}<small>{time(entry.finishedAt)}</small>
          {receipt("incident", entry._id)}
        </li>)}
      </ul>
    </section>
    {activeProjects && <section className="operations__panel" aria-label="Active projects">
      <h2>Active projects</h2>
      {activeProjects.length === 0 && <p>No active projects. Use Settings to review the studio foundation.</p>}
      <ul className="operations__feed">{activeProjects.map(project => <li key={project._id}>
        <button type="button" className="operations__source" onClick={() => openProject(project._id)}>{project.name}</button>
        <small>{project.workspace}</small>
      </li>)}</ul>
    </section>}
    {finance && <section className="operations__panel" aria-label="Studio expenses">
      <div className="operations__briefing-title">
        <h2>Studio expenses</h2>
        <button type="button" className="operations__source" onClick={openFinance}>Open Finance</button>
      </div>
      <small>{finance.month} · Recorded expenses · Cloud bills unavailable</small>
      {finance.expenses.length ? <ul className="operations__feed">{finance.expenses.map(item => <li key={item.currency}>
        <strong>{new Intl.NumberFormat(undefined, { style: "currency", currency: item.currency }).format(item.amount / 100)}</strong>
      </li>)}</ul> : <p>No manual expenses recorded this month.</p>}
    </section>}
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
