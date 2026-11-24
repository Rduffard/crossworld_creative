import { useEffect, useRef, useState } from "react";

import { MediaPreview } from "./MediaAttachments";

const stages = {
  draft: "Draft", active: "Active brief", proposed: "Proposed direction", approved: "Owner-approved direction",
  superseded: "Superseded", "technical-review": "Technical validation", "artistic-review": "Artistic review",
  "independent-review": "Independent verification", revision: "Corrections requested", recommended: "Recommended to owner",
  accepted: "Accepted by owner", rejected: "Rejected",
};
const labels = {
  draft: "Return to draft", active: "Activate brief", proposed: "Propose direction", approved: "Approve direction",
  superseded: "Mark superseded", "technical-review": "Send to technical validation", "artistic-review": "Send to artistic review",
  "independent-review": "Send to independent verification", revision: "Request corrections", recommended: "Recommend to owner",
  accepted: "Accept candidate", rejected: "Reject",
};
const detailPath = (id) => "/creative/" + encodeURIComponent(id);

function ReferenceOptions({ references, projectId, linked = [] }) {
  const choices = new Map(linked.map((entry) => [entry._id, entry]));
  references.filter((entry) => (!entry.projectId || entry.projectId === projectId) && entry.status !== "superseded")
    .forEach((entry) => choices.set(entry._id, entry));
  return choices.size > 0 && <label>Reference and evidence media
    <select name="referenceIds" multiple size={Math.min(choices.size, 4)} defaultValue={linked.map((entry) => entry._id)} key={projectId}>
      {[...choices.values()].map((entry) => <option value={entry._id} key={entry._id}>{entry.name} · {entry.status}</option>)}
    </select>
  </label>;
}

function ObjectiveOptions({ api, projectId, currentId }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    api("/objectives?" + new URLSearchParams({ projectId })).then((objectives) => {
      if (active) setResult({ objectives });
    }).catch((failure) => {
      if (active) setResult({ error: failure.message });
    });
    return () => { active = false; };
  }, [api, projectId]);
  if (!projectId) return null;
  if (!result) return <p role="status">Loading project objectives…</p>;
  if (result.error) return <p role="alert">{result.error}</p>;
  const choices = result.objectives;
  return <label>Objective for independent QA
    <select name="objectiveId" defaultValue={currentId || ""}>
      <option value="">{currentId ? "Keep linked objective" : "Choose an objective"}</option>
      {currentId && !choices.some(({ _id }) => _id === currentId) && <option value={currentId}>Linked objective</option>}
      {choices.map((objective) => <option key={objective._id} value={objective._id}>{objective.title}</option>)}
    </select>
  </label>;
}

function CreateRecord({ api, projects, references, create, pending }) {
  const [projectId, setProjectId] = useState("");
  const [kind, setKind] = useState("brief");
  return <details>
    <summary>Create brief or direction</summary>
    <form onReset={() => { setProjectId(""); setKind("brief"); }} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { objectiveId, ...fields } = Object.fromEntries(form);
      create({ ...fields, referenceIds: form.getAll("referenceIds"), ...(objectiveId ? { objectiveId } : {}) }, event.currentTarget);
    }}>
      <label>Record type
        <select name="kind" defaultValue="brief" onChange={(event) => setKind(event.target.value)}>
          <option value="brief">Creative brief</option><option value="direction">Creative direction</option>
        </select>
      </label>
      {kind === "brief" && <ObjectiveOptions key={projectId} api={api} projectId={projectId} />}
      <label>Project
        <select name="projectId" required onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Choose a project</option>
          {projects.filter((project) => project.status === "active").map((project) =>
            <option key={project._id} value={project._id}>{project.name}</option>)}
        </select>
      </label>
      <label>Title <input name="title" required maxLength={160} /></label>
      <label>Requirements, acceptance criteria or visual principles <textarea name="content" required maxLength={8000} /></label>
      <label>Sources and provenance <textarea name="source" required maxLength={1500} /></label>
      <ReferenceOptions references={references} projectId={projectId} />
      <button type="submit" disabled={pending}>Create draft</button>
    </form>
  </details>;
}

function ReviewRecord({ api, record, project, references, openSource, update, pending }) {
  const [nextStage, setNextStage] = useState("");
  const editable = ["draft", "active", "revision"].includes(record.stage);
  const linked = record.linkedReferences || [];
  return <section aria-label={record.title}>
    <h3>{record.title}</h3>
    <p>{stages[record.stage]}</p>
    {project && <button type="button" className="operations__source" onClick={() => openSource("project", project._id)}>{project.name}</button>}
    {record.objectiveId && <button type="button" className="operations__source" onClick={() => openSource("objective", record.objectiveId)}>Open linked objective</button>}
    <p className="operations__knowledge-text">{record.content}</p>
    <p className="operations__knowledge-text">{record.source}</p>
    {linked.length > 0 && <details>
      <summary>Linked reference and evidence media</summary>
      <ul className="operations__feed">{linked.map((reference) => <li key={reference._id}>
        <strong>{reference.name}</strong><small>{reference.category} · {reference.status}</small>
        <MediaPreview id={reference.mediaId} name={reference.name} />
      </li>)}</ul>
    </details>}
    {record.transitions.length > 0 && <form onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { stage, content, source, reviewTurnId, objectiveId } = Object.fromEntries(form);
      update(record, { stage, content: content ?? record.content, source, revision: record.revision,
        ...(objectiveId ? { objectiveId } : {}),
        ...(event.currentTarget.elements.namedItem("referenceIds") ? { referenceIds: form.getAll("referenceIds") } : {}),
        ...(reviewTurnId ? { reviewTurnId: reviewTurnId.trim() } : {}) });
    }}>
      <label>Next step
        <select name="stage" value={nextStage} required onChange={(event) => setNextStage(event.target.value)}>
          <option value="">Choose next step</option>
          {editable && <option value={record.stage}>Save a new revision</option>}
          {record.transitions.map((stage) => <option key={stage} value={stage}
            disabled={stage === "recommended" && !record.objectiveId}>{labels[stage]}</option>)}
        </select>
      </label>
      {editable && <label>Requirements and acceptance criteria <textarea name="content" defaultValue={record.content} maxLength={8000} required /></label>}
      {editable && record.kind === "brief" && <ObjectiveOptions api={api} projectId={record.projectId} currentId={record.objectiveId} />}
      {record.stage === "independent-review" && !record.objectiveId && <p>Request a revision to link the objective before recommending the brief.</p>}
      <label>Decision notes and supporting evidence <textarea name="source" maxLength={1500} required /></label>
      <ReferenceOptions references={references} projectId={record.projectId} linked={linked} />
      {nextStage === "recommended" && <label>Passing independent QA turn ID <input name="reviewTurnId" maxLength={36} required /></label>}
      <button type="submit" disabled={pending}>Record revision</button>
    </form>}
    <details>
      <summary>Revision history</summary>
      <ol className="operations__feed">
        {[...(record.history || [])].reverse().map((entry) => <li key={entry.revision}>
          <strong>{stages[entry.stage]}</strong>
          <small>{new Date(entry.recordedAt).toLocaleString()}</small>
          <p className="operations__knowledge-text">{entry.source}</p>
          <details><summary>Requirements at this revision</summary><p className="operations__knowledge-text">{entry.content}</p></details>
          {entry.reviewTurnId && <button type="button" onClick={() => openSource("job", entry.reviewTurnId)}>Open QA turn</button>}
        </li>)}
      </ol>
    </details>
    {record.stage === "accepted" && <p>Production promotion requires separate authorization.</p>}
  </section>;
}

export default function ArtDepartment({ api, openSource }) {
  const [snapshot, setSnapshot] = useState(null);
  const [references, setReferences] = useState([]);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [generation, setGeneration] = useState(0);
  const submission = useRef(null);
  const detailHeading = useRef(null);
  const activeId = record?._id;

  useEffect(() => {
    if (activeId) detailHeading.current?.focus();
  }, [activeId]);

  useEffect(() => {
    let active = true;
    Promise.all([api("/creative"), api("/projects"), api("/workforce")]).then(([records, projects, workforce]) => {
      if (active) setSnapshot({ records, projects, workforce });
    }).catch((failure) => {
      if (active) setError(failure.message);
    });
    return () => { active = false; };
  }, [api, generation]);

  useEffect(() => {
    let active = true;
    api("/references").then((data) => {
      if (active && Array.isArray(data.entries)) setReferences(data.entries);
    }).catch(() => {});
    return () => { active = false; };
  }, [api]);

  async function load(id) {
    setPending(true);
    setError("");
    try {
      setRecord(await api(detailPath(id)));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  async function create(body, form) {
    setPending(true);
    setError("");
    try {
      const serialized = JSON.stringify(body);
      if (submission.current?.serialized !== serialized) submission.current = { serialized, id: crypto.randomUUID() };
      setRecord(await api("/creative", { method: "POST", body: { ...body, id: submission.current.id } }));
      submission.current = null;
      form.reset();
      setGeneration((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  async function update(current, body) {
    setPending(true);
    setError("");
    try {
      setRecord(await api(detailPath(current._id), { method: "PUT", body }));
      setGeneration((value) => value + 1);
    } catch (failure) {
      if (failure.status === 409) {
        try { setRecord(await api(detailPath(current._id))); } catch { /* Keep the local record available. */ }
      }
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  if (!snapshot) return <p role={error ? "alert" : "status"}>{error || "Loading creative records…"}</p>;
  const { records, projects, workforce } = snapshot;
  const director = workforce.employees.find((employee) => employee.role === "art-director" && employee.status !== "retired");
  const assignments = workforce.projectAssignments?.filter((assignment) => assignment.employeeId === director?._id) || [];
  const recordList = (kind) => <ul className="operations__feed">{records.filter((entry) => entry.kind === kind).map((entry) => <li key={entry._id}>
    <button type="button" aria-pressed={entry._id === record?._id} disabled={pending} onClick={() => load(entry._id)}>{entry.title}</button>
    <small>{stages[entry.stage]}</small>
  </li>)}</ul>;

  return <section className="operations__layout operations__knowledge" aria-label="Art Department">
    <section className="operations__panel">
      <h2>Art direction</h2>
      {director ? <>
        <button type="button" className="operations__source" onClick={() => openSource("employee", director._id)}>{director.name}</button>
        <p>{director.responsibilities}</p>
        <details><summary>Mandate and authority</summary><p>{director.instructions}</p></details>
      </> : <p>Review the proposed Art Director assignment in Studio foundation under Settings.</p>}
      {assignments.length > 0 && <ul className="operations__feed">
        {assignments.map((assignment) => <li key={assignment._id}>
          <button type="button" onClick={() => openSource("project", assignment.projectId)}>{assignment.projectName}</button>
          <button type="button" onClick={() => openSource("objective", assignment.objectiveId)}>Open assigned objective</button>
          <small>{assignment.status}</small>
        </li>)}
      </ul>}
      {error && <p role="alert">{error}</p>}
      <CreateRecord api={api} projects={projects} references={references} create={create} pending={pending} />
      <h3>Direction records</h3>
      {records.some(({ kind }) => kind === "direction") ? recordList("direction") : <p>No direction records yet.</p>}
      <h3>Briefs and review queue</h3>
      {records.some(({ kind }) => kind === "brief") ? recordList("brief") : <p>No briefs or reviews yet.</p>}
    </section>
    <section className="operations__panel">
      <h2 ref={detailHeading} tabIndex={-1}>Creative record</h2>
      {record ? <ReviewRecord key={record._id + "/" + record.revision} api={api} record={record}
        project={projects.find((project) => project._id === record.projectId)} references={references} openSource={openSource}
        update={update} pending={pending} /> : <p>Open a brief or direction record to read its evidence and review history.</p>}
    </section>
  </section>;
}
