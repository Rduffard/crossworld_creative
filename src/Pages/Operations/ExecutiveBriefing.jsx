import { useEffect, useState } from "react";
import { deploymentRuns } from "./engineeringWorkflows";
import { SubscriptionLink } from "./subscriptionUsage";
import "./ExecutiveBriefing.css";

const displayedMissions = 4;
const displayedOutcomes = 3;
const displayedDeployments = 3;
const missionWeight = { blocked: 0, active: 1, paused: 2, authorized: 3, expired: 4 };

function newestExecution(mission) {
  if (mission.execution?._id) return mission.execution._id;
  return Object.values(mission.results || {})
    .filter(result => result.jobId)
    .sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""))[0]?.jobId;
}

export default function ExecutiveBriefing({
  api, data, missions, missionError, pendingGovernance, openJob, openCommand, openMission, openGovernance, openSchedules, time, headingRef,
}) {
  const [engineering, setEngineering] = useState(null);
  const [engineeringError, setEngineeringError] = useState(false);
  useEffect(() => {
    let current = true;
    api("/engineering").then(snapshot => {
      if (current) setEngineering(snapshot);
    }).catch(() => {
      if (current) setEngineeringError(true);
    });
    return () => { current = false; };
  }, [api]);

  const deployments = (engineering?.repositories || []).flatMap(repo =>
    deploymentRuns(repo).map(run => ({
      ...run, repository: repo.name, defaultBranch: repo.default_branch,
    })))
    .filter(run => run.head_branch === run.defaultBranch)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, displayedDeployments);
  const current = (missions || []).filter(mission => Object.hasOwn(missionWeight, mission.status))
    .sort((a, b) => missionWeight[a.status] - missionWeight[b.status]);
  const missionDecisions = missionError ? [] : current.filter(mission =>
    mission.status === "active" && mission.awaitingApprovals?.length);
  const approvals = data.approvals.length;
  const outcomes = data.recent.filter(job => job.status === "completed" && !job.executiveTrigger).slice(0, displayedOutcomes);
  const next = data.next?.[0];
  const relay = data.workforce?.find(host => host.online && host.usage)
    || data.workforce?.find(host => host.usage);

  return <section className="operations__panel operations__briefing operations-executive" aria-labelledby="operations-executive-title">
    <header className="operations__briefing-title">
      <h2 id="operations-executive-title" ref={headingRef} tabIndex={-1}>Executive briefing</h2>
      {data.observedAt && <span>As of {time(data.observedAt)}</span>}
    </header>
    <div className="operations-executive__grid">
      <section>
        <h3>Decisions</h3>
        <ul className="operations-executive__list">
          {pendingGovernance == null ? <li>Governance requests unavailable.</li>
            : pendingGovernance > 0 && <li><button type="button" className="operations__source" onClick={openGovernance}>
              {pendingGovernance} {pendingGovernance === 1 ? "governance request" : "governance requests"}
            </button></li>}
          {data.approvals.slice(0, 3).map(entry => <li key={entry._id}>
            <button type="button" className="operations__source" onClick={() => openJob(entry._id, "Execution")}>
              {entry.approval.operation} · {entry.title || entry.workspace}
            </button>
            <small>Expires {time(new Date(entry.approval.expiresAt).toISOString())}</small>
          </li>)}
          {missionDecisions.map(mission => <li key={mission._id}>
            <button type="button" className="operations__source" onClick={() => openMission(mission._id)}>
              Review decisions for {mission.title}
            </button>
            <small>{mission.awaitingApprovals.length === 1 ? "1 mission step awaiting approval"
              : `${mission.awaitingApprovals.length} mission steps awaiting approval`}</small>
          </li>)}
        </ul>
        {approvals > 3 && <p>{approvals - 3} more execution requests in Attention below.</p>}
        {pendingGovernance === 0 && approvals === 0 && !missionDecisions.length && missions && !missionError && <p>No decisions pending.</p>}
      </section>
      <section>
        <h3>Missions</h3>
        {missionError && <p role="status">{missions ? "Showing the last mission update." : "Mission status unavailable."}</p>}
        {!missions && !missionError && <p role="status">Loading missions…</p>}
        {missions && !current.length && <p>No open missions.</p>}
        <ul className="operations-executive__list">
          {current.slice(0, displayedMissions).map(mission => {
            const execution = newestExecution(mission);
            const nextStep = mission.steps?.find(step => step.key === mission.next)?.title;
            const detail = mission.reason || mission.dispatchHold || nextStep;
            return <li key={mission._id} data-state={mission.status}>
              {mission.status === "blocked"
                ? <button type="button" className="operations__source" onClick={() => openMission(mission._id)}>{mission.title}</button>
                : execution
                ? <button type="button" className="operations__source" onClick={() => openJob(execution, "Execution")}>{mission.title}</button>
                : <button type="button" className="operations__source" onClick={() => openMission(mission._id)}>{mission.title}</button>}
              <small><strong>{mission.status}</strong>{detail && ` · ${detail}`}</small>
              {mission.status === "blocked" && execution &&
                <button type="button" className="operations__source" onClick={() => openJob(execution, "Conversation")}
                  aria-label={`Open supporting conversation for ${mission.title}`}>Supporting conversation</button>}
            </li>;
          })}
        </ul>
        {!!current.length && <button type="button" className="operations__source" onClick={openCommand}>
          View missions in Command Center{current.length > displayedMissions ? ` (${current.length} open)` : ""}
        </button>}
      </section>
      <section>
        <h3>Deployment workflows</h3>
        {engineeringError && <p role="status">Deployment workflow data unavailable.</p>}
        {!engineering && !engineeringError && <p role="status">Loading deployment workflows…</p>}
        {engineering && (engineering.stale || engineering.degraded) && <p role="status">GitHub workflow data is stale or incomplete.</p>}
        {engineering && deployments.length === 0 && <p>No deployment workflows in the latest GitHub snapshot.</p>}
        <ul className="operations-executive__list">
          {deployments.map(run => <li key={`${run.repository}/${run.id}`}>
            <a className="operations__source" href={`https://github.com/${run.repository}/actions/runs/${run.id}`}
              target="_blank" rel="noreferrer">{run.name}</a>
            <small>{[run.repository, run.conclusion || run.status].filter(Boolean).join(" · ")}
              {run.updated_at && <> · {time(run.updated_at)}</>}</small>
          </li>)}
        </ul>
      </section>
      <section>
        <h3>Recent completions</h3>
        {outcomes.length === 0 && <p>No recent completions reported.</p>}
        <ul className="operations-executive__list">
          {outcomes.map(job => <li key={job._id}>
            <button type="button" className="operations__source" onClick={() => openJob(job._id, "Conversation")}>{job.title || job.workspace}</button>
            <small>{job.assigneeName || job.reviewerName || job.conversationActor?.name || job.studioActor?.name || "Unattributed"} · {time(job.finishedAt)}</small>
          </li>)}
        </ul>
      </section>
      <section>
        <h3>Schedule and capacity</h3>
        <ul className="operations-executive__list">
          <li>{next ? <>
            <button type="button" className="operations__source" onClick={() => openJob(next._id, "Execution")}>{next.title || next.workspace}</button>
            <small>Scheduled for {time(next.scheduledAt)}</small>
          </> : <p>No scheduled turns.</p>}</li>
          {relay && <li><strong>{relay.label}</strong><SubscriptionLink observation={relay.usage} /></li>}
        </ul>
        <button type="button" className="operations__source" onClick={openSchedules}>Open schedules</button>
      </section>
    </div>
  </section>;
}
