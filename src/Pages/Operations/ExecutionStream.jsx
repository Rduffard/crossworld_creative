import { useEffect, useMemo, useRef, useState } from "react";
import { activityEntries } from "./executionEvents";
import { conversationPage, readTurn } from "./conversationExport";

function turnEntries(turn) {
  const events = activityEntries(turn.activity);
  return [
    ...events,
    ...(turn.prompt ? [{ label: "Owner instructions", category: "Owner instructions", at: turn.createdAt, text: turn.prompt, index: -1 }] : []),
    ...(turn.answer ? [{ label: "Final report", category: "Reports", at: turn.finishedAt, text: turn.answer, index: Number.MAX_SAFE_INTEGER }] : []),
    ...(turn.error ? [{ label: "Execution error", category: "Errors", at: turn.finishedAt, text: turn.error, index: Number.MAX_SAFE_INTEGER - 1 }] : []),
  ].map(event => ({ ...event, key: turn.id + "/" + event.index, turnId: turn.id, actor: turn.actor, status: turn.status,
    at: event.at || turn.finishedAt || turn.createdAt }));
}

const preview = text => text.replace(/\b[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\b/gi, "[record]").trim().replace(/\s+/g, " ").slice(0, 200);

export default function ExecutionStream({ api, sessionId, current, copy, selectJob }) {
  const [history, setHistory] = useState([]);
  const [cursor, setCursor] = useState(undefined);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [filters, setFilters] = useState({ text: "", category: "", actor: "", status: "", range: "", cutoff: 0 });
  const [inspect, setInspect] = useState(null);
  const [limit, setLimit] = useState(80);
  const top = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setLoading(true);
    setFailure("");
    async function load() {
      try {
        const rows = await conversationPage(api, sessionId, cursor);
        const batch = rows.slice(0, 4);
        const turns = await Promise.all(batch.filter(item => item._id !== current.id).map(item => readTurn(api, item._id, true)));
        if (active) setHistory(previous => [...previous, ...turns]);
        if (active && rows.length <= batch.length) setCursor(null);
        else if (active) setHistoryCursor(batch.at(-1)._id);
      } catch (error) {
        if (active) setFailure(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (cursor !== null) load();
    else setLoading(false);
    return () => { active = false; };
  }, [api, attempt, cursor, current.id, sessionId]);

  const entries = useMemo(() => {
    const turns = new Map(history.map(turn => [turn.id, turn]));
    turns.set(current.id, current);
    return [...turns.values()].flatMap(turnEntries).sort((a, b) =>
      (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0) || b.index - a.index || a.key.localeCompare(b.key));
  }, [current, history]);
  const query = filters.text.trim().toLowerCase();
  const { cutoff } = filters;
  const matching = entries.filter(item =>
    (!filters.category || item.category === filters.category) && (!filters.actor || item.actor === filters.actor) &&
    (!filters.status || item.status === filters.status) && (!cutoff || Date.parse(item.at) >= cutoff) &&
    (!query || (item.label + "\n" + item.text).toLowerCase().includes(query)));

  function change(event) {
    const { name, value } = event.target;
    const time = name === "range" ? { cutoff: value ? Date.now() - Number(value) * 3_600_000 : 0 } : {};
    setFilters(previous => ({ ...previous, [name]: value, ...time }));
    setLimit(80);
  }

  function facet(name, label) {
    const values = [...new Set(entries.map(item => item[name]).filter(Boolean))].sort();
    return <label>{label}<select name={name} value={filters[name]} onChange={change}>
      <option value="">All</option>{values.map(value => <option key={value}>{value}</option>)}
    </select></label>;
  }

  return <div className="operations__execution-stream" ref={top}>
    <div className="operations__execution-filters">
      <label>Search execution activity<input type="search" name="text" value={filters.text} onChange={change} /></label>
      {facet("category", "Category")}
      {facet("actor", "Employee")}
      {facet("status", "Turn status")}
      <label>Time range<select name="range" value={filters.range} onChange={change}>
        <option value="">Any time</option><option value="1">Last hour</option><option value="24">Last day</option>
        <option value="168">Last week</option>
      </select></label>
      <button type="button" onClick={() => top.current.scrollIntoView({ block: "start" })}>Back to newest</button>
    </div>
    {failure && <p role="alert">{failure} <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry history</button></p>}
    {!matching.length && <p>{loading ? "Loading execution history…" : "No matching events in the loaded turns."}</p>}
    <ol className="operations__execution-events" aria-label="Execution activity, newest first">
      {matching.slice(0, limit).map(item => <li key={item.key}>
        <div className="operations__execution-event-meta">
          {item.at && <time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time>}
          <span>{item.index === -1 ? "Owner" : item.actor}</span>
          <span>{item.category}</span>
        </div>
        <button type="button" onClick={() => { setInspect(item); dialog.current.showModal(); }}>{item.label}</button>
        {item.text && <p>{preview(item.text)}</p>}
      </li>)}
    </ol>
    {matching.length > limit && <button type="button" onClick={() => setLimit(value => value + 80)}>Show earlier events</button>}
    {historyCursor && cursor !== null && <button type="button" disabled={loading}
      onClick={() => setCursor(historyCursor)}>{loading ? "Loading turns…" : "Load older turns"}</button>}
    <dialog className="operations__dialog" ref={dialog} aria-labelledby="operations-execution-entry-heading">
      <form method="dialog"><button type="submit">Close</button></form>
      {inspect && <>
        <h4 id="operations-execution-entry-heading">{inspect.label}</h4>
        <pre>{inspect.text}</pre>
        <button type="button" onClick={() => copy(inspect.text)}>Copy entry</button>
        {inspect.turnId !== current.id && <button type="button" onClick={() => {
          dialog.current.close();
          selectJob(inspect.turnId);
        }}>Open this turn</button>}
      </>}
    </dialog>
  </div>;
}
