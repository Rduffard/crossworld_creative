import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MediaPreview } from "./MediaAttachments";
import { profileNames, workspaceNames } from "./workspaces";

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

export default function JobTranscript({ api, job, copy, jobId, mode, selectJob, promptPreview, proposal, children }) {
  const answer = useMemo(() => job.events.filter((event) => event.view === "response").map((event) => event.text).join(""), [job.events]);
  const updates = useMemo(() => job.events.filter((event) => event.view === "activity" && event.label !== "Command started"), [job.events]);
  const [updateCount, setUpdateCount] = useState(20);
  const [visibleCount, setVisibleCount] = useState(80);
  const [filter, setFilter] = useState("");
  const [prompt, setPrompt] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");
  const transcript = useRef(null);
  const followsLatest = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const entries = useMemo(() => {
    const output = new Map();
    return job.events.reduce((rows, event, index) => {
      if (event.view !== "execution") return rows;
      if (/^(?:Command output|Output) · /.test(event.label)) {
        const existing = output.get(event.label);
        if (existing) {
          existing.text += event.text;
          return rows;
        }
      }
      const row = { ...event, index };
      rows.push(row);
      if (/^(?:Command output|Output) · /.test(event.label)) output.set(event.label, row);
      return rows;
    }, []);
  }, [job.events]);
  const term = filter.trim().toLowerCase();
  const matching = term ? entries.filter((entry) => `${entry.label}\n${entry.text}`.toLowerCase().includes(term)) : entries;
  const workerRole = job.assignedRole || job.workerRole;
  const actor = job.assigneeName || job.studioActor?.name || (job.studioTools ? "First Mate" :
    workerRole && workerRole !== "direct" ? workerRole.replaceAll("-", " ") : "Codex");
  const summary = [
    "# Crossworld Operations session",
    `- Session: ${job.sessionId}`,
    `- Job: ${jobId}`,
    `- Status: ${job.status}`,
    `- Workspace: ${workspaceNames[job.workspace]}`,
    `- Permissions: ${profileNames[job.profile || "read-only"]}`,
    `- Model: ${job.model} (${job.effort})`,
    job.error && `\nError: ${job.error}`,
    answer && `\n${answer}`,
  ].filter(Boolean).join("\n");

  async function loadPrompt() {
    setLoadingPrompt(true);
    setPromptError("");
    try { setPrompt((await api(`/jobs/${jobId}?offset=${job.eventCount || 0}`)).prompt); }
    catch (failure) { setPromptError(failure.message); }
    finally { setLoadingPrompt(false); }
  }

  function goToLatest() {
    const node = transcript.current;
    if (node) node.scrollTop = node.scrollHeight;
    followsLatest.current = true;
    setShowLatest(false);
  }

  useEffect(() => {
    if (followsLatest.current && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [job.events.length, mode]);

  return <div className="operations__desk" data-view={mode.toLowerCase()}>
    <section className="operations__pane operations__conversation" aria-label="Conversation" tabIndex={0}
      ref={transcript} onScroll={(event) => {
        const node = event.currentTarget;
        followsLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        setShowLatest(!followsLatest.current);
      }}>
      {job.sessionId && <SessionTurns api={api} key={job.sessionId} sessionId={job.sessionId} jobId={jobId} selectJob={selectJob} />}
      <article className="operations__message operations__message--owner">
      <div className="operations__message-meta">
        <strong>Owner</strong>
        {job.createdAt && <time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString()}</time>}
      </div>
      {promptPreview && <p className="operations__prompt-preview">{promptPreview}</p>}
      <details onToggle={(event) => {
        if (event.currentTarget.open && prompt === null && !loadingPrompt) loadPrompt();
      }}>
        <summary>{promptPreview ? "Read full prompt" : "Submitted prompt"}</summary>
        {loadingPrompt && <p role="status">Loading prompt…</p>}
        {promptError && <p role="alert">{promptError} <button type="button" onClick={loadPrompt}>Retry</button></p>}
        {prompt !== null && <><button type="button" onClick={() => copy(prompt)}>Copy prompt</button><pre>{prompt}</pre></>}
      </details>
      {job.mediaInputs?.map(({ id, name }) => <MediaPreview key={id} id={id} name={name} />)}
      </article>
      {updates.length > 0 && <details>
        <summary>Agent updates ({updates.length})</summary>
        {updates.length > updateCount && <button type="button" onClick={() => setUpdateCount((count) => count + 20)}>Show earlier updates</button>}
        {updates.slice(-updateCount).map((event, index) => <div key={updates.length - Math.min(updates.length, updateCount) + index}>
          <strong>{event.label}</strong>
          <Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{event.text}</Markdown>
        </div>)}
      </details>}
      <article className="operations__message">
      <div className="operations__message-meta">
        <strong>{actor}</strong>
        {job.finishedAt && <time dateTime={job.finishedAt}>{new Date(job.finishedAt).toLocaleString()}</time>}
      </div>
      {answer ? <div className="operations__response"><Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}
        components={{ pre: ({ children: code }) => <div className="operations__code-block">
          {typeof code?.props?.children === "string" && <button type="button" onClick={() => copy(code.props.children)}>Copy code</button>}
          <pre>{code}</pre>
        </div> }}>{answer}</Markdown></div>
        : <p>No final response yet.</p>}
      {!!job.mediaOutputs?.length && <section aria-label="Returned media">
        <h4>Returned media</h4>
        {job.mediaOutputs.map(({ id, name }) => <MediaPreview key={id} id={id} name={name} />)}
      </section>}
      <div className="operations__modes">
        {answer && <button type="button" onClick={() => copy(answer)}>Copy response</button>}
        <button type="button" onClick={() => copy(summary)}>Copy session summary</button>
      </div>
      </article>
      {proposal}
      {showLatest && <button type="button" className="operations__latest" onClick={goToLatest}>Back to latest</button>}
    </section>
    <section className="operations__pane" aria-label="Execution" tabIndex={0}>
      <h3>Execution</h3>
      {children}
      <label>Search execution output<input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
      {matching.length === 0 && <p>{term ? "No matching execution events." : "No execution events yet."}</p>}
      {matching.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 80)}>Show earlier events</button>}
      {matching.slice(-visibleCount).map((event) => <details key={event.index}>
        <summary>{event.label}{event.at && <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}</summary>
        <button type="button" onClick={() => copy(event.text)}>Copy entry</button>
        <pre>{event.text}</pre>
      </details>)}
    </section>
  </div>;
}
