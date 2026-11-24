import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { requestJson } from "../../utils/api";
import Objectives from "./Objectives";
import Headquarters from "./Headquarters";
import Knowledge from "./Knowledge";
import Workforce from "./Workforce";
import Activity from "./Activity";
import VirtualOffice from "./VirtualOffice";
import Projects from "./Projects";
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
const running = ["scheduled", "waiting", "queued", "running", "cancelling"];
const profileNames = {
  "read-only": "Read-only inspection", development: "Development repository editing",
  workshop: "Workshop editing", "full-access": "Full Access",
};
const localPolicyOperations = ["read", "history", "ci", "localBranch", "localCommit"];
const workspaceNames = { development: "C: · Development", workshop: "D: · Art Workshop" };
const modes = ["Split", "Conversation", "Execution"];

function localScheduleTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) return null;
  const wallTime = new Date(+date - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  return wallTime === value ? date : null;
}

function JobTranscript({ job, copy, jobId, mode, composer, children }) {
  const answer = useMemo(() => job.events.filter((event) => event.view === "response").map((event) => event.text).join(""), [job.events]);
  const updates = useMemo(() => job.events.filter((event) => event.view === "activity" && event.label !== "Command started"), [job.events]);
  const [updateCount, setUpdateCount] = useState(20);
  const [visibleCount, setVisibleCount] = useState(80);
  const [filter, setFilter] = useState("");
  const [prompt, setPrompt] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");
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
    try { setPrompt((await api(`/jobs/${jobId}`)).prompt); }
    catch (failure) { setPromptError(failure.message); }
    finally { setLoadingPrompt(false); }
  }

  return <div className="operations__desk" data-view={mode.toLowerCase()}>
    <section className="operations__pane" aria-label="Conversation" tabIndex={0}>
      <h3>Conversation</h3>
      <details onToggle={(event) => {
        if (event.currentTarget.open && prompt === null && !loadingPrompt) loadPrompt();
      }}>
        <summary>Submitted prompt</summary>
        {loadingPrompt && <p role="status">Loading prompt…</p>}
        {promptError && <p role="alert">{promptError} <button type="button" onClick={loadPrompt}>Retry</button></p>}
        {prompt !== null && <><button type="button" onClick={() => copy(prompt)}>Copy prompt</button><pre>{prompt}</pre></>}
      </details>
      {updates.length > 0 && <details open>
        <summary>Agent updates ({updates.length})</summary>
        {updates.length > updateCount && <button type="button" onClick={() => setUpdateCount((count) => count + 20)}>Show earlier updates</button>}
        {updates.slice(-updateCount).map((event, index) => <div key={updates.length - Math.min(updates.length, updateCount) + index}>
          <strong>{event.label}</strong>
          <Markdown skipHtml disallowedElements={["img"]}>{event.text}</Markdown>
        </div>)}
      </details>}
      <div className="operations__modes">
        <button type="button" onClick={() => copy(summary)}>Copy session summary</button>
        <button type="button" disabled={!answer} onClick={() => copy(answer)}>Copy response as Markdown</button>
      </div>
      {answer ? <div className="operations__response"><Markdown skipHtml disallowedElements={["img"]}>{answer}</Markdown></div>
        : <p>No final response yet.</p>}
      {composer}
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
  const [page, setPage] = useState("Command Center");
  const [showApprovalInbox, setShowApprovalInbox] = useState(false);
  const [linkedRecord, setLinkedRecord] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [mode, setMode] = useState(() => {
    try {
      const preference = window.localStorage.getItem("cw_operations_desk_view");
      if (modes.includes(preference)) return preference;
    } catch { /* Browser storage is optional. */ }
    return "Split";
  });
  const [scheduledTime, setScheduledTime] = useState("");
  const [repeatDays, setRepeatDays] = useState(0);
  const [repeatCount, setRepeatCount] = useState(3);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
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

  function openJob(id, view) {
    selectJob(id);
    changeMode(view);
    setPage("Command Center");
  }

  function openSource(group, id) {
    if (group === "job") return openJob(id, "Conversation");
    const target = { objective: "Objectives", "project-objectives": "Objectives", project: "Projects", knowledge: "Knowledge", employee: "Workforce" }[group];
    setLinkedRecord({ target, id, group });
    setPage(target);
  }

  function prepareAssignment(objective, projectWorkspace) {
    if (projectWorkspace) setWorkspace(projectWorkspace);
    setAssignment({ id: objective._id, title: objective.title });
    setEmployeeId("");
    selectJob(null);
    changeMode("Conversation");
    setPage("Command Center");
  }

  function selectJob(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("job", id);
    window.history.replaceState(window.history.state, "", url);
    setJobId(id);
    setRescheduleTime("");
  }

  function changeMode(value) {
    setMode(value);
    try { window.localStorage.setItem("cw_operations_desk_view", value); }
    catch { /* Browser storage is optional. */ }
  }

  useEffect(() => {
    if (!assignment) return;
    let current = true;
    api("/workforce").then(({ employees }) => {
      if (current) setAssignees(employees.filter((entry) => ["worker", "lead"].includes(entry.role) && entry.status === "available"));
    }).catch((failure) => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [assignment]);

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const query = new URLSearchParams({ search, archived: String(archived), compact: "true" });
        const [hosts, jobs, approvals, schedule, dispatch, recurrence] = await Promise.all([
          api("/hosts"), api(`/jobs?${query}`), api("/approvals").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }), api("/schedule").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }), api("/dispatch").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }), api("/recurrence").catch(() => null),
        ]);
        if (active) {
          setSnapshot({ hosts, jobs, approvals, schedule, dispatch, recurrence });
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
  }, [search, archived, refreshVersion]);

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
        timer = setTimeout(refresh, events.length < detail.eventCount ? 0 : detail.status === "scheduled" ? 5000 : 900);
      } catch (failure) {
        if (!active) return;
        setError(failure.message);
        if (![401, 403, 404].includes(failure.status)) timer = setTimeout(refresh, 2500);
      }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [jobId, accessDenied, refreshVersion]);

  const host = snapshot?.hosts.find((entry) => entry._id === hostId && !entry.revokedAt) ||
    snapshot?.hosts.find((entry) => entry.online) || snapshot?.hosts.find((entry) => !entry.revokedAt);
  const selectedEffort = host?.efforts?.includes(effort) ? effort : host?.efforts?.[0] || "";
  const selectedJob = job?._id === jobId ? job : null;
  const hostOnline = !relayError && host?.online;
  const selectedHost = snapshot?.hosts.find((entry) => entry._id === selectedJob?.hostId);
  const selectedProfile = (profile === workspace || profile === "full-access") && host?.profiles?.includes(profile)
    ? profile : "read-only";
  const approval = selectedJob?.approval;
  const sessions = new Map();
  for (const entry of snapshot?.jobs || []) {
    const id = entry.sessionId || entry._id;
    if (!sessions.has(id)) sessions.set(id, []);
    sessions.get(id).push(entry);
  }
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
  const scheduleDate = localScheduleTime(scheduledTime);
  const workerOptions = assignees.filter((employee) => employee.workspace === workspace);
  const validAssignment = !assignment || workerOptions.some((employee) => employee._id === employeeId);
  const validRepeat = repeatDays === 0 || (snapshot?.recurrence && Number.isInteger(repeatCount) && repeatCount >= 2 && repeatCount <= 12);
  const schedulePreview = scheduleDate?.toLocaleString(undefined, { dateStyle: "long", timeStyle: "long" });
  const rescheduleDate = localScheduleTime(rescheduleTime);

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

  function submit(parent, queue = false, scheduledAt) {
    if (editingLocked || !validPrompt || (parent && assignment) || (!parent && !validAssignment) || (scheduledAt !== undefined && !validRepeat) || prompt.length > (parent ? continuationLimit : startLimit) ||
        (!parent && profile === "full-access" && selectedProfile !== profile)) return;
    return action(async () => {
      const request = {
        prompt, model: "gpt-6.2-sol", effort: parent?.effort || selectedEffort, queue,
        profile: parent ? parent.profile || "read-only" : selectedProfile,
        workspace: parent?.workspace || workspace, hostId: parent?.hostId || host?._id, parentId: parent?._id, scheduledAt,
        ...(!parent && assignment ? { objectiveId: assignment.id, employeeId } : {}),
        ...(scheduledAt !== undefined && snapshot.recurrence && repeatDays ? { repeat: { days: repeatDays, count: repeatCount } } : {}),
      };
      const signature = JSON.stringify(request);
      if (pendingSubmit.current?.signature !== signature) {
        pendingSubmit.current = { signature, id: crypto.randomUUID() };
      }
      const endpoint = request.repeat ? "/recurrence" : scheduledAt === undefined ? "/jobs" : "/schedule";
      const { _id, recurring } = await post(endpoint, { id: pendingSubmit.current.id, ...request });
      pendingSubmit.current = null;
      if (recurring) setNotice("Repeating schedule saved. Find it under Upcoming work.");
      else if (queue) setNotice("Follow-up queued. Open it from session history.");
      else selectJob(_id);
      if (!parent && assignment) setAssignment(null);
      clearSubmittedDraft();
      if (scheduledAt !== undefined) {
        setScheduledTime("");
        setRepeatDays(0);
      }
      if (scheduledAt !== undefined) setRefreshVersion((value) => value + 1);
      if (mode === "Execution") changeMode("Conversation");
    });
  }

  function steer() {
    if (assignment || editingLocked || !validPrompt || prompt.length > continuationLimit) return;
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

  const composer = (
  <form id="operations-composer" onSubmit={(event) => { event.preventDefault(); submit(null); }}>
    {assignment && <section className="operations__panel operations__assignment" aria-label="Implementation assignment">
      <div className="operations__briefing-title">
        <strong>{assignment.title}</strong>
        <button type="button" onClick={() => setAssignment(null)}>Remove objective</button>
      </div>
      <label>Assign to <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
        <option value="">{workerOptions.length ? "Select an employee" : "No available worker in this workspace"}</option>
        {workerOptions.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
      </select></label>
      <p>The worker receives the task prompt with the objective criteria and saved project and employee instructions.</p>
    </section>}
    <div className="operations__selectors">
      <label>Host<select value={host?._id || ""} onChange={(event) => setHostId(event.target.value)}>
        <option value="" disabled>Select host</option>
        {snapshot.hosts.filter((entry) => !entry.revokedAt).map((entry) => <option key={entry._id} value={entry._id}>{entry.label}</option>)}
      </select></label>
      <label>Workspace<select value={workspace} onChange={(event) => setWorkspace(event.target.value)}>
        {Object.entries(workspaceNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>Permissions<select value={profile === "full-access" ? profile : selectedProfile} onChange={(event) => setProfile(event.target.value)}>
        <option value="read-only">{profileNames["read-only"]}</option>
        {host?.profiles?.includes(workspace) && <option value={workspace}>{profileNames[workspace]}</option>}
        {host?.profiles?.includes("full-access") && <option value="full-access">Full Access</option>}
        {profile === "full-access" && selectedProfile !== profile && <option value="full-access" disabled>Full Access unavailable</option>}
      </select></label>
      <label>Model<select defaultValue="gpt-6.2-sol"><option value="gpt-6.2-sol">GPT-6.2 Sol</option></select></label>
      <label>Reasoning effort<select value={selectedEffort} onChange={(event) => setEffort(event.target.value)}>
        {!selectedEffort && <option value="">Awaiting host</option>}
        {host?.efforts?.map((entry) => <option key={entry}>{entry}</option>)}
      </select></label>
    </div>
    {selectedProfile === "full-access" && <p className="operations__access-warning">
      <strong>Full Access.</strong> Commands run with the Windows account’s access to files, applications, and the network.
      Codex approval prompts are disabled. Workspace selection sets the starting folder.
    </p>}
    {profile === "full-access" && selectedProfile !== profile && <p role="alert">Full Access is unavailable on this host. Select another permission profile.</p>}
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
      <button disabled={!workerEnabled || editingLocked || !hostOnline || !selectedEffort || !validPrompt || !validAssignment || prompt.length > startLimit ||
        (profile === "full-access" && selectedProfile !== profile)}>{assignment ? "Start assignment" : "Start session"}</button>
      <button type="button" disabled={!!assignment || !workerEnabled || editingLocked || !canAct || !selectedJob?.codexThreadId ||
        running.includes(selectedJob.status) || !validPrompt || prompt.length > continuationLimit}
        onClick={() => submit(selectedJob)}>Continue session</button>
      <button type="button" disabled={!!assignment || !workerEnabled || editingLocked || !["queued", "running"].includes(selectedJob?.status) ||
        !validPrompt || prompt.length > continuationLimit}
        onClick={() => submit(selectedJob, true)}>Queue follow-up</button>
      <button type="button" disabled={!!assignment || editingLocked || !canAct || !selectedJob?.activeTurn || selectedJob.status !== "running" ||
        ["pending", "sending"].includes(selectedJob.instruction?.state) || !validPrompt || prompt.length > continuationLimit}
        onClick={steer}>Steer current task</button>
    </div>
    {snapshot?.schedule && !assignment && <details className="operations__schedule">
      <summary>Schedule a new session</summary>
      <label>Run at (local time)<input type="datetime-local" value={scheduledTime}
        onChange={(event) => setScheduledTime(event.target.value)} /></label>
      {snapshot.recurrence && <>
        <label>Repeat <select value={repeatDays} onChange={(event) => setRepeatDays(Number(event.target.value))}>
          <option value={0}>Once</option><option value={1}>Every 24 hours</option><option value={7}>Every 7 days</option>
        </select></label>
        {repeatDays > 0 && <>
          <label>Total runs <input type="number" min={2} max={12} value={repeatCount}
            onChange={(event) => setRepeatCount(Number(event.target.value))} /></label>
          <p>If the host misses multiple intervals, the series runs once when available. A failed or cancelled turn ends the series.</p>
        </>}
      </>}
      {schedulePreview && <p>Dispatch time <strong>{schedulePreview}</strong></p>}
      {scheduledTime && !scheduleDate && <p role="alert">Choose a valid time in your current time zone.</p>}
      <p>Overdue sessions wait for the selected host to reconnect and become available.</p>
      <button type="button" disabled={!workerEnabled || editingLocked || !!relayError || !host || !selectedEffort ||
        !validPrompt || prompt.length > startLimit || !scheduleDate || !validRepeat || (profile === "full-access" && selectedProfile !== profile)}
        onClick={() => submit(null, false, +scheduleDate)}>{repeatDays > 0 ? "Schedule series" : "Schedule session"}</button>
    </details>}
  </form>
  );

  return (
    <main className="operations">
      <header className="operations__hero">
        <p className="operations__brand">Crossworld Creative</p>
        <h1>Crossworld Operations</h1>
        <p role="status">{relayError ? "Operations API unavailable" : hostOnline ? `${host.label} connected` : "Windows execution host offline"}</p>
        {snapshot.dispatch && <div className="operations__dispatch">
          <button type="button" disabled={busy || !!relayError} onClick={() => action(async () => {
            await api("/dispatch", { method: "PATCH", body: { paused: !snapshot.dispatch.paused } });
            setRefreshVersion((value) => value + 1);
          })}>{snapshot.dispatch.paused ? "Resume future dispatch" : "Pause future dispatch"}</button>
          <p>{snapshot.dispatch.paused ? "New and scheduled jobs are held. Claimed jobs can finish." :
            "Pausing holds new and scheduled jobs. Claimed jobs can finish."}</p>
        </div>}
      </header>
      <nav className="operations__modes" aria-label="Operations navigation">
        {["Headquarters", "Command Center", "Projects", "Objectives", "Workforce", "Office", "Knowledge", "Activity"].map((entry) => <button key={entry} type="button"
          aria-pressed={page === entry} onClick={() => { setLinkedRecord(null); setPage(entry); }}>{entry}</button>)}
      </nav>
      {page === "Headquarters" && <Headquarters api={api} openObjectives={() => setPage("Objectives")} openWorkforce={() => setPage("Workforce")}
        pendingGovernance={governance?.requests.filter((request) => request.state === "pending").length}
        openGovernance={() => { setShowApprovalInbox(true); setPage("Command Center"); }} openJob={openJob} />}
      {page === "Projects" && <Projects api={api} initialId={linkedRecord?.group === "project" ? linkedRecord.id : null}
        openObjectives={(id) => openSource("project-objectives", id)} />}
      {page === "Objectives" && <Objectives api={api} openJob={openJob} assignObjective={prepareAssignment}
        openProject={(id) => openSource("project", id)}
        initialId={linkedRecord?.group === "objective" ? linkedRecord.id : null}
        initialProjectId={linkedRecord?.group === "project-objectives" ? linkedRecord.id : null} />}
      {page === "Workforce" && <Workforce api={api} openJob={openJob} initialId={linkedRecord?.target === page ? linkedRecord.id : null} />}
      {page === "Office" && <VirtualOffice api={api} openJob={openJob}
        openEmployee={(id) => openSource("employee", id)} openHeadquarters={() => setPage("Headquarters")} />}
      {page === "Activity" && <Activity api={api} openSource={openSource} />}
      {page === "Knowledge" && <Knowledge api={api} initialId={linkedRecord?.target === page ? linkedRecord.id : null} />}
      {page === "Command Center" && <>
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
      {governance && <details className="operations__panel operations__approvals" open={showApprovalInbox} onToggle={(event) => setShowApprovalInbox(event.currentTarget.open)}>
        <summary>Operation approvals and policy ({governance.requests.filter((request) => request.state === "pending").length} pending)</summary>
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
      </details>}
      <a className="operations__history-link" href="#operations-history">Jump to session history</a>
      <div className="operations__layout">
        <aside id="operations-history" className="operations__panel">
          <h2>Session history</h2>
          <label>Search sessions<input type="search" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} /> Archived sessions</label>
          {snapshot.jobs.length === 0 && <p>No jobs yet.</p>}
          <ul>{Array.from(sessions, ([id, turns]) => {
            const latest = turns[0];
            const label = latest.title || turns.find((entry) => !entry.parentId)?.prompt || latest.prompt;
            return <li key={id}>{turns.length === 1
              ? <button type="button" aria-pressed={jobId === latest._id} onClick={() => selectJob(latest._id)}>
                {label}<small>{latest.status}{latest.parentId ? " · Follow-up" : ""}</small>
              </button>
              : <details open={turns.some((entry) => entry._id === jobId) || undefined}>
                <summary>{label} · {turns.length} turns</summary>
                <ul>{turns.map((entry) => <li key={entry._id}>
                  <button type="button" aria-pressed={jobId === entry._id} onClick={() => selectJob(entry._id)}>
                    {entry.prompt}<small>{entry.status}{entry.parentId ? " · Follow-up" : " · First turn"}</small>
                  </button>
                </li>)}</ul>
              </details>}
            </li>;
          })}</ul>
          <h2>Upcoming work</h2>
          {snapshot.schedule?.length === 0 && !snapshot.recurrence?.some((entry) => entry.state === "active") && <p>No scheduled sessions.</p>}
          <ul>{snapshot.schedule?.map((entry) => <li key={entry._id}>
            <button type="button" aria-pressed={jobId === entry._id} onClick={() => selectJob(entry._id)}>
              <time dateTime={entry.scheduledAt}>{new Date(entry.scheduledAt).toLocaleString()}</time>
              <small>{workspaceNames[entry.workspace]}</small>
            </button>
          </li>)}</ul>
          {snapshot.recurrence?.length > 0 && <details>
            <summary>Repeating schedules</summary>
            <p>Stopping a series holds future occurrences. A turn the host already claimed can finish.</p>
            <ul>{snapshot.recurrence.map((entry) => <li key={entry._id}>
              <strong>{workspaceNames[entry.workspace]}</strong>
              <small>Every {entry.repeatDays === 1 ? "24 hours" : "7 days"} · {entry.state} · {entry.remaining} of {entry.total} runs left</small>
              {entry.state === "active" && <small><time dateTime={entry.nextAt}>{new Date(entry.nextAt).toLocaleString()}</time></small>}
              {entry.stopReason && <small>{entry.stopReason}</small>}
              {entry.occurrenceStatus && <button type="button" onClick={() => selectJob(entry.occurrenceId)}>{entry.occurrenceStatus} turn</button>}
              {entry.state === "active" && <button type="button" disabled={busy} onClick={() => action(async () => {
                await api("/recurrence/" + entry._id, { method: "DELETE" });
                setRefreshVersion((value) => value + 1);
              })}>Stop series</button>}
            </li>)}</ul>
          </details>}
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
          {!selectedJob && composer}
          {selectedJob && <section className="operations__transcript">
            <header>
              <h2>{selectedJob.title || "Session"} · {awaitingApproval ? "Waiting for approval" : selectedJob.status}</h2>
              {running.includes(selectedJob.status) && <button type="button" disabled={busy || selectedJob.status === "cancelling"}
                onClick={() => action(async () => {
                  if (selectedJob.status === "scheduled") {
                    try { await api(`/schedule/${jobId}`, { method: "DELETE" }); }
                    finally { setRefreshVersion((value) => value + 1); }
                  } else {
                    await post(`/jobs/${jobId}/cancel`);
                  }
                })}>{selectedJob.status === "scheduled" ? "Cancel schedule" :
                  selectedJob.status === "waiting" ? "Cancel follow-up" : "Cancel current task"}</button>}
              {awaitingApproval && <button type="button" onClick={() => changeMode("Execution")}>Review approval</button>}
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
            {selectedJob.profile === "full-access" && <p className="operations__access-warning">
              Full Access session · follow-ups inherit unrestricted access.
            </p>}
            {selectedJob.scheduledAt && <p>Scheduled for <time dateTime={selectedJob.scheduledAt}>
              {new Date(selectedJob.scheduledAt).toLocaleString()}</time></p>}
            {selectedJob.status === "scheduled" && !selectedJob.seriesId && <details>
              <summary>Reschedule</summary>
              <label>New run time (local)<input type="datetime-local" value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)} /></label>
              {rescheduleDate && <p>{rescheduleDate.toLocaleString(undefined, { dateStyle: "long", timeStyle: "long" })}</p>}
              <button type="button" disabled={busy || !!relayError || !rescheduleDate} onClick={() => action(async () => {
                await api(`/schedule/${jobId}`, { method: "PATCH", body: { scheduledAt: +rescheduleDate } });
                setRescheduleTime("");
                setRefreshVersion((value) => value + 1);
              })}>Save time</button>
            </details>}
            {selectedJob.instruction && <p role="status">Steering · {selectedJob.instruction.state}</p>}
            <div className="operations__modes" aria-label="Command Center layout">
              {modes.map((entry) => <button className={entry === "Split" ? "operations__split" : undefined}
                key={entry} type="button" aria-pressed={mode === entry}
                onClick={() => changeMode(entry)}>{entry}</button>)}
            </div>
            <JobTranscript key={jobId} job={selectedJob} jobId={jobId} mode={mode} copy={copy} composer={composer}>
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
            </JobTranscript>
          </section>}
        </div>
      </div>
      </>}
    </main>
  );
}
