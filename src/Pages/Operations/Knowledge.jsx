import { useEffect, useState } from "react";

const kinds = [
  ["procedure", "Procedure"], ["research", "Research"], ["decision", "Decision"],
  ["handover", "Handover"], ["handbook", "Handbook"], ["qa", "QA report"], ["air", "AIR report"],
];
const provenance = ["untested", "external", "experimental", "validated", "deprecated", "failed"];
const fields = [
  ["title", "Title", 120, true], ["project", "Project", 100], ["author", "Author", 100, true],
  ["source", "Source reference", 500, true], ["summary", "Summary", 400, true],
  ["body", "Record", 8000, true], ["evidence", "Validation evidence", 2000],
  ["limitations", "Limitations", 2000],
];

export default function Knowledge({ api, initialId }) {
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState(null);
  const [selection, setSelection] = useState(initialId || "");
  const [detail, setDetail] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [detailError, setDetailError] = useState(null);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("untested");
  const loadKey = version + ":" + filter;
  const listed = result?.key === loadKey ? result : null;

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
      setStatus("untested");
      setSelection(_id);
      setVersion((value) => value + 1);
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

  return <section className="operations__layout operations__knowledge" aria-label="Knowledge library">
    <section className="operations__panel">
      <h2>Knowledge library</h2>
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
          <dt>Recorded</dt><dd><time dateTime={detail.createdAt}>{new Date(detail.createdAt).toLocaleString()}</time></dd>
        </dl>
        <p className="operations__knowledge-text">{detail.body}</p>
        {detail.evidence && <><h3>Validation evidence</h3><p className="operations__knowledge-text">{detail.evidence}</p></>}
        {detail.limitations && <><h3>Limitations</h3><p className="operations__knowledge-text">{detail.limitations}</p></>}
      </article> : detailError?.id === selection ? <p role="alert">{detailError.message}</p> : <p role="status">Loading record…</p>)}
      <details open={!selection}>
        <summary>Add a record</summary>
        <form onSubmit={create}>
          <label>Record type <select name="kind">
            {kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Provenance <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {provenance.map((value) => <option key={value}>{value}</option>)}
          </select></label>
          {fields.map(([key, label, maxLength, required]) => <label key={key}>{label}
            {maxLength > 500
              ? <textarea name={key} maxLength={maxLength} required={required || (key === "evidence" && status === "validated")} rows={4} />
              : <input name={key} maxLength={maxLength} required={required} />}
          </label>)}
          {saveError && <p role="alert">{saveError}</p>}
          <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save record"}</button>
        </form>
      </details>
    </section>
  </section>;
}
