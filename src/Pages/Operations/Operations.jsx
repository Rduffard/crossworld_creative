import { useEffect, useRef, useState } from "react";
import { requestJson } from "../../utils/api";
import "./Operations.css";

const api = (path, options) => requestJson(`/operations${path}`, { auth: true, ...options });
const post = (path, body) => api(path, { method: "POST", body });
const running = ["queued", "running", "cancelling"];
const workspaceNames = { development: "C: · Development", workshop: "D: · Art Workshop" };
const modes = ["Activity", "Execution", "Summary"];

function Transcript({ job, mode, copy }) {
  const answer = job.events.filter((event) => event.view === "response").map((event) => event.text).join("");
  if (mode === "Summary") {
    const summary = [
      `# Crossworld Operations session`,
      `- Session: ${job.sessionId}`,
      `- Job: ${job._id}`,
      `- Status: ${job.status}`,
      `- Workspace: ${workspaceNames[job.workspace]}`,
      `- Model: ${job.model} (${job.effort})`,
      job.error && `\nError: ${job.error}`,
      answer && `\n${answer}`,
    ].filter(Boolean).join("\n");
    return <>
      <button type="button" onClick={() => copy(summary)}>Copy session summary</button>{" "}
      <button type="button" disabled={!answer} onClick={() => copy(answer)}>Copy response as Markdown</button>
      <pre>{answer || "No final response yet."}</pre>
    </>;
  }
  const events = job.events.map((event, index) => ({ ...event, index }))
    .filter((event) => event.view === mode.toLowerCase());
  if (!events.length) return <p>No {mode.toLowerCase()} events yet.</p>;
  const commandOutput = new Map();
  const visible = events.filter((event) => {
    if (!event.label.startsWith("Command output · ")) return true;
    const first = !commandOutput.has(event.label);
    commandOutput.set(event.label, (commandOutput.get(event.label) || "") + event.text);
    return first;
  });
  return visible.map((event) => mode === "Execution" ? (
    <details key={event.index}>
      <summary>{event.label}</summary>
      <button type="button" onClick={() => copy(commandOutput.get(event.label) ?? event.text)}>Copy output</button>
      <pre>{commandOutput.get(event.label) ?? event.text}</pre>
    </details>
  ) : (
    <p key={event.index}><strong>{event.label}</strong> {event.text}</p>
  ));
}

export default function Operations() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [relayError, setRelayError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState(null);
  const [mode, setMode] = useState("Activity");
  const [hostId, setHostId] = useState("");
  const [workspace, setWorkspace] = useState("development");
  const [effort, setEffort] = useState("medium");
  const [prompt, setPrompt] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [credential, setCredential] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingSubmit = useRef(null);

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const [hosts, jobs] = await Promise.all([api("/hosts"), api("/jobs")]);
        if (active) {
          setSnapshot({ hosts, jobs });
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
  }, []);

  useEffect(() => {
    if (!jobId || accessDenied) return;
    let active = true;
    let timer;
    const events = [];
    async function refresh() {
      try {
        const detail = await api(`/jobs/${jobId}?offset=${events.length}`);
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

  async function action(callback) {
    setBusy(true);
    setError("");
    try { await callback(); } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  function submit(parent) {
    return action(async () => {
      const request = {
        prompt, model: "gpt-6.2-sol", effort: selectedEffort,
        workspace: parent?.workspace || workspace, hostId: parent?.hostId || host?._id, parentId: parent?._id,
      };
      const signature = JSON.stringify(request);
      if (pendingSubmit.current?.signature !== signature) {
        pendingSubmit.current = { signature, id: crypto.randomUUID() };
      }
      const { _id } = await post("/jobs", { id: pendingSubmit.current.id, ...request });
      pendingSubmit.current = null;
      setJobId(_id);
      setPrompt("");
      setMode("Activity");
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
        <p role="status">{relayError ? "Operations API unavailable" : hostOnline ? `${host.label} connected` : "Windows execution host offline"} · Read-only execution</p>
      </header>
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
      <div className="operations__layout">
        <aside className="operations__panel">
          <h2>Session history</h2>
          {snapshot.jobs.length === 0 && <p>No jobs yet.</p>}
          <ul>{snapshot.jobs.map((entry) => <li key={entry._id}>
            <button type="button" aria-pressed={jobId === entry._id} onClick={() => { setJobId(entry._id); setMode("Activity"); }}>
              {entry.prompt.slice(0, 55)} <small>{entry.status}{entry.parentId ? " · Follow-up" : ""}</small>
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
              <label>Model<select defaultValue="gpt-6.2-sol"><option value="gpt-6.2-sol">GPT-6.2 Sol</option></select></label>
              <label>Reasoning effort<select value={selectedEffort} onChange={(event) => setEffort(event.target.value)}>
                {!selectedEffort && <option value="">Awaiting host</option>}
                {host?.efforts?.map((entry) => <option key={entry}>{entry}</option>)}
              </select></label>
            </div>
            <label>Prompt<textarea required maxLength={12000} rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
            <button disabled={busy || !hostOnline || !selectedEffort || !prompt.trim()}>Start session</button>{" "}
            <button type="button" disabled={busy || !selectedJob?.codexThreadId || running.includes(selectedJob.status) ||
              selectedJob.hostId !== host?._id || !hostOnline || !prompt.trim()} onClick={() => submit(selectedJob)}>Send follow-up</button>
          </form>
          {selectedJob && <section className="operations__transcript">
            <header>
              <h2>Job status · {selectedJob.status}</h2>
              {running.includes(selectedJob.status) && <button type="button" disabled={busy || selectedJob.status === "cancelling"}
                onClick={() => action(() => post(`/jobs/${jobId}/cancel`))}>Cancel job</button>}
            </header>
            {selectedJob.error && <p role="alert">{selectedJob.error}</p>}
            <div className="operations__modes" aria-label="Execution views">
              {modes.map((entry) => <button key={entry} type="button" aria-pressed={mode === entry} onClick={() => setMode(entry)}>{entry}</button>)}
            </div>
            <Transcript job={selectedJob} mode={mode} copy={copy} />
          </section>}
        </div>
      </div>
    </main>
  );
}
