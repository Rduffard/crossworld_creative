import { useEffect, useState } from "react";
import { requestJson } from "../../utils/api";

const statuses = [["open", "Open"], ["in_progress", "In progress"], ["resolved", "Resolved"], ["closed", "Closed"]];
const labels = Object.fromEntries(statuses);
const squash = "https://squash.crossworldcreative.com";

function QualityDisposition({ defect, onChange }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const endpoint = "/squash/bugs/" + encodeURIComponent(defect._id) + "/quality";
  useEffect(() => {
    let active = true;
    requestJson(endpoint, { auth: true }).then(data => { if (active) setRecord(data); })
      .catch(failure => { if (active && failure.status !== 404) setError(failure.message); });
    return () => { active = false; };
  }, [endpoint, attempt]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const updated = await requestJson(endpoint, {
        method: "PATCH", auth: true, body: { ...fields, revision: record?.revision },
      });
      setRecord(updated);
      onChange({ status: updated.status, priority: updated.priority });
      setNotice("Defect decision recorded.");
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) setAttempt(value => value + 1);
    } finally { setSaving(false); }
  }

  return <>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {record && <details open>
      <summary>Project-owner triage</summary>
      <form key={record.revision} onSubmit={save}>
        <label>Decision <select name="state" defaultValue={record.state}>
          {[record.state, ...record.allowed].map(state => <option key={state}>{state}</option>)}
        </select></label>
        <label>Severity <select name="severity" defaultValue={record.severity || ""} required>
          <option value="" disabled>Select impact</option>
          {["minor", "moderate", "major", "critical"].map(severity => <option key={severity}>{severity}</option>)}
        </select></label>
        <label>Priority <select name="priority" defaultValue={record.priority}>
          {["low", "medium", "high", "critical"].map(priority => <option key={priority}>{priority}</option>)}
        </select></label>
        <label>Evidence or decision reason <textarea name="reason" maxLength={2000} /></label>
        <button type="submit" disabled={saving}>Record defect decision</button>
      </form>
      {!!record.history.length && <ul className="operations__feed">
        {[...record.history].reverse().map((entry, index) => <li key={entry.at + "/" + index}>
          <strong>{entry.from} to {entry.to}</strong><small>{new Date(entry.at).toLocaleString()}</small>
          {entry.reason && <p className="operations__knowledge-text">{entry.reason}</p>}
        </li>)}
      </ul>}
    </details>}
  </>;
}

export default function Quality() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("active");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let active = true;
    const get = path => requestJson("/squash/" + path, { auth: true });
    Promise.all([get("projects"), get("bugs")]).then(([projects, bugs]) => {
      if (!active) return;
      if (!Array.isArray(projects) || !Array.isArray(bugs)) throw new Error("Squash returned an unexpected response.");
      setData({projects, bugs});
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [attempt]);

  const scoped = data?.bugs.filter(bug => !project || String(bug.projectId) === project) || [];
  const term = query.trim().toLocaleLowerCase();
  const rows = scoped.filter(bug => (status === "all" || (status === "active" ?
    ["open", "in_progress"].includes(bug.status) : status === bug.status)) &&
    (!term || bug.title.toLocaleLowerCase().includes(term)));
  const defect = scoped.find(bug => bug._id === selected);
  const projectName = id => data?.projects.find(entry => entry._id === id)?.name || "Project unavailable";
  const critical = scoped.filter(bug => bug.priority === "critical" && ["open", "in_progress"].includes(bug.status)).length;
  return <section className="operations__panel" aria-label="Squash quality desk">
    <div className="operations__briefing-title">
      <h2>Defect investigation desk</h2>
      <a href={squash}>Open standalone Squash</a>
    </div>
    {error && <p role="alert">Squash is unavailable. {error}</p>}
    {!data && !error && <p role="status">Loading Squash…</p>}
    <button type="button" onClick={() => { setData(null); setError(""); setAttempt(value => value + 1); }}>Refresh Squash</button>
    {data && <>
      <div className="operations__selectors">
        <label>Squash project <select value={project} onChange={event => setProject(event.target.value)}>
          <option value="">All accessible projects</option>
          {data.projects.map(entry => <option key={entry._id} value={entry._id}>{entry.name}</option>)}
        </select></label>
        <label>Status <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="active">Active defects</option><option value="all">All statuses</option>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Find defect <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      </div>
      <p><strong>{critical}</strong> active critical-priority {critical === 1 ? "defect" : "defects"} in this project scope</p>
      <div className="operations__studio-layout">
        <section aria-label="Defect queue">
          <h3>Defect queue</h3>
          {!rows.length && <p>No defects match these filters.</p>}
          <ul className="operations__feed">{rows.map(bug => <li key={bug._id}>
            <button type="button" aria-pressed={selected === bug._id} onClick={() => setSelected(bug._id)}>{bug.title}</button>
            <small>{projectName(String(bug.projectId))} · {labels[bug.status] || bug.status} · {bug.priority} priority</small>
          </li>)}</ul>
        </section>
        <section aria-label="Defect inspector">
          <h3>{defect?.title || "Defect inspector"}</h3>
          {defect ? <>
            <p>{projectName(String(defect.projectId))} · {labels[defect.status] || defect.status} · {defect.priority} priority</p>
            <a href={squash + "/dashboard/bugs/" + encodeURIComponent(defect._id)}>Open this defect in Squash</a>
            <p className="operations__knowledge-text">{defect.description || "No description recorded."}</p>
            <QualityDisposition key={defect._id} defect={defect} onChange={change => setData(previous => previous ? ({
              ...previous, bugs: previous.bugs.map(bug => bug._id === defect._id ? { ...bug, ...change } : bug),
            }) : previous)} />
            {defect.updatedAt && <p>Updated <time dateTime={defect.updatedAt}>{new Date(defect.updatedAt).toLocaleString()}</time></p>}
          </> : <p>Select a defect to inspect its record.</p>}
        </section>
      </div>
    </>}
  </section>;
}
