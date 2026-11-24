import { useEffect, useState } from "react";

const eventLabels = {
  "objective-opened": "Objective opened",
  "objective-accepted": "Objective accepted",
  "turn-queued": "Turn submitted",
  "turn-started": "Turn started",
  "turn-finished": "Turn finished",
  "knowledge-recorded": "Knowledge recorded",
};

export default function Activity({ api, openSource }) {
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState(null);
  const [version, setVersion] = useState(0);
  const [dateError, setDateError] = useState("");
  const key = version + ":" + filter;
  const records = result?.key === key ? result : null;

  useEffect(() => {
    let current = true;
    api("/activity?" + filter).then((entries) => {
      if (current) setResult({ key, entries });
    }).catch((error) => {
      if (current) setResult({ key, error: error.message });
    });
    return () => { current = false; };
  }, [api, filter, key]);

  function search(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    setDateError("");
    if (values.get("type")) query.set("type", values.get("type"));
    for (const bound of ["after", "before"]) {
      const value = values.get(bound);
      if (!value) continue;
      const date = new Date(value + "T00:00:00");
      if (!Number.isFinite(+date)) {
        setDateError("Enter a date between 1900 and 9999.");
        return;
      }
      query.set(bound, date.toISOString());
    }
    setFilter(query.toString());
    setVersion((value) => value + 1);
  }

  return <section className="operations__panel" aria-labelledby="operations-activity">
    <h2 id="operations-activity">Activity timeline</h2>
    <form className="operations__selectors" onSubmit={search}>
      <label>Event <select name="type">
        <option value="">All events</option>
        {Object.entries(eventLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
      </select></label>
      <label>From date <input name="after" type="date" min="1900-01-01" max="9999-12-31" /></label>
      <label>Before date <input name="before" type="date" min="1900-01-01" max="9999-12-31" /></label>
      <button type="submit">Apply filters</button>
    </form>
    {dateError && <p role="alert">{dateError}</p>}
    {records?.entries?.length === 40 && <p>Showing the 40 most recent matching events.</p>}
    {!records && <p role="status">Loading activity…</p>}
    {records?.error && <p role="alert">{records.error}</p>}
    {records?.entries?.length === 0 && <p>No matching activity.</p>}
    <ul className="operations__feed">{records?.entries?.map((entry) => <li key={entry.id}>
      <strong>{eventLabels[entry.type]}{entry.status && " · " + entry.status}</strong>
      <button className="operations__source" type="button" onClick={() => openSource(entry.group, entry.sourceId)}>
        {entry.title || "Open source"}
      </button>
      <small><time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
        {[entry.workspace, entry.role, entry.project].filter(Boolean).map((label) => " · " + label).join("")}
      </small>
    </li>)}</ul>
  </section>;
}
