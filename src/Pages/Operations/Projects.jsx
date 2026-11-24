import { useEffect, useState } from "react";
import { workspaceNames } from "./workspaces";

const openStates = new Set(["scheduled", "queued", "waiting", "running", "cancelling"]);

function ProjectBrief({ api, record, openObjectives, openWorkflow, openRecord, openJob }) {
  const [brief, setBrief] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    const query = "?projectId=" + encodeURIComponent(record._id);
    Promise.allSettled([api("/objectives" + query), api("/workflow" + query)]).then(([objectives, workflow]) => {
      if (current) setBrief({ objectives, workflow });
    });
    return () => { current = false; };
  }, [api, record._id, attempt]);

  function refresh() {
    setBrief(null);
    setAttempt(value => value + 1);
  }

  const objectives = brief?.objectives.status === "fulfilled" ? brief.objectives.value : null;
  const workflow = brief?.workflow.status === "fulfilled" ? brief.workflow.value : null;
  const runs = workflow?.nodes.filter(node => node.projectId === record._id) || [];
  const active = runs.filter(node => openStates.has(node.status));
  const outcomes = runs.filter(node => !openStates.has(node.status)).slice(0, 5);

  return <>
    <header className="operations__project-brief">
      <p>{workspaceNames[record.workspace] || record.workspace} · {record.status}</p>
      <h2>{record.name}</h2>
      <p className="operations__knowledge-text">{record.description}</p>
      <div className="operations__modes">
        <button type="button" onClick={() => openObjectives(record._id)}>View project objectives</button>
        <button type="button" onClick={() => openWorkflow(record._id)}>View project workflow</button>
        <button type="button" disabled={!brief} onClick={refresh}>Refresh brief</button>
      </div>
    </header>
    {!brief && <p role="status">Loading project brief…</p>}
    {brief && <div className="operations__project-lanes">
      <section aria-label="Project objectives">
        <h3>Recent objectives</h3>
        {objectives === null ? <p role="alert">Project objectives are unavailable.</p> :
          objectives.length === 0 ? <p>No objectives recorded.</p> :
          <ul className="operations__feed">{objectives.slice(0, 8).map(objective => <li key={objective._id}>
            <button type="button" className="operations__source" onClick={() => openRecord("objective", objective._id)}>{objective.title}</button>
            <small>{objective.status}{objective.priority && " · " + objective.priority + " priority"}</small>
          </li>)}</ul>}
      </section>
      <section aria-label="Project executions">
        <h3>Open in recent workflow</h3>
        {workflow === null ? <p role="alert">Project workflow is unavailable.</p> : <>
          <small>Observed <time dateTime={workflow.observedAt}>{new Date(workflow.observedAt).toLocaleString()}</time></small>
          {workflow.limited && <p>Showing the latest 40 assignments and linked runs.</p>}
          {!active.length && <p>No open executions in this view.</p>}
          <ul className="operations__feed">{active.map(node => <li key={node._id}>
            <button type="button" className="operations__source" onClick={() => openJob(node._id, "Execution")}>{node.title || "Open execution"}</button>
            <small>{node.status}{node.employee?.name && " · " + node.employee.name}</small>
          </li>)}</ul>
          <h3>Recent outcomes</h3>
          {!outcomes.length && <p>No finished executions in this view.</p>}
          <ul className="operations__feed">{outcomes.map(node => <li key={node._id}>
            <button type="button" className="operations__source" onClick={() => openJob(node._id, "Execution")}>{node.title || "Open execution"}</button>
            <small>{node.status}</small>
            {node.hasReport && <button type="button" className="operations__source" onClick={() => openRecord("report", node._id)}>Read report</button>}
          </li>)}</ul>
        </>}
      </section>
    </div>}
  </>;
}

export default function Projects({ api, initialId, openObjectives, openWorkflow, openRecord, openJob }) {
  const [records, setRecords] = useState(null);
  const selection = initialId;

  function selectProject(id) {
    setError("");
    openRecord("project", id);
  }
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    const detailRequest = selection && selection !== "new" ? api("/projects/" + selection) : Promise.resolve(null);
    api("/projects").then(list => { if (current) setRecords(list); })
      .catch(failure => { if (current) setError(failure.message); });
    detailRequest.then(record => { if (current) setDetail(record); })
      .catch(failure => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [api, selection, version]);

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const body = { ...values, repositories: values.repositories.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) };
    if (record) body.revision = record.revision;
    setPending(true);
    setError("");
    try {
      const result = await api(record ? "/projects/" + record._id : "/projects", { method: record ? "PUT" : "POST", body });
      if (result?._id) selectProject(result._id);
      setVersion((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) setVersion((value) => value + 1);
    } finally {
      setPending(false);
    }
  }

  const record = detail?._id === selection ? detail : null;
  return <section className="operations__layout operations__knowledge operations__projects" aria-label="Projects">
    <section className="operations__panel">
      <h2>Project roster</h2>
      {!records && !error && <p role="status">Loading projects…</p>}
      {records?.length === 0 && <p>No projects recorded.</p>}
      <ul className="operations__feed">{records?.map((entry) => <li key={entry._id}>
        <button type="button" aria-pressed={selection === entry._id} onClick={() => selectProject(entry._id)}>{entry.name}</button>
        <small>{entry.workspace} · {entry.status}</small>
      </li>)}</ul>
      <button type="button" onClick={() => selectProject("new")}>Add project</button>
    </section>
    <section className="operations__panel">
      {!record && <h2>{selection === "new" ? "New project" : "Project details"}</h2>}
      {error && <p role="alert">{error}</p>}
      {selection && selection !== "new" && !record && !error && <p role="status">Loading project…</p>}
      {record && <ProjectBrief key={record._id} api={api} record={record} openObjectives={openObjectives}
        openWorkflow={openWorkflow} openRecord={openRecord} openJob={openJob} />}
      {(record || selection === "new") && <details key={selection} open={selection === "new" || undefined}>
        <summary>{record ? "Project settings" : "Project configuration"}</summary>
        <form key={record ? record._id + "/" + record.revision : "new"} onSubmit={save}>
          <label>Name <input name="name" required maxLength={100} defaultValue={record?.name} /></label>
          <label>Description <textarea name="description" required maxLength={1500} defaultValue={record?.description} /></label>
          <label>Workspace <select name="workspace" defaultValue={record?.workspace || "development"}>
            <option value="development">Development</option><option value="workshop">Workshop</option>
          </select></label>
          <label>Status <select name="status" defaultValue={record?.status || "active"}>
            <option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option>
          </select></label>
          <label>Repository references, one per line <textarea name="repositories" maxLength={2412} defaultValue={record?.repositories?.join("\n")} /></label>
          <label>Project instructions <textarea name="instructions" maxLength={6000} defaultValue={record?.instructions} /></label>
          <button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save project" : "Create project"}</button>
        </form>
      </details>}
      {!selection && <p>Select a project to inspect its settings and objectives.</p>}
    </section>
  </section>;
}
