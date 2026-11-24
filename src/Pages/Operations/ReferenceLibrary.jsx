import { useEffect, useState } from "react";
import { MediaPreview } from "./MediaAttachments";
import "./finance.css";

const categoryNames = { visual: "Visual", technical: "Technical", candidate: "Candidate", "review-evidence": "Review evidence" };
const imageTypes = ["image/png", "image/jpeg", "image/webp"];

export default function ReferenceLibrary({ request, onUse }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [options, setOptions] = useState(null);
  const [projectNames, setProjectNames] = useState({});

  useEffect(() => {
    let active = true;
    request("/projects").then(projects => {
      if (active) setProjectNames(Object.fromEntries(projects.map(project => [project._id, project.name])));
    }).catch(() => {});
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      request(`/references?${new URLSearchParams({ q: query, status })}`).then(value => {
        if (active) setPage(value);
      }).catch(failure => {
        if (active) setError(failure.message);
      });
    }, query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [request, query, status, revision]);

  async function attachments(before) {
    setInputError("");
    try {
      const value = await request(`/media${before ? `?before=${encodeURIComponent(before)}` : ""}`);
      const items = value.items.filter(item => item.state === "ready");
      setOptions(current => ({ items: before ? [...current.items, ...items] : items, nextBefore: value.nextBefore }));
    } catch (failure) {
      setInputError(failure.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { tags, ...fields } = Object.fromEntries(new FormData(form));
    const payload = { ...fields, tags: tags.split(",").map(tag => tag.trim()).filter(Boolean) };
    const signature = JSON.stringify(payload);
    const id = submission?.signature === signature ? submission.id : crypto.randomUUID();
    setSubmission({ id, signature });
    setSaving(true);
    setInputError("");
    try {
      await request("/references", { method: "POST", body: { ...payload, id } });
      form.reset();
      setSubmission(null);
      setStatus("");
      setQuery("");
      setRevision(value => value + 1);
    } catch (failure) {
      setInputError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  async function recordStatus(reference, next) {
    setSaving(true);
    setError("");
    try {
      await request(`/references/${encodeURIComponent(reference._id)}/status`, {
        method: "PUT", body: { revision: reference.revision, status: next },
      });
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  async function nextPage() {
    const requested = page;
    setError("");
    try {
      const params = new URLSearchParams({ q: query, status, before: page.nextBefore });
      const next = await request(`/references?${params}`);
      setPage(current => current === requested ? { ...next, entries: [...current.entries, ...next.entries] } : current);
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <section className="operations-finance" aria-label="Reference catalog">
      <div className="operations-finance__toolbar">
        <h2>Reference catalog</h2>
        <label>Search <input type="search" maxLength={100} value={query} onChange={event => {
          setPage(null);
          setError("");
          setQuery(event.target.value);
        }} /></label>
        <label>Status <select value={status} onChange={event => {
          setPage(null);
          setError("");
          setStatus(event.target.value);
        }}><option value="">All statuses</option><option value="provisional">Provisional</option><option value="approved">Approved</option><option value="superseded">Superseded</option></select></label>
      </div>
      <details onToggle={event => { if (event.currentTarget.open) void attachments(); }}>
        <summary>Register existing media</summary>
        <form className="operations-finance__form" onSubmit={save}>
          <label>Attachment <select name="mediaId" required>
            <option value="">Choose ready media</option>
            {options?.items.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select></label>
          {options?.nextBefore && <button type="button" onClick={() => attachments(options.nextBefore)}>Load older attachments</button>}
          {options && !options.items.length && <p>Upload a file in the media library to register it here.</p>}
          <label>Title <input name="name" maxLength={160} required /></label>
          <label>Category <select name="category">{Object.entries(categoryNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Project <select name="projectId"><option value="">Studio-wide</option>
            {Object.entries(projectNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select></label>
          <label>Source <input name="source" maxLength={1000} required /></label>
          <label>License <input name="license" maxLength={500} /></label>
          <label>Tags, separated by commas <input name="tags" maxLength={480} /></label>
          <label>Description and notes <textarea name="description" maxLength={3000} rows={2} /></label>
          <button disabled={saving}>Register reference</button>
        </form>
        {inputError && <p role="alert">{inputError}</p>}
      </details>
      {error && <p role="alert">{error}</p>}
      {!page && !error && <p role="status">Loading references…</p>}
      {page?.entries.length === 0 && <p>No references match these filters.</p>}
      <ul className="operations-finance__entries">
        {page?.entries.map(reference => <li key={reference._id}>
          <div>
            <strong>{reference.name}</strong>
            <small>{categoryNames[reference.category]} · {reference.status}{reference.projectId && ` · ${projectNames[reference.projectId] ?? "Project"}`}</small>
            {reference.description && <p>{reference.description}</p>}
            <small>Source · {reference.source}</small>
            {reference.license && <small>License · {reference.license}</small>}
            {!!reference.tags.length && <small>{reference.tags.join(", ")}</small>}
            <MediaPreview id={reference.mediaId} name={reference.name} />
            <div className="operations-finance__toolbar">
              {reference.status !== "superseded" && imageTypes.includes(reference.asset.mime) && reference.asset.size <= 12 * 1024 ** 2 && onUse &&
                <button type="button" onClick={() => onUse({ ...reference.asset, name: reference.name })}>Attach to conversation</button>}
              {reference.status === "provisional" && <button type="button" disabled={saving} onClick={() => recordStatus(reference, "approved")}>Approve reference</button>}
              {reference.status !== "superseded" && <button type="button" disabled={saving} onClick={() => recordStatus(reference, "superseded")}>Supersede</button>}
            </div>
          </div>
        </li>)}
      </ul>
      {page?.nextBefore && <button type="button" onClick={nextPage}>Load older references</button>}
    </section>
  );
}
