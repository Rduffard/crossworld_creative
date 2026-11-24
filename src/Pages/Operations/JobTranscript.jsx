import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { conversationPage, readTurn, readConversation, conversationMarkdown, redactExport, downloadText } from "./conversationExport";
import { MediaPreview } from "./MediaAttachments";
import { profileNames, workspaceNames } from "./workspaces";
import { activityEntries, agentMessages } from "./executionEvents";

function AgentUpdates({ messages, actor, copy }) {
  return messages.map((event, index) => <article className="operations__message operations__message--update" key={index}>
    <div className="operations__message-meta">
      <strong>{actor}</strong>
      <span>{event.label}</span>
      {event.at && <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}
    </div>
    <div className="operations__response"><Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{event.text}</Markdown></div>
    <button type="button" onClick={() => copy(event.text)}>Copy message</button>
  </article>);
}

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

function PreviousConversation({ api, sessionId, jobId, copy }) {
  const [before, setBefore] = useState(jobId);
  const [messages, setMessages] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setFailure("");
      try {
        const rows = await conversationPage(api, sessionId, before);
        const ids = rows.slice(0, 5).map(row => row._id);
        const results = await Promise.all(ids.map(id => readTurn(api, id)));
        if (active) {
          setMessages(previous => [...results.reverse(), ...previous]);
          setNext(rows.length > ids.length ? ids.at(-1) : null);
        }
      } catch (error) {
        if (active) setFailure(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [api, before, sessionId]);

  return <>
    {next && <button type="button" disabled={loading} onClick={() => setBefore(next)}>Load older messages</button>}
    {loading && <p role="status">Loading earlier messages</p>}
    {failure && <p role="alert">{failure}</p>}
    {messages.map(turn => <div key={turn.id}>
      <article className="operations__message operations__message--owner">
        <div className="operations__message-meta"><strong>Owner</strong>
          {turn.createdAt && <time dateTime={turn.createdAt}>{new Date(turn.createdAt).toLocaleString()}</time>}
        </div>
        <div className="operations__response"><Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{turn.prompt}</Markdown></div>
        {turn.attachments.length > 0 && <p>Attachments: {turn.attachments.map(({ name }) => name || "Attachment").join(", ")}</p>}
        <button type="button" onClick={() => copy(turn.prompt)}>Copy message</button>
      </article>
      <AgentUpdates messages={turn.messages} actor={turn.actor} copy={copy} />
      <article className="operations__message">
        <div className="operations__message-meta"><strong>{turn.actor}</strong>
          {turn.finishedAt && <time dateTime={turn.finishedAt}>{new Date(turn.finishedAt).toLocaleString()}</time>}
        </div>
        {turn.answer ? <>
          <div className="operations__response"><Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{turn.answer}</Markdown></div>
          <button type="button" onClick={() => copy(turn.answer)}>Copy message</button>
        </> : <p>Turn status: {turn.status}</p>}
      </article>
    </div>)}
  </>;
}

export default function JobTranscript({ api, job, host, copy, jobId, mode, selectJob, promptPreview, proposal, children }) {
  const answer = useMemo(() => job.events.filter((event) => event.view === "response").map((event) => event.text).join(""), [job.events]);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportFailure, setExportFailure] = useState("");
  const [visibleCount, setVisibleCount] = useState(80);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [prompt, setPrompt] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [promptAttempt, retryPrompt] = useState(0);
  const [promptError, setPromptError] = useState("");
  const transcript = useRef(null);
  const followsLatest = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const entries = useMemo(() => activityEntries(job.events), [job.events]);
  const messages = useMemo(() => agentMessages(job.events), [job.events]);
  const categories = [...new Set(entries.map(entry => entry.category))].sort();
  const term = filter.trim().toLowerCase();
  const matching = entries.filter(entry => (!category || entry.category === category) &&
    (!term || `${entry.label}\n${entry.text}`.toLowerCase().includes(term)));
  const workerRole = job.assignedRole || job.workerRole;
  const actor = job.conversationActor?.name || job.assigneeName || job.studioActor?.name || (job.studioTools ? "First Mate" :
    workerRole && workerRole !== "direct" ? workerRole.replaceAll("-", " ") : "Codex");
  const confirmedModel = entries.find(entry => entry.label === "Confirmed model" && entry.view === "execution")?.text;
  const executionSummary = [
    ["Employee", actor], ["Status", job.status], ["Host", host?.label || "Unknown"],
    ["Requested model", job.model || "Unknown"], ["Confirmed model", confirmedModel || "Unknown"],
    ["Requested reasoning", job.effort || "Unknown"], ["Confirmed reasoning", "Unknown"],
    ["Permission profile", profileNames[job.profile || "read-only"]],
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

  useEffect(() => {
    let current = true;
    setLoadingPrompt(true);
    setPromptError("");
    api("/jobs/" + jobId + "?offset=" + Number.MAX_SAFE_INTEGER)
      .then(result => { if (current) setPrompt(result.prompt); })
      .catch(failure => { if (current) setPromptError(failure.message); })
      .finally(() => { if (current) setLoadingPrompt(false); });
    return () => { current = false; };
  }, [api, jobId, promptAttempt]);

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

      {job.parentId && job.sessionId && <PreviousConversation key={jobId} api={api} sessionId={job.sessionId} jobId={jobId} copy={copy} />}
      <article className="operations__message operations__message--owner">
      <div className="operations__message-meta">
        <strong>Owner</strong>
        {job.createdAt && <time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString()}</time>}
      </div>
      {prompt == null && promptPreview && <p className="operations__prompt-preview">{promptPreview}</p>}
      {loadingPrompt && !promptPreview && <p role="status">Loading message</p>}
      {promptError && <p role="alert">{promptError} <button type="button" onClick={() => retryPrompt(value => value + 1)}>Retry</button></p>}
      {prompt != null && (prompt.length > 8000 ? <details>
        <summary>Read full message</summary><pre>{prompt}</pre>
      </details> : <div className="operations__response"><Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{prompt}</Markdown></div>)}
      {prompt != null && <button type="button" onClick={() => copy(prompt)}>Copy message</button>}
      {job.mediaInputs?.map(({ id, name }) => <MediaPreview key={id} id={id} name={name} />)}
      </article>
      <AgentUpdates messages={messages} actor={actor} copy={copy} />
      <article className="operations__message">
      <div className="operations__message-meta">
        <strong>{actor}</strong>
        {answer && <span>Final response</span>}
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
        {job.mediaOutputs.map(({ id, name }) => <div key={id}>
          <MediaPreview id={id} name={name} />
          <a href={"/operations?workspace=artifacts&artifact=" + encodeURIComponent(id)}>Inspect artifact</a>
        </div>)}
      </section>}
      <div className="operations__modes">
        {answer && job.events.length >= job.eventCount && <button type="button" onClick={() => copy(answer)}>Copy message</button>}
        <details><summary>Conversation actions</summary>
          <button type="button" onClick={() => copy(summary)}>Copy turn summary</button>
          <button type="button" disabled={exportProgress !== null} onClick={exportTurn}>Download execution turn</button>
          <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("copy")}>Copy conversation</button>
          <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("markdown")}>Download Markdown</button>
          <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("json")}>Download JSON</button>
          <button type="button" disabled={exportProgress !== null} onClick={() => exportConversation("text")}>Download text</button>
        </details>
      </div>
      </article>
      {exportProgress !== null && <p role="status">Preparing export {exportProgress || ""}</p>}
      {exportFailure && <p role="alert">{exportFailure}</p>}
      {proposal}
      {showLatest && <button type="button" className="operations__latest" onClick={goToLatest}>Back to latest</button>}
    </section>
    <section className="operations__pane" aria-label="Execution" tabIndex={0}>
      <h3>Execution</h3>
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
    </section>
  </div>;
}
