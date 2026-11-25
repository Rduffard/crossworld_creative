import { useEffect, useRef, useState } from "react";

const kinds = {
  announcement: "Owner announcement",
  "department-request": "Department request",
  handoff: "Assignment handoff",
  "review-request": "Review request",
  "decision-request": "Decision request",
  notice: "Operational notice",
};

export default function Communications({ api }) {
  const [state, setState] = useState("open");
  const [cursor, setCursor] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const submission = useRef(null);

  useEffect(() => {
    let current = true;
    const query = new URLSearchParams({ state, ...cursor });
    api("/communications?" + query).then(data => {
      if (current) {
        setResult(data);
        setError("");
      }
    }).catch(failure => {
      if (current) setError(failure.status === 404 ? "Internal correspondence is unavailable on this server." : failure.message);
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [api, state, cursor, revision]);

  function browse(nextState, nextCursor) {
    setLoading(true);
    setError("");
    setState(nextState);
    setCursor(nextCursor);
    setRevision(value => value + 1);
  }

  async function send(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setActionError("");
    try {
      const fields = Object.fromEntries(new FormData(form));
      const signature = JSON.stringify(fields);
      if (submission.current?.signature !== signature) {
        submission.current = { signature, id: crypto.randomUUID() };
      }
      await api("/communications", { method: "POST", body: { ...fields, id: submission.current.id } });
      submission.current = null;
      form.reset();
      browse("open", null);
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setPending(false);
    }
  }

  async function move(item) {
    setPending(true);
    setActionError("");
    try {
      await api("/communications/" + item._id, { method: "PATCH", body: {
        state: item.state === "open" ? "archived" : "open", revision: item.revision,
      } });
      browse(state, cursor);
    } catch (failure) {
      setActionError(failure.message);
      if (failure.status === 409) browse(state, cursor);
    } finally {
      setPending(false);
    }
  }

  return <section className="operations__studio-layout" aria-label="Studio correspondence">
    <section className="operations__panel">
      <div className="operations__briefing-title">
        <h2>Internal correspondence</h2>
        <span>Shared mailbox {result?.mailbox?.state || "status unavailable"}</span>
      </div>
      <div className="operations__modes">
        <button type="button" aria-pressed={state === "open"} disabled={loading || pending}
          onClick={() => browse("open", null)}>Open</button>
        <button type="button" aria-pressed={state === "archived"} disabled={loading || pending}
          onClick={() => browse("archived", null)}>Archived</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {actionError && <p role="alert">{actionError}</p>}
      {loading && <p role="status">Loading correspondence…</p>}
      {!loading && !error && !result?.messages.length && <p>No correspondence on this page.</p>}
      {!loading && !error && <ul className="operations__feed">{result?.messages.map(item => <li key={item._id}>
        <details>
          <summary>{item.subject}</summary>
          <small>{kinds[item.kind]} · Owner · {result.departments.find(department => department._id === item.departmentId)?.name ||
            (item.departmentId ? "Department unavailable" : "Studio")} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></small>
          <p className="operations__knowledge-text">{item.message}</p>
          <button type="button" disabled={pending} onClick={() => move(item)}>{state === "open" ? "Archive" : "Reopen"}</button>
        </details>
      </li>)}</ul>}
      <div className="operations__modes">
        {cursor && <button type="button" disabled={loading || pending} onClick={() => browse(state, null)}>Newest</button>}
        {!error && result?.next && <button type="button" disabled={loading || pending} onClick={() => browse(state, result.next)}>Older</button>}
      </div>
    </section>
    <section className="operations__panel">
      <h2>Compose internally</h2>
      <form onSubmit={send}>
        <fieldset disabled={loading || !!error || pending}>
          <label>Type <select name="kind">{Object.entries(kinds).map(([kind, label]) =>
            <option key={kind} value={kind}>{label}</option>)}</select></label>
          <label>Route to <select name="departmentId"><option value="">Studio</option>
            {result?.departments.map(department => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select></label>
          <label>Subject <input name="subject" maxLength={160} required /></label>
          <label>Message <textarea name="message" maxLength={6000} rows={6} required /></label>
          <button type="submit">Record correspondence</button>
        </fieldset>
      </form>
    </section>
  </section>;
}
