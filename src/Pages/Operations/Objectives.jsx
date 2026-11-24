import { useEffect, useState } from "react";
import ObjectiveReviews from "./ObjectiveReviews";

export default function Objectives({ api, openJob, initialId, initialProjectId, openProject, assignObjective }) {
  const [records, setRecords] = useState(null);
  const [projects, setProjects] = useState([]);
  const projectFilter = initialProjectId ? "?projectId=" + initialProjectId : "";
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([api("/objectives" + projectFilter), api("/projects").catch(() => [])]).then(([result, options]) => {
      if (mounted) { setRecords(result); setProjects(options); }
    })
      .catch((failure) => { if (mounted) setError(failure.message); });
    return () => { mounted = false; };
  }, [api, projectFilter]);

  useEffect(() => {
    if (!initialId) return;
    let mounted = true;
    api("/objectives/" + initialId).then((record) => { if (mounted) setSelected(record); })
      .catch((failure) => { if (mounted) setError(failure.message); });
    return () => { mounted = false; };
  }, [api, initialId]);

  async function update(callback) {
    setBusy(true);
    setError("");
    try { await callback(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function inspect(id) {
    const objective = await api(`/objectives/${id}`);
    setSelected(objective);
  }

  function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { title, instruction, criteria, priority, projectId } = Object.fromEntries(new FormData(form));
    update(async () => {
      const result = await api("/objectives", {
        method: "POST",
        body: { title, instruction, priority, ...(projectId ? { projectId } : {}), criteria: criteria.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) },
      });
      form.reset();
      await inspect(result._id);
      setRecords(await api("/objectives" + projectFilter));
    });
  }

  function review(event, criterionId) {
    event.preventDefault();
    const decision = event.nativeEvent.submitter?.value;
    if (!decision) return;
    const form = event.currentTarget;
    const evidence = new FormData(form).get("evidence");
    const id = selected._id;
    update(async () => {
      try {
        await api(`/objectives/${id}/criteria/${criterionId}/review`, {
          method: "POST", body: { decision, evidence, revision: selected.revision },
        });
      } catch (failure) {
        if (failure.status === 409) await inspect(id);
        throw failure;
      }
      form.reset();
      await inspect(id);
      setRecords(await api("/objectives" + projectFilter));
    });
  }

  const selectedProject = projects.find((project) => project._id === selected?.projectId);

  return <section className="operations__layout" aria-label="Objectives">
    <aside className="operations__panel">
      <h2>Objective register</h2>
      {!records && !error && <p role="status">Loading objectives…</p>}
      {records?.length === 0 && <p>No objectives recorded.</p>}
      <ul>{records?.map((record) => <li key={record._id}>
        <button type="button" disabled={busy} aria-pressed={selected?._id === record._id}
          onClick={() => update(() => inspect(record._id))}>
          {record.title}<small>{record.status} · {record.priority} priority</small>
        </button>
      </li>)}</ul>
    </aside>
    <div className="operations__panel">
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>New objective</summary>
        <form onSubmit={create}>
          <label>Title<input name="title" required maxLength={120} /></label>
          {projects.length > 0 && <label>Project <select name="projectId" defaultValue={initialProjectId || ""}>
            <option value="">Unassigned</option>
            {projects.filter((project) => project.status === "active").map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select></label>}
          <label>Original instruction<textarea name="instruction" required maxLength={6000} rows={4} /></label>
          <label>Acceptance criteria, one per line<textarea name="criteria" required maxLength={4811} rows={4} /></label>
          <label>Priority<select name="priority" defaultValue="normal">
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
          </select></label>
          <button disabled={busy}>Create objective</button>
        </form>
      </details>
      {selected && <article key={selected._id} className="operations__objective">
        <h2>{selected.title}</h2>
        {selected.projectId && <button type="button" className="operations__source" onClick={() => openProject(selected.projectId)}>
          {selectedProject?.name || "Open project"}
        </button>}
        {selected.status === "active" && (!selected.projectId || selectedProject?.status === "active") && <p><button type="button" onClick={() => assignObjective(selected, selectedProject?.workspace)}>Assign implementation</button></p>}
        <p>{selected.status === "completed" ? "All criteria accepted" : "Awaiting owner validation"}</p>
        <pre>{selected.instruction}</pre>
        <ObjectiveReviews api={api} objective={selected} openJob={openJob} />
        <h3>Acceptance criteria</h3>
        <ol>{selected.criteria.map((criterion) => <li key={criterion.id}>
          <strong>{criterion.text}</strong>
          <p>{criterion.review ? `${criterion.review.decision} · ${criterion.review.evidence}` : "Pending review"}</p>
          {selected.status === "active" && <details>
            <summary>Record review</summary>
            <form onSubmit={(event) => review(event, criterion.id)}>
              <label>Evidence<textarea name="evidence" required maxLength={1200} /></label>
              <button name="decision" value="accepted" disabled={busy}>Accept criterion</button>{" "}
              <button name="decision" value="rejected" disabled={busy}>Reject criterion</button>
            </form>
          </details>}
        </li>)}</ol>
        {selected.reviewHistory?.length > 0 && <details>
          <summary>Review history</summary>
          <ul>{selected.reviewHistory.map((entry, index) => <li key={index}>
            <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>{" · "}
            {selected.criteria.find((criterion) => criterion.id === entry.criterionId)?.text}{" · "}
            {entry.decision} · {entry.evidence}
          </li>)}</ul>
        </details>}
      </article>}
    </div>
  </section>;
}
