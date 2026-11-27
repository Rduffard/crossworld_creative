import { useMemo, useState } from "react";
import { readTurn, readConversation, conversationMarkdown, redactExport, downloadText } from "./conversationExport";
import { profileNames, workspaceNames } from "./workspaces";
import { activityEntries } from "./executionEvents";
import ConversationTimeline from "./ConversationTimeline.jsx";
import { turnActor } from "./timelineEntries.js";
function SessionTurns({ api, sessionId, jobId, selectJob }) {
  const [turns, setTurns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  async function loadMore() {
    if (busy || atEnd) return;
    const query = new URLSearchParams({ session: sessionId, compact: "true" });
    if (turns.length) query.set("before", turns.at(-1)._id);
    setBusy(true);
    setFailure("");
    try {
      const rows = await api(`/jobs?${query}`);
      setTurns((previous) => [...previous, ...rows]);
      setLoaded(true);
      setAtEnd(rows.length < 50);
    } catch (error) {
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <details className="operations__thread-turns" onToggle={(event) => {
    if (event.currentTarget.open && !loaded) loadMore();
  }}>
    <summary>Conversation turns</summary>
    {failure && <p role="alert">{failure}</p>}
    {loaded && turns.length === 0 && <p>No turns were found.</p>}
    <ul>{turns.map((turn) => <li key={turn._id}>
      <button type="button" aria-current={jobId === turn._id ? "true" : undefined} onClick={() => selectJob(turn._id)}>
        {turn.prompt || "Turn"} · {turn.status}
        {turn.createdAt && <small><time dateTime={turn.createdAt}>{new Date(turn.createdAt).toLocaleString()}</time></small>}
      </button>
    </li>)}</ul>
    {!atEnd && <button type="button" disabled={busy} onClick={loadMore}>{busy ? "Loading turns…" : loaded ? "Load earlier turns" : "Load turns"}</button>}
  </details>;
}

export default function JobTranscript({ api, job, host, copy, jobId, refreshVersion, mode, selectJob, promptPreview, proposal, children }) {
  const answer = useMemo(() => job.events.filter((event) => event.view === "response").map((event) => event.text).join(""), [job.events]);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportFailure, setExportFailure] = useState("");
  const [visibleCount, setVisibleCount] = useState(80);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const entries = useMemo(() => activityEntries(job.events), [job.events]);
  const categories = [...new Set(entries.map(entry => entry.category))].sort();
  const term = filter.trim().toLowerCase();
  const matching = entries.filter(entry => (!category || entry.category === category) &&
    (!term || `${entry.label}\n${entry.text}`.toLowerCase().includes(term)));
  const actor = turnActor(job);
  const confirmedModel = entries.find(entry => entry.label === "Confirmed model" && entry.view === "execution")?.text;
  const permissions = job.permissionDiagnostics;
  const executionSummary = [
    ["Execution", jobId], ["Session", job.sessionId], ["Employee", actor], ["Status", job.status], ["Host", host?.label || "Unknown"],
    ["Requested model", job.model || "Unknown"], ["Confirmed model", confirmedModel || "Unknown"],
    ["Requested reasoning", job.effort || "Unknown"], ["Confirmed reasoning", "Unknown"],
    ["Permission profile", profileNames[job.profile || "read-only"]],
    ...(permissions ? [
      ["Requested profile", profileNames[permissions.requestedProfile]],
      ["Effective profile", profileNames[permissions.effectiveProfile]],
      ["Mission", permissions.missionId],
      ["Authorized capabilities", permissions.authorizedCapabilities.join(", ")],
      ["Required capabilities", permissions.requiredCapabilities.join(", ")],
      ["Verified capabilities", permissions.verifiedCapabilities.join(", ")],
      ["Execution environment", permissions.environment + " · " + permissions.sandbox],
      ["Scope fingerprint", permissions.scope],
      ["Runtime fingerprint", permissions.runtime],
      ["Preflight observed", new Date(permissions.observedAt).toLocaleString()],
    ] : []),
    ["Started", job.startedAt ? new Date(job.startedAt).toLocaleString() : "Not recorded"],
    ["Objective", job.objectiveId], ["Previous turn", job.parentId], ["Delegated by", job.delegatedBy?.sourceTurnId],
    ["Delegated review", job.delegatedReview?._id],
  ].filter(([, value]) => value);
  const summary = [
    "# Crossworld Operations session",
    `- Session: ${job.sessionId}`,
    `- Job: ${jobId}`,
    `- Status: ${job.status}`,
    `- Workspace: ${workspaceNames[job.workspace]}`,
    `- Permissions: ${profileNames[job.profile || "read-only"]}`,
    `- Requested model: ${job.model || "Unknown"} (${job.effort || "unknown"} reasoning)`,
    job.error && `\nError: ${job.error}`,
    answer && `\n${answer}`,
  ].filter(Boolean).join("\n");

  async function exportConversation(format) {
    setExportProgress(0);
    setExportFailure("");
    try {
      const turns = await readConversation(api, job.sessionId || jobId, setExportProgress);
      const markdown = redactExport(conversationMarkdown(turns));
      const filename = "operations-conversation-" + (job.sessionId || jobId);
      if (format === "copy") await copy(markdown);
      else if (format === "json") downloadText(filename + ".json", "application/json", JSON.stringify(turns, (_key, value) =>
        typeof value === "string" ? redactExport(value) : value, 2));
      else if (format === "text") downloadText(filename + ".txt", "text/plain;charset=utf-8", markdown);
      else downloadText(filename + ".md", "text/markdown;charset=utf-8", markdown);
    } catch (failure) {
      setExportFailure(failure.message);
    } finally {
      setExportProgress(null);
    }
  }

  async function copyActivity() {
    setExportProgress(0);
    setExportFailure("");
    try {
      const turn = await readTurn(api, jobId, true);
      await copy(redactExport(activityEntries(turn.activity).map(event =>
        [event.at, turn.actor, event.label, "\n" + event.text].filter(Boolean).join(" \u00b7 ")).join("\n\n")));
    } catch (failure) {
      setExportFailure(failure.message);
    } finally {
      setExportProgress(null);
    }
  }

  async function exportTurn() {
    setExportProgress(0);
    setExportFailure("");
    try {
      const turn = await readTurn(api, jobId, true);
      const activity = activityEntries(turn.activity).map(event =>
        [event.at, event.label, "\n" + event.text].filter(Boolean).join(" · ")).join("\n\n");
      const text = [conversationMarkdown([turn]), "## Execution activity", activity].join("\n\n");
      downloadText("operations-turn-" + jobId + ".md", "text/markdown;charset=utf-8", redactExport(text));
    } catch (failure) {
      setExportFailure(failure.message);
    } finally {
      setExportProgress(null);
    }
  }

  return <div className="operations__transcript-body">
    <ConversationTimeline api={api} job={job} copy={copy} promptPreview={promptPreview} proposal={proposal}
      refreshVersion={refreshVersion} visible={mode !== "Execution"} />
    {mode === "Execution" && <section className="operations__pane operations__execution-inspector" aria-label="Execution inspector" tabIndex={0}>      <h3>Execution inspector</h3>
      <details><summary>Copy or export</summary>
        <button type="button" onClick={() => copy(summary)}>Copy turn summary</button>
        <button type="button" disabled={exportProgress !== null} onClick={exportTurn}>Download execution turn</button>
        <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("copy")}>Copy conversation</button>
        <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("markdown")}>Download Markdown</button>
        <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("json")}>Download JSON</button>
        <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("text")}>Download text</button>
        {exportProgress !== null && <p role="status">Preparing export…</p>}
      </details>
      <details>
        <summary>Execution summary</summary>
        <dl className="operations__execution-summary">{executionSummary.map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </details>
      {children}
      {job.sessionId && <SessionTurns api={api} key={job.sessionId} sessionId={job.sessionId} jobId={jobId} selectJob={selectJob} />}
      {entries[0] && <p>{actor} {"\u00b7"} {entries[0].label}{entries[0].at && <>{" \u00b7 "}<time dateTime={entries[0].at}>{new Date(entries[0].at).toLocaleTimeString()}</time></>}</p>}
      <button type="button" disabled={exportProgress !== null || !entries.length} onClick={copyActivity}>Copy execution activity</button>
      {mode === "Execution" && exportFailure && <p role="alert">{exportFailure}</p>}
      <label>Search execution output<input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
      <label>Event category<select value={category} onChange={event => setCategory(event.target.value)}>
        <option value="">All categories</option>
        {categories.map(value => <option key={value}>{value}</option>)}
      </select></label>
      {matching.length === 0 && <p>{term || category ? "No matching execution events." : "No execution events yet."}</p>}
      {matching.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 80)}>Show earlier events</button>}
      {matching.slice(0, visibleCount).map((event) => <details key={event.index}>
        <summary>{event.label}{event.at && <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}</summary>
        <button type="button" onClick={() => copy(event.text)}>Copy entry</button>
        <pre>{event.text}</pre>
      </details>)}
    </section>}
  </div>;
}
