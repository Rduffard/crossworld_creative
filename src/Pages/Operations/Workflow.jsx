import { useEffect, useState } from "react";
import Blueprints from "./Blueprints";

const scopes = { "workflow-job": "jobId", "workflow-project": "projectId", "workflow-objective": "objectiveId", "workflow-employee": "employeeId" };
const active = ["queued", "waiting", "running", "cancelling"];

function WorkflowRun({ node, childrenByParent, openRecord, openJob, observedAt, ancestry = [] }) {
  const children = childrenByParent.get(node._id) || [];
  const actor = node.assigneeName || node.reviewerName || node.employee?.name || node.studioActor?.name;
  const startedAt = node.startedAt && Date.parse(node.startedAt);
  const duration = startedAt && Math.max(0, Math.floor(((node.finishedAt ? Date.parse(node.finishedAt) : Date.parse(observedAt)) - startedAt) / 1000));
  const related = children.filter(child => !ancestry.includes(child._id));
  return <li>
    <details open={ancestry.length === 0 || undefined}>
      <summary><strong>{node.title || (node.studioActor ? "First Mate handoff" : "Execution")}</strong>
        <span> · {actor || node.workerRole || "Worker"} · {node.status}</span>
      </summary>
      <p>{[node.project, node.objective, node.employee?.role?.replaceAll("-", " ")].filter(Boolean).join(" · ")}</p>
      {node.startedAt && <p>Started <time dateTime={node.startedAt}>{new Date(node.startedAt).toLocaleString()}</time>
        {Number.isFinite(duration) && " · " + Math.floor(duration / 60) + "m " + duration % 60 + "s"}
      </p>}
      {node.error && <p>{node.error}</p>}
      {node.resumeDisposition === "parent-unavailable" && <p>Automatic continuation requires a completed parent turn.</p>}
      {node.resumeDisposition === "session-changed" && <p>The parent session changed before continuation.</p>}
      <div className="operations__modes">
        <button type="button" onClick={() => openJob(node._id, "Conversation")}>Open execution</button>
        {node.employeeId && <button type="button" onClick={() => openRecord("employee", node.employeeId)}>Employee</button>}
        {node.employee?.supervisorId && <button type="button" onClick={() => openRecord("employee", node.employee.supervisorId)}>Supervisor</button>}
        {node.objectiveId && <button type="button" onClick={() => openRecord("objective", node.objectiveId)}>Objective</button>}
        {node.hasReport && <button type="button" onClick={() => openRecord("report", node._id)}>Final report</button>}
        {node.resumeDisposition && !["parent-unavailable", "session-changed"].includes(node.resumeDisposition) &&
          <button type="button" onClick={() => openJob(node.resumeDisposition, "Conversation")}>Open parent continuation</button>}
      </div>
      {related.length > 0 && <ul className="operations__workflow-chain">{related.map(child => <WorkflowRun key={child._id} node={child}
        observedAt={observedAt} ancestry={[...ancestry, node._id]} childrenByParent={childrenByParent} openRecord={openRecord} openJob={openJob} />)}</ul>}
    </details>
  </li>;
}

export default function Workflow({ api, scope, recordId, openRecord, openJob }) {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    let current = true;
    let timer;
    const key = scopes[scope];
    const query = key && recordId ? "?" + new URLSearchParams({ [key]: recordId }) : "";
    async function load() {
      try {
        const result = await api("/workflow" + query);
        if (!current) return;
        setData(result);
        setProblem("");
        timer = setTimeout(load, result.nodes.some(node => active.includes(node.status)) ? 2500 : 12_000);
      } catch (failure) {
        if (!current) return;
        setProblem(failure.message);
        if (![401, 403].includes(failure.status)) timer = setTimeout(load, 12_000);
      }
    }
    load();
    return () => { current = false; clearTimeout(timer); };
  }, [api, scope, recordId]);

  if (!data) return <p role={problem ? "alert" : "status"}>{problem || "Loading workflow…"}</p>;
  const ids = new Set(data.nodes.map(node => node._id));
  const childrenByParent = new Map();
  const roots = [];
  for (const node of data.nodes) {
    const parent = node.delegatedBy?.sourceTurnId || node.reviewOf;
    if (!parent || !ids.has(parent) || parent === node._id) roots.push(node);
    else {
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent).push(node);
    }
  }
  return <section className="operations__panel">
    {!recordId && <Blueprints api={api} openJob={openJob} />}
    {problem && <p role="alert">{problem}</p>}
    {data.limited && <p>Showing the latest 40 assignments and their linked runs.</p>}
    {data.nodes.length === 0 && <p>No assignments match this view.</p>}
    <ul className="operations__workflow-chain">{(roots.length ? roots : data.nodes).map(node =>
      <WorkflowRun key={node._id} node={node} observedAt={data.observedAt} childrenByParent={childrenByParent} openRecord={openRecord} openJob={openJob} />)}</ul>
  </section>;
}
