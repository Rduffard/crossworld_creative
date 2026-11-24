import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { requestJson } from "../../utils/api";
import {
  ATTACHMENT_BYTES, LEGACY_PROMPT_LIMIT, PROMPT_LIMIT, importPromptFile, loadPromptDraft, savePromptDraft,
} from "./promptEditor";
import "./Operations.css";

const api = (path, options) => requestJson(`/operations${path}`, { auth: true, ...options });
async function post(path, body) {
  try {
    return await api(path, { method: "POST", body });
  } catch (failure) {
    if (failure.status === 413) throw new Error("The request exceeds the Operations transport limit. Shorten the prompt and try again.");
    throw failure;
  }
}
const running = ["waiting", "queued", "running", "cancelling"];
const profileNames = { "read-only": "Read-only inspection", development: "Development repository editing", workshop: "Workshop editing" };
const localPolicyOperations = ["read", "history", "ci", "localBranch", "localCommit"];
const workspaceNames = { development: "C: · Development", workshop: "D: · Art Workshop" };
const modes = ["Activity", "Execution", "Summary"];

function Transcript({ job, mode, copy }) {
  const [visibleCount, setVisibleCount] = useState(80);
  const answer = job.events.filter((event) => event.view === "response").map((event) => event.text).join("");
  if (mode === "Summary") {
    const summary = [
      `# Crossworld Operations session`,
      `- Session: ${job.sessionId}`,
      `- Job: ${job._id}`,
      `- Status: ${job.status}`,
      `- Workspace: ${workspaceNames[job.workspace]}`,
      `- Permissions: ${profileNames[job.profile || "read-only"]}`,
      `- Model: ${job.model} (${job.effort})`,
      job.error && `\nError: ${job.error}`,
      answer && `\n${answer}`,
    ].filter(Boolean).join("\n");
    return <>
      <button type="button" onClick={() => copy(summary)}>Copy session summary</button>{" "}
      <button type="button" disabled={!answer} onClick={() => copy(answer)}>Copy response as Markdown</button>
      {answer ? <div className="operations__response"><Markdown skipHtml disallowedElements={["img"]}>{answer}</Markdown></div>
        : <p>No final response yet.</p>}
    </>;
  }
  const events = job.events.map((event, index) => ({ ...event, index }))
    .filter((event) => event.view === mode.toLowerCase());
  if (!events.length) return <p>No {mode.toLowerCase()} events yet.</p>;
  const commandOutput = new Map();
  const visible = events.filter((event) => {
    if (!event.label.startsWith("Output · ") && !event.label.startsWith("Command output · ")) return true;
    const first = !commandOutput.has(event.label);
    commandOutput.set(event.label, (commandOutput.get(event.label) || "") + event.text);
    return first;
  });
  return <>
    {visible.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 80)}>
      Show earlier {mode.toLowerCase()} events
    </button>}
    {visible.slice(-visibleCount).map((event) => mode === "Execution" ? (
    <details key={event.index}>
      <summary>{event.label}</summary>
      <button type="button" onClick={() => copy(commandOutput.get(event.label) ?? event.text)}>Copy output</button>
      <pre>{commandOutput.get(event.label) ?? event.text}</pre>
    </details>
  ) : (
    <p key={event.index}><strong>{event.label}</strong> {event.text}</p>
    ))}
  </>;
}

export default function Operations() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [relayError, setRelayError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [jobId, setJobId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("job");
    return /^[a-f\d-]{36}$/.test(id || "") ? id : "";
  });
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [profile, setProfile] = useState("read-only");
  const [policyRole, setPolicyRole] = useState("direct");
  const [job, setJob] = useState(null);
  const [mode, setMode] = useState("Activity");
  const [hostId, setHostId] = useState("");
  const [workspace, setWorkspace] = useState("development");
  const [effort, setEffort] = useState("medium");
  const [draft, setDraft] = useState(() => {
    try { return { prompt: loadPromptDraft(window.localStorage), error: "" }; }
    catch { return { prompt: "", error: "Draft storage is unavailable in this browser." }; }
  });
  const { prompt } = draft;
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [attachment, setAttachment] = useState({});
  const [deviceName, setDeviceName] = useState("");
  const [credential, setCredential] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingSubmit = useRef(null);
  const pendingSteer = useRef(null);

  function selectJob(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("job", id);
    window.history.replaceState(window.history.state, "", url);
    setJobId(id);
    setMode("Activity");
  }

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const query = new URLSearchParams({ search, archived: String(archived), compact: "true" });
        const [hosts, jobs, approvals] = await Promise.all([
          api("/hosts"), api(`/jobs?${query}`), api("/approvals").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }),
        ]);
        if (active) {
          setSnapshot({ hosts, jobs, approvals });
          setRelayError("");
        }
      } catch (failure) {
        if (!active) return;
        if ([401, 403, 404].includes(failure.status)) {
          setAccessDenied(true);
          setSnapshot(null);
          return;
        }
        setRelayError(failure.message);
      }
      if (active) timer = setTimeout(refresh, 2500);
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [search, archived]);

  useEffect(() => {
    if (!jobId || accessDenied) return;
    let active = true;
    let timer;
    const events = [];
    async function refresh() {
      try {
        const detail = await api(`/jobs/${jobId}?offset=${events.length}&compact=true`);
        if (!active) return;
        events.push(...detail.events);
        setJob({ ...detail, events: [...events] });
        if (!running.includes(detail.status) && events.length >= detail.eventCount) return;
        timer = setTimeout(refresh, events.length < detail.eventCount ? 0 : 900);
      } catch (failure) {
        if (!active) return;
        setError(failure.message);
        if (![401, 403, 404].includes(failure.status)) timer = setTimeout(refresh, 2500);
      }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [jobId, accessDenied]);

  const host = snapshot?.hosts.find((entry) => entry._id === hostId) ||
    snapshot?.hosts.find((entry) => entry.online);
  const selectedEffort = host?.efforts?.includes(effort) ? effort : host?.efforts?.[0] || "";
  const selectedJob = job?._id === jobId ? job : null;
  const hostOnline = !relayError && host?.online;
  const selectedHost = snapshot?.hosts.find((entry) => entry._id === selectedJob?.hostId);
  const selectedProfile = profile === workspace && host?.profiles?.includes(profile) ? profile : "read-only";
  const approval = selectedJob?.approval;
  const awaitingApproval = selectedJob?.status === "running" && approval?.state === "pending";
  const canAct = !busy && !relayError && !!selectedHost?.online;
  const governance = snapshot?.approvals;
  const workerEnabled = governance?.workerEnabled !== false;

  const startLimit = host?.promptLimit ?? LEGACY_PROMPT_LIMIT;
  const continuationLimit = selectedHost?.promptLimit ?? LEGACY_PROMPT_LIMIT;
  const validPrompt = !!prompt.trim() && prompt.length <= PROMPT_LIMIT && prompt.isWellFormed();
  const promptError = prompt.length > PROMPT_LIMIT ? "The prompt exceeds 120,000 characters."
    : !prompt.isWellFormed() ? "The prompt contains invalid Unicode." : "";
  const editingLocked = busy || importing;

  function updatePrompt(value) {
    let error = "";
    try { savePromptDraft(window.localStorage, value, prompt); }
    catch { error = "This draft could not be saved in this browser. Keep a copy before refreshing."; }
    setDraft({ prompt: value, error });
  }

  async function attachFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      updatePrompt(await importPromptFile(file, prompt));
      setAttachment({ message: `Added ${file.name} to the prompt.` });
    } catch (failure) {
      setAttachment({ error: failure.message });
    } finally {
      setImporting(false);
    }
  }

  function clearSubmittedDraft() {
    updatePrompt("");
    setAttachment({});
  }

  async function action(callback) {
    setBusy(true);
    setError("");
    try { await callback(); } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  function submit(parent, queue = false) {
    if (editingLocked || !validPrompt || prompt.length > (parent ? continuationLimit : startLimit)) return;
    return action(async () => {
      const request = {
        prompt, model: "gpt-6.2-sol", effort: parent?.effort || selectedEffort, queue,
        profile: parent ? parent.profile || "read-only" : selectedProfile,
        workspace: parent?.workspace || workspace, hostId: parent?.hostId || host?._id, parentId: parent?._id,
      };
      const signature = JSON.stringify(request);
      if (pendingSubmit.current?.signature !== signature) {
        pendingSubmit.current = { signature, id: crypto.randomUUID() };
      }
      const { _id } = await post("/jobs", { id: pendingSubmit.current.id, ...request });
      pendingSubmit.current = null;
      if (queue) setNotice("Follow-up queued. Open it from session history.");
      else selectJob(_id);
      clearSubmittedDraft();
      setMode("Activity");
    });
  }

  function steer() {
    if (editingLocked || !validPrompt || prompt.length > continuationLimit) return;
    return action(async () => {
      const turnId = selectedJob.activeTurn.turnId;
      const signature = JSON.stringify([jobId, turnId, prompt]);
      if (pendingSteer.current?.signature !== signature) pendingSteer.current = { signature, id: crypto.randomUUID() };
      await post(`/jobs/${jobId}/steer`, { id: pendingSteer.current.id, turnId, input: prompt });
      pendingSteer.current = null;
      clearSubmittedDraft();
    });
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch { setNotice("Clipboard unavailable. Select and copy the text manually."); }
  }

  if (accessDenied) return <main className="operations"><h1>Crossworld Operations</h1><p>Private Operations access unavailable.</p></main>;
  if (!snapshot) return <main className="operations"><h1>Crossworld Operations</h1><p role="status">{relayError || "Checking Operations access…"}</p></main>;

  return (
    <main className="operations">
      <header className="operations__hero">
        <h1>Crossworld Operations</h1>
        <p role="status">{relayError ? "Operations API unavailable" : hostOnline ? `${host.label} connected` : "Windows execution host offline"}</p>
      </header>
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
      {governance && <section className="operations__panel" aria-label="Operation approvals">
        <h2>Operation approvals</h2>
        {!governance.githubEnabled && <p>Use an editing session for instructed Git operations. Review any command approval in that session.</p>}
        {!governance.toolsEnabled && <p>Editing sessions can use installed app commands and the worker’s selected MCP inspection tools.</p>}
        <details>
          <summary>Operation policies</summary>
          {Object.entries(governance.policy.modes).map(([operation, mode]) => <label key={operation}>
            {operation}
            <select value={mode} disabled={busy} onChange={(event) => {
              const next = event.target.value;
              action(() => api("/approvals/policy", {
                method: "PATCH",
                body: { revision: governance.policy.revision, modes: { ...governance.policy.modes, [operation]: next } },
              }));
            }}>
              {localPolicyOperations.includes(operation) && <option value="allow">Allow</option>}
              <option value="ask">Ask for approval</option>
              <option value="block">Block</option>
            </select>
          </label>)}
          <p>Always blocked · {governance.policy.immutableBlocks.join(", ")}</p>
        </details>
        <details>
          <summary>Brokered tool policies</summary>
          <label>Worker role<input value={policyRole} maxLength={32} onChange={(event) => setPolicyRole(event.target.value)} /></label>
          {Object.entries(governance.policy.catalog || {}).flatMap(([tool, definition]) => definition.workspaces.map((scope) => {
            const key = `${policyRole}:${scope}:${tool}`;
            return <label key={key}>{tool} · {workspaceNames[scope]}
              <select value={governance.policy.toolModes[key] || "block"}
                disabled={busy || !/^[a-z][a-z0-9-]{0,31}$/.test(policyRole)}
                onChange={(event) => action(() => api("/approvals/policy", {
                  method: "PATCH", body: { revision: governance.policy.revision, modes: governance.policy.modes,
                    toolModes: { ...governance.policy.toolModes, [key]: event.target.value } },
                }))}>
                <option value="allow">Allow</option><option value="ask">Ask for approval</option><option value="block">Block</option>
              </select>
            </label>;
          }))}
        </details>
        {governance.requests.length === 0 && <p>No operation requests.</p>}
        {governance.requests.map((request) => <details key={request._id} open={request.state === "pending" || undefined}>
          <summary>{request.intent.tool || request.intent.operation} · {request.intent.repository || request.intent.workspace} · {request.state}</summary>
          <dl>
            <dt>Worker and session</dt><dd>{request.worker.label} · {request.sessionId}</dd>
            {request.intent.operation === "mcpTool" ? <>
              <dt>Workspace and role</dt><dd>{workspaceNames[request.intent.workspace]} · {request.intent.role}</dd>
              <dt>Tool arguments</dt><dd><pre>{JSON.stringify(request.intent.arguments, null, 2)}</pre></dd>
            </> : <>
            <dt>Branch and target</dt><dd>{request.intent.branch} {request.intent.target && `· ${request.intent.target}`}</dd>
            <dt>Reviewed commits</dt><dd><code>{request.intent.headSha}</code>{request.intent.baseSha && <> · <code>{request.intent.baseSha}</code></>}</dd>
            <dt>Submitted changes</dt><dd><pre>{request.intent.changes}</pre></dd>
            {request.intent.diff && <><dt>Submitted diff</dt><dd><pre>{request.intent.diff}</pre></dd></>}
            <dt>Submitted test results</dt><dd><pre>{request.intent.tests}</pre></dd>
            </>}
            <dt>Consequences</dt><dd>{request.consequences}</dd>
            <dt>Expires</dt><dd>{new Date(request.expiresAt).toLocaleString()}</dd>
          </dl>
          {request.state === "pending" && ["approve", "deny"].map((choice) => <button key={choice} type="button"
            disabled={busy || (choice === "approve" && !(request.intent.operation === "mcpTool" ? governance.toolsEnabled : governance.githubEnabled))} onClick={() => action(() =>
              post(`/jobs/${request.jobId}/approval`, { id: request._id, choice, fingerprint: request.fingerprint }))}>
            {choice === "approve" ? "Approve once" : "Deny"}
          </button>)}
        </details>)}
      </section>}
      <div className="operations__layout">
        <aside className="operations__panel">
          <h2>Session history</h2>
          <label>Search sessions<input type="search" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} /> Archived sessions</label>
          {snapshot.jobs.length === 0 && <p>No jobs yet.</p>}
          <ul>{snapshot.jobs.map((entry) => <li key={entry._id}>
            <button type="button" aria-pressed={jobId === entry._id} onClick={() => selectJob(entry._id)}>
              {entry.title ? `${entry.title} · ` : ""}{entry.prompt.slice(0, 55)} <small>{entry.status}{entry.parentId ? " · Follow-up" : ""}</small>
            </button>
          </li>)}</ul>
          <details>
            <summary>Manage devices</summary>
            <p>Register your Windows PC, then open <strong>Start Crossworld Operations.cmd</strong> on that PC.</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              action(async () => {
                const result = await post("/hosts", { label: deviceName });
                setCredential(result.token);
                setDeviceName("");
              });
            }}>
              <label>Device name<input required maxLength={80} value={deviceName} onChange={(event) => setDeviceName(event.target.value)} /></label>
              <button disabled={busy}>Register device</button>
            </form>
            {credential && <div>
              <p>Save this credential on the Windows host. It is displayed once.</p>
              <code className="operations__credential">{credential}</code>
              <button type="button" onClick={() => copy(credential)}>Copy credential</button>{" "}
              <button type="button" onClick={() => setCredential("")}>Hide</button>
            </div>}
            <ul>{snapshot.hosts.filter((entry) => !entry.revokedAt).map((entry) => <li key={entry._id}>
              {entry.label} · {entry.online ? "Online" : "Offline"}{" "}
              <button type="button" disabled={busy} onClick={() => {
                if (window.confirm(`Revoke ${entry.label} and interrupt its jobs?`)) {
                  action(() => api(`/hosts/${entry._id}`, { method: "DELETE" }));
                }
              }}>Revoke</button>
            </li>)}</ul>
          </details>
        </aside>
        <div className="operations__panel">
          <form onSubmit={(event) => { event.preventDefault(); submit(null); }}>
            <div className="operations__selectors">
              <label>Host<select value={host?._id || ""} onChange={(event) => setHostId(event.target.value)}>
                <option value="" disabled>Select host</option>
                {snapshot.hosts.filter((entry) => !entry.revokedAt).map((entry) => <option key={entry._id} value={entry._id}>{entry.label}</option>)}
              </select></label>
              <label>Workspace<select value={workspace} onChange={(event) => setWorkspace(event.target.value)}>
                {Object.entries(workspaceNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select></label>
              <label>Permissions<select value={selectedProfile} onChange={(event) => setProfile(event.target.value)}>
                <option value="read-only">{profileNames["read-only"]}</option>
                {host?.profiles?.includes(workspace) && <option value={workspace}>{profileNames[workspace]}</option>}
              </select></label>
              <label>Model<select defaultValue="gpt-6.2-sol"><option value="gpt-6.2-sol">GPT-6.2 Sol</option></select></label>
              <label>Reasoning effort<select value={selectedEffort} onChange={(event) => setEffort(event.target.value)}>
                {!selectedEffort && <option value="">Awaiting host</option>}
                {host?.efforts?.map((entry) => <option key={entry}>{entry}</option>)}
              </select></label>
            </div>
            <div className="operations__editor">
              <label htmlFor="operations-prompt">Prompt</label>
              <textarea id="operations-prompt" required readOnly={editingLocked} rows={expanded ? 20 : 6}
                value={prompt} spellCheck={false} autoCapitalize="off"
                aria-invalid={!!promptError} aria-describedby="operations-prompt-count"
                onChange={(event) => updatePrompt(event.target.value)} />
              <div className="operations__editor-tools">
                <span id="operations-prompt-count">{prompt.length.toLocaleString()} / {PROMPT_LIMIT.toLocaleString()} characters</span>
                <button type="button" aria-expanded={expanded} aria-controls="operations-prompt"
                  onClick={() => setExpanded(!expanded)}>{expanded ? "Collapse editor" : "Expand editor"}</button>
              </div>
              <label>Attach a Markdown or text file
                <input type="file" accept=".md,.markdown,.txt" disabled={editingLocked} onChange={attachFile} />
              </label>
              <p>UTF-8 files up to {ATTACHMENT_BYTES.toLocaleString()} bytes are added to the prompt.</p>
              {host && startLimit < PROMPT_LIMIT && <p>The selected host supports {startLimit.toLocaleString()} characters for new sessions. Update and restart its worker for longer prompts.</p>}
              {selectedHost && selectedJob && continuationLimit < PROMPT_LIMIT && <p>The session host supports {continuationLimit.toLocaleString()} characters for continuations, queued follow-ups, and steering.</p>}
              {promptError && <p role="alert">{promptError}</p>}
              {attachment.error && <p role="alert">{attachment.error}</p>}
              {attachment.message && <p role="status">{attachment.message}</p>}
              {draft.error && <p role="alert">{draft.error}</p>}
              {prompt && !draft.error && <p>Draft saved in this browser.</p>}
            </div>
            <div className="operations__prompt-actions">
              <button disabled={!workerEnabled || editingLocked || !hostOnline || !selectedEffort || !validPrompt || prompt.length > startLimit}>Start session</button>
              <button type="button" disabled={!workerEnabled || editingLocked || !canAct || !selectedJob?.codexThreadId ||
                running.includes(selectedJob.status) || !validPrompt || prompt.length > continuationLimit}
                onClick={() => submit(selectedJob)}>Continue session</button>
              <button type="button" disabled={!workerEnabled || editingLocked || !["queued", "running"].includes(selectedJob?.status) ||
                !validPrompt || prompt.length > continuationLimit}
                onClick={() => submit(selectedJob, true)}>Queue follow-up</button>
              <button type="button" disabled={editingLocked || !canAct || !selectedJob?.activeTurn || selectedJob.status !== "running" ||
                ["pending", "sending"].includes(selectedJob.instruction?.state) || !validPrompt || prompt.length > continuationLimit}
                onClick={steer}>Steer current task</button>
            </div>
          </form>
          {selectedJob && <section className="operations__transcript">
            <header>
              <h2>{selectedJob.title || "Session"} · {awaitingApproval ? "Waiting for approval" : selectedJob.status}</h2>
              {running.includes(selectedJob.status) && <button type="button" disabled={busy || selectedJob.status === "cancelling"}
                onClick={() => action(() => post(`/jobs/${jobId}/cancel`))}>{selectedJob.status === "waiting" ? "Cancel follow-up" : "Cancel current task"}</button>}
              <button type="button" disabled={busy} onClick={() => {
                const title = window.prompt("Session name", selectedJob.title || "");
                if (title?.trim()) action(async () => {
                  await api(`/sessions/${selectedJob.sessionId}`, { method: "PATCH", body: { title } });
                  setJob((previous) => previous?._id === jobId ? { ...previous, title: title.trim() } : previous);
                });
              }}>Rename session</button>
              <button type="button" disabled={busy} onClick={() => action(async () => {
                const archivedAt = selectedJob.archivedAt ? null : new Date().toISOString();
                await api(`/sessions/${selectedJob.sessionId}`, { method: "PATCH", body: { archived: !!archivedAt } });
                setJob((previous) => previous?._id === jobId ? { ...previous, archivedAt } : previous);
              })}>{selectedJob.archivedAt ? "Restore from archive" : "Archive session"}</button>
            </header>
            {selectedJob.error && <p role="alert">{selectedJob.error}</p>}
            {selectedJob.instruction && <p role="status">Steering · {selectedJob.instruction.state}</p>}
            {approval && <section aria-label="Approval request">
              <h3>Approval request · {approval.state}</h3>
              <dl>
                <dt>Requesting session</dt><dd>{selectedJob.title || selectedJob.sessionId}</dd>
                <dt>Operation</dt><dd><pre>{approval.operation}</pre></dd>
                <dt>Affected paths</dt><dd><pre>{approval.paths || "Codex did not provide paths."}</pre></dd>
                <dt>Reason</dt><dd>{approval.reason || "Codex did not provide a reason."}</dd>
              </dl>
              {awaitingApproval && !approval.canApprove && <p>This request exceeds the selected permission profile.</p>}
              {awaitingApproval && ["approve", "deny"].map((choice) => <button key={choice} type="button"
                disabled={!canAct || selectedJob.decision?.id === approval.id || (choice === "approve" && !approval.canApprove)}
                onClick={() => action(() => post(`/jobs/${jobId}/approval`, { id: approval.id, choice }))}>
                {choice === "approve" ? "Approve for this turn" : "Deny"}
              </button>)}
            </section>}
            <div className="operations__modes" aria-label="Execution views">
              {modes.map((entry) => <button key={entry} type="button" aria-pressed={mode === entry} onClick={() => setMode(entry)}>{entry}</button>)}
            </div>
            <Transcript key={`${jobId}:${mode}`} job={selectedJob} mode={mode} copy={copy} />
          </section>}
        </div>
      </div>
    </main>
  );
}
