import { useEffect, useState } from "react";

export default function Projects({ api, initialId, openObjectives, openWorkflow }) {
  const [records, setRecords] = useState(null);
  const [selection, setSelection] = useState(initialId || null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    const detailRequest = selection && selection !== "new" ? api("/projects/" + selection) : Promise.resolve(null);
    Promise.all([api("/projects"), detailRequest]).then(([list, record]) => {
      if (current) { setRecords(list); setDetail(record); }
    }).catch((failure) => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [api, selection, version]);

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const body = { ...values, repositories: values.repositories.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) };
    if (detail) body.revision = detail.revision;
    setPending(true);
    setError("");
    try {
      const result = await api(detail ? "/projects/" + detail._id : "/projects", { method: detail ? "PUT" : "POST", body });
      if (result?._id) setSelection(result._id);
      setVersion((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) setVersion((value) => value + 1);
    } finally {
      setPending(false);
    }
  }

  const record = detail?._id === selection ? detail : null;
  return <section className="operations__layout operations__knowledge" aria-label="Projects">
    <section className="operations__panel">
      <h2>Projects</h2>
      {!records && !error && <p role="status">Loading projects…</p>}
      {records?.length === 0 && <p>No projects recorded.</p>}
      <ul className="operations__feed">{records?.map((entry) => <li key={entry._id}>
        <button type="button" aria-pressed={selection === entry._id} onClick={() => setSelection(entry._id)}>{entry.name}</button>
        <small>{entry.workspace} · {entry.status}</small>
      </li>)}</ul>
      <button type="button" onClick={() => { setDetail(null); setSelection("new"); }}>Add project</button>
    </section>
    <section className="operations__panel">
      <h2>{record?.name || (selection === "new" ? "New project" : "Project details")}</h2>
      {error && <p role="alert">{error}</p>}
      {record && <button type="button" onClick={() => openObjectives(record._id)}>View project objectives</button>}
      {record && <button type="button" onClick={() => openWorkflow(record._id)}>View project workflow</button>}
      {(record || selection === "new") && <form key={record ? record._id + "/" + record.revision : "new"} onSubmit={save}>
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
      </form>}
      {!selection && <p>Select a project to inspect its settings and objectives.</p>}
    </section>
  </section>;
}
