import { useEffect, useRef, useState } from "react";
import WorkshopRegistry from "./WorkshopRegistry";

const kinds = [
  ["procedure", "Procedure"], ["research", "Research"], ["decision", "Decision"],
  ["handover", "Handover"], ["handbook", "Handbook"], ["qa", "QA report"], ["air", "AIR report"],
];
const memoryKinds = [["decision", "Decision"], ["preference", "Owner preference"], ["policy", "Operating policy"]];
const provenance = ["untested", "external", "experimental", "validated", "owner-approved", "deprecated", "failed"];
const fields = [
  ["title", "Title", 120, true], ["project", "Project label", 100], ["author", "Author", 100, true],
  ["source", "Source reference", 500, true], ["summary", "Summary", 400, true],
  ["body", "Record", 8000, true], ["evidence", "Validation evidence", 2000],
  ["limitations", "Limitations", 2000], ["license", "License", 300],
];

export default function Knowledge({ api, initialId, initialWorkshop, openWorkshop }) {
  const [filter, setFilter] = useState("");
  const [workshopOpen, setWorkshopOpen] = useState(initialWorkshop);
  const workshopSummary = useRef(null);
  useEffect(() => {
    if (!initialWorkshop) return;
    const frame = requestAnimationFrame(() => workshopSummary.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [initialWorkshop]);
  const [result, setResult] = useState(null);
  const [selection, setSelection] = useState(initialId || "");
  const [detail, setDetail] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [detailError, setDetailError] = useState(null);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);
  const [kind, setKind] = useState("procedure");
  const [status, setStatus] = useState("untested");
  const [projects, setProjects] = useState([]);
  const loadKey = version + ":" + filter;
  const listed = result?.key === loadKey ? result : null;

  useEffect(() => {
    let current = true;
    api("/projects").then(value => {
      if (current) setProjects(value);
    }).catch(() => {});
    return () => { current = false; };
  }, [api]);

  useEffect(() => {
    let current = true;
    api("/knowledge?" + filter).then((records) => {
      if (current) setResult({ key: loadKey, entries: records });
    }).catch((failure) => {
      if (current) setResult({ key: loadKey, error: failure.message });
    });
    return () => { current = false; };
  }, [api, filter, loadKey]);

  useEffect(() => {
    let current = true;
    if (selection) api("/knowledge/" + selection).then((record) => {
      if (current) setDetail(record);
    }).catch((failure) => {
      if (current) setDetailError({ id: selection, message: failure.message });
    });
    return () => { current = false; };
  }, [api, selection]);

  async function create(event) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setSaveError("");
    try {
      const { _id } = await api("/knowledge", {
        method: "POST", body: Object.fromEntries(new FormData(form)),
      });
      form.reset();
      setKind("procedure");
      setStatus("untested");
      setSelection(_id);
      setVersion((value) => value + 1);
    } catch (failure) {
      setSaveError(failure.message);
    } finally {
      setPending(false);
    }
  }

  async function saveDecision(action, values = {}) {
    setPending(true);
    setSaveError("");
    try {
      await api("/knowledge/" + detail._id + "/decision", {
        method: "PATCH", body: { ...values, action, revision: detail.revision ?? 0 },
      });
      setDetail(await api("/knowledge/" + detail._id));
      setVersion(value => value + 1);
    } catch (failure) {
      setSaveError(failure.message);
    } finally {
      setPending(false);
    }
  }

  function search(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (!values.get("kind")) values.delete("kind");
    setSaveError("");
    setFilter(new URLSearchParams(values).toString());
    setVersion((value) => value + 1);
  }

  return <>
  <section className="operations__layout operations__knowledge" aria-label="Knowledge library">
    <section className="operations__panel">
      <h2>Knowledge library</h2>
      {!initialWorkshop && <button type="button" onClick={openWorkshop}>Open Workshop registry</button>}
      <form onSubmit={search}>
        <label>Search <input name="q" type="search" maxLength={120} /></label>
        <label>Record type <select name="kind">
          <option value="">All types</option>
          {kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <button type="submit">Search</button>
      </form>
      {!listed && <p role="status">Loading records…</p>}
      {listed?.error && <p role="alert">{listed.error}</p>}
      <ul className="operations__feed">
        {listed?.entries?.map((entry) => <li key={entry._id}>
          <button type="button" onClick={() => setSelection(entry._id)} aria-pressed={selection === entry._id}>{entry.title}</button>
          <small>{entry.status} · {entry.author}{entry.project && " · " + entry.project}</small>
        </li>)}
      </ul>
      {listed?.entries?.length === 0 && <p>No matching records.</p>}
    </section>
    <section className="operations__panel">
      {selection && (detail?._id === selection ? <article>
        <h2>{detail.title}</h2>
        <p>{detail.summary}</p>
        <dl>
          <dt>Provenance</dt><dd>{detail.status}</dd>
          <dt>Source</dt><dd>{detail.source}</dd>
          <dt>Author</dt><dd>{detail.author}</dd>
          {detail.license && <><dt>License</dt><dd>{detail.license}</dd></>}
          <dt>Recorded</dt><dd><time dateTime={detail.createdAt}>{new Date(detail.createdAt).toLocaleString()}</time></dd>
        </dl>
        <p className="operations__knowledge-text">{detail.body}</p>
        {detail.evidence && <><h3>Validation evidence</h3><p className="operations__knowledge-text">{detail.evidence}</p></>}
        {detail.limitations && <><h3>Limitations</h3><p className="operations__knowledge-text">{detail.limitations}</p></>}
        {detail.kind === "decision" && detail.status === "owner-approved" && <details>
          <summary>Revise owner-approved memory</summary>
          <form key={detail.revision ?? 0} onSubmit={event => {
            event.preventDefault();
            saveDecision("revise", Object.fromEntries(new FormData(event.currentTarget)));
          }}>
            <label>Memory type<select name="memoryKind" defaultValue={detail.memoryKind || "decision"}>
              {memoryKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            {fields.filter(([field]) => ["title", "summary", "body", "source", "evidence"].includes(field))
              .map(([field, label, limit]) => <label key={field}>{label}
                <textarea name={field} defaultValue={detail[field]} maxLength={limit} required rows={field === "body" ? 5 : 2} />
              </label>)}
            <button type="submit" disabled={pending}>Supersede previous version</button>
            <button type="button" disabled={pending} onClick={() => saveDecision("retire")}>Retire this decision</button>
          </form>
        </details>}
        {detail.decisionHistory?.length > 0 && <details>
          <summary>Decision history</summary>
          <ul>{detail.decisionHistory.slice().reverse().map(version => <li key={version.revision}>
            <strong>{version.title}</strong>
            <p>{version.summary}</p>
            <p>{version.source}</p>
            <p>{version.body}</p>
            <time dateTime={version.replacedAt}>{new Date(version.replacedAt).toLocaleString()}</time>
          </li>)}</ul>
        </details>}
      </article> : detailError?.id === selection ? <p role="alert">{detailError.message}</p> : <p role="status">Loading record…</p>)}
      {saveError && <p role="alert">{saveError}</p>}
      <details open={!selection}>
        <summary>Add a record</summary>
        <form onSubmit={create}>
          <label>Record type <select name="kind" value={kind} onChange={event => setKind(event.target.value)}>
            {kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          {kind === "decision" && <label>Memory type<select name="memoryKind">
            {memoryKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>}
          <label>Provenance <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {provenance.map((value) => <option key={value}>{value}</option>)}
          </select></label>
          <label>Linked project <select name="projectId">
            <option value="">No link</option>
            {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select></label>
          {fields.map(([key, label, maxLength, required]) => <label key={key}>{label}
            {maxLength > 500
              ? <textarea name={key} maxLength={maxLength} required={required ||
                (key === "evidence" && ["validated", "owner-approved"].includes(status))} rows={4} />
              : <input name={key} maxLength={maxLength} required={required} />}
          </label>)}
          <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save record"}</button>
        </form>
      </details>
    </section>
  </section>
  <details className="operations__panel operations__workshop-registry" open={workshopOpen} onToggle={(event) => setWorkshopOpen(event.currentTarget.open)}>
    <summary ref={workshopSummary}>Workshop resource registry</summary>
    {workshopOpen && <WorkshopRegistry api={api} />}
  </details>
  </>;
}
