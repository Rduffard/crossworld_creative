import { useEffect, useRef, useState } from "react";
import { horizonGrant } from "./missionPlans";

// Mirrors the server's inheritedAuthorization for the eligible Full Access source.
const inheritedRoutes = [
  { profile: "Full Access", capabilities: "blender, browser, cross-drive, network, read, scratch, subprocess, write" },
  { profile: "Read Only", capabilities: "read" },
];

export default function HorizonGrant({ api, hosts, onGranted, onCancel }) {
  const request = useRef(null);
  const sourceSelect = useRef(null);
  const [jobs, setJobs] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { sourceSelect.current?.focus(); }, []);

  useEffect(() => {
    const controller = new AbortController();
    api("/jobs?archived=false&compact=true", { signal: controller.signal, cache: "no-store" })
      .then(records => { if (!controller.signal.aborted) setJobs(records); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [api]);

  const sources = jobs?.filter(job => job.workspace === horizonGrant.workspace && job.profile === "full-access" &&
    job.workerRole === "direct" && !job.missionId && !job.blueprintTyped && job.studioTools === true &&
    job.studioActor?.role === "first-mate" && job.studioActor.id &&
    hosts.some(host => host._id === job.hostId));
  const source = sources?.find(job => job._id === sourceId);
  const relay = hosts.find(host => host._id === source?.hostId);

  async function grant(event) {
    event.preventDefault();
    if (!relay || request.current?.pending) return;
    const deadline = new Date(end);
    const remaining = +deadline - Date.now();
    if (!(remaining > 0 && remaining <= 24 * 60 * 60 * 1000)) {
      setError("Choose an operating window ending within the next 24 hours.");
      return;
    }

    const body = { ...horizonGrant, sourceConversationId: source._id, hostId: relay._id,
      effort: new FormData(event.currentTarget).get("effort"), endsAt: deadline.toISOString() };
    const signature = JSON.stringify(body);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    request.current.pending = true;
    setBusy(true);
    setError("");
    try {
      const receipt = await api("/missions/grants", { method: "POST", body: { ...body, id: request.current.id } });
      onGranted(receipt, source._id);
    } catch (failure) {
      setError(failure.message);
    } finally {
      request.current.pending = false;
      setBusy(false);
    }
  }

  return <form onSubmit={grant} className="operations-missions__create">
    <fieldset disabled={busy}>
      <legend>{horizonGrant.title}</legend>
      <label>First Mate conversation<select ref={sourceSelect} required value={sourceId} onChange={event => setSourceId(event.target.value)}>
        <option value="">Select a recent Full Access conversation</option>
        {sources?.map(job => <option key={job._id} value={job._id}>
          {job.title || job.prompt || job.studioActor.name || "First Mate"} · {new Date(job.createdAt).toLocaleString()}
        </option>)}
      </select></label>
      {!jobs && !error && <p role="status">Loading recent conversations…</p>}
      {sources?.length === 0 && <p>Start a Full Access First Mate conversation in Development, then reopen this form.</p>}
      {relay && <>
        <p>Relay · {relay.label}</p>
        <h3>Permission routes inherited from the selected conversation</h3>
        <ul aria-label="Inherited permission routes">
          {inheritedRoutes.map(route => <li key={route.profile}><strong>{route.profile}</strong> · {route.capabilities}</li>)}
        </ul>
        <p>Dispatch requires a current relay preflight for the step’s profile and capabilities.</p>
        <label>Reasoning effort<select name="effort" key={relay._id} required defaultValue="low">
          {relay.efforts?.map(effort => <option key={effort}>{effort}</option>)}
        </select></label>
        {(!relay.efforts?.length) && <p>This relay has no advertised reasoning effort.</p>}
      </>}
      <label>Authorize dispatch until<input type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} /></label>
      <h3>Grant scope</h3>
      <p>Development workspace. Each step requires its listed profile.</p>
      <ol>{horizonGrant.steps.map(step => <li key={step.key}>
        <details>
          <summary>{step.title} · {step.profile} · {step.requires.join(", ")}</summary>
          <p>{step.prompt}</p>
          {step.after.map(dependency => <p key={dependency.step}>Requires {dependency.result.toUpperCase()} from {
            horizonGrant.steps.find(entry => entry.key === dependency.step).title
          }.</p>)}
        </details>
      </li>)}</ol>
      <p>First Mate can register this disposable plan from the selected conversation. Both turns use Read Only and ask for a text result.</p>
      <button disabled={!relay?.efforts?.length}>{busy ? "Saving grant…" : "Grant HORIZON scope"}</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}
