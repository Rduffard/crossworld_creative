import { useEffect, useRef, useState } from "react";
import InitiativeEnrollment, { InitiativeDependencies } from "./InitiativeEnrollment";
import { missionPlan } from "./missionPlans";
import HorizonGrant from "./HorizonGrant";
import "./Missions.css";

const titleFor = (mission, key) => mission.steps.find(step => step.key === key)?.title;
const localTime = date => new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function Missions({ api, hosts, openJob, missionId, clearMission }) {
  const dialog = useRef(null);
  const launcher = useRef(null);
  const linkedHeading = useRef(null);
  const closingForNavigation = useRef(false);
  const linkedDialog = useRef(false);
  const submission = useRef(null);
  const registrationAlert = useRef(null);
  const guideButton = useRef(null);
  const receiptHeading = useRef(null);
  const guideFocus = useRef(null);
  const [items, setItems] = useState([]);
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missionError, setMissionError] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [error, setError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [grantReceipt, setGrantReceipt] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [employees, setEmployees] = useState([]);
  const [template, setTemplate] = useState("acceptance");
  const [reviewer, setReviewer] = useState("");
  const [hostId, setHostId] = useState("");
  const [end, setEnd] = useState("");
  const [profile, setProfile] = useState("read-only");
  const [custom, setCustom] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [recoveryBatch, setRecoveryBatch] = useState(null);
  const [recoveryReceipt, setRecoveryReceipt] = useState("");
  const host = hosts.find(device => device._id === hostId) || hosts.find(device => device.online && !device.missionOnly);
  const steps = missionPlan(template, reviewer, profile);
  const active = items.find(item => item.status === "active") || items.find(item => ["paused", "expired", "blocked"].includes(item.status));
  const summary = active && (active.reason || active.dispatchHold || titleFor(active, active.next) || active.status);
  const linkedMission = missionId && items.find(item => item._id === missionId);
  const hasLinkedMission = Boolean(linkedMission);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        const records = await api("/missions", { signal: controller.signal, cache: "no-store" });
        if (!controller.signal.aborted) {
          setItems(records);
          setLoaded(true);
          setMissionError(false);
        }
      } catch {
        if (controller.signal.aborted) return;
        setMissionError(true);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, document.hidden ? 30000 : 5000);
    }
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, refresh, missionId]);

  useEffect(() => {
    if (missionId) {
      if (!dialog.current.open) dialog.current.showModal();
    } else if (linkedDialog.current && dialog.current?.open) {
      closingForNavigation.current = true;
      dialog.current.close();
      launcher.current?.focus();
    }
    linkedDialog.current = Boolean(missionId);
  }, [missionId]);

  useEffect(() => {
    if (hasLinkedMission) linkedHeading.current?.focus();
  }, [missionId, hasLinkedMission]);

  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    api("/missions/endurance-recovery", { signal: controller.signal, cache: "no-store" }).then(proposal => {
      if (controller.signal.aborted) return;
      setRecoveryBatch(proposal?.missions ? proposal : null);
      setRecoveryReceipt(proposal?.approvalId || "");
      setRecoveryError("");
    }).catch(failure => {
      if (!controller.signal.aborted) setRecoveryError(failure.message);
    });
    return () => controller.abort();
  }, [api, opened, refresh]);

  function open() {
    dialog.current?.showModal();
    setOpened(true);
    if (!end) setEnd(localTime(new Date(Date.now() + 60 * 60 * 1000)));
  }

  async function prepareMission() {
    setError("");
    setCreating(true);
    try {
      const directory = await api("/workforce");
      setEmployees(directory.employees.filter(employee =>
        ["qa", "art-director"].includes(employee.role) && employee.status === "available"));
    } catch (failure) { setError(failure.message); }
  }

  useEffect(() => {
    if (registrationError) registrationAlert.current?.focus();
  }, [registrationError]);

  useEffect(() => {
    if (!guiding) {
      guideFocus.current?.current?.focus();
      guideFocus.current = null;
    }
  }, [guiding]);

  async function copyGrantId() {
    try {
      await navigator.clipboard.writeText(grantReceipt.id);
      setCopyStatus("Grant ID copied.");
    } catch {
      setCopyStatus("Copy unavailable. Select and copy the grant ID above.");
    }
  }

  async function mutate(request, reportError = setError) {
    setBusy(true);
    reportError("");
    try { await request(); }
    catch (failure) { reportError(failure.message); }
    finally { setBusy(false); setRefresh(value => value + 1); }
  }

  function create(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutate(async () => {
      const plan = custom === null ? steps : JSON.parse(custom);
      const executionPlan = Array.isArray(plan) ? { steps: plan } : {
        steps: plan?.steps, authorization: plan?.authorization, sourceConversationId: plan?.sourceConversationId,
        completionStep: plan?.completionStep, delegatePlanning: plan?.delegatePlanning,
      };
      const body = {
        title: data.get("title"), hostId: host._id, workspace: plan?.workspace ?? "development",
        effort: data.get("effort"), endsAt: new Date(end).toISOString(),
        ...executionPlan, paused: data.has("paused"),
      };
      const signature = JSON.stringify(body);
      if (submission.current?.signature !== signature) submission.current = { signature, id: crypto.randomUUID() };
      await api(data.has("firstMateGrant") ? "/missions/grants" :
        Array.isArray(plan) ? "/missions" : "/missions/capability-plans",
        { method: "POST", body: { ...body, id: submission.current.id } });
      submission.current = null;
      setCreating(false);
    }, setRegistrationError);
  }

  function control(item, action, options = {}) {
    return mutate(() => api("/missions/" + item._id, { method: "PATCH", body: { action, revision: item.revision, ...options } }));
  }

  function inspect(id, view = "Execution") {
    closingForNavigation.current = true;
    dialog.current?.close();
    openJob(id, view);
  }

  return <>
    <button type="button" ref={launcher} aria-haspopup="dialog" onClick={open}>Missions</button>
    {active && <span className="operations-missions__summary">{active.title} · {summary}</span>}
    <dialog ref={dialog} className="operations__dialog operations-missions" aria-labelledby="operations-mission-title"
      onClose={() => {
        setOpened(false);
        if (closingForNavigation.current) {
          closingForNavigation.current = false;
          return;
        }
        if (missionId) clearMission();
        launcher.current?.focus();
      }}>
      <header className="operations__briefing-title">
        <h2 id="operations-mission-title">Persistent missions</h2>
        <form method="dialog"><button>Close</button></form>
      </header>
      {error && <p role="alert">{error}</p>}
      {!missionId && recoveryBatch && <details open>
        <summary>Recover ENDURANCE missions</summary>
        <form onSubmit={event => {
          event.preventDefault();
          mutate(async () => {
            const missions = recoveryBatch.missions.map(({ id, step, candidate, revision }) => ({ id, step, candidate, revision }));
            const receipt = await api("/missions/endurance-recovery", { method: "POST",
              body: { missions, approveReadOnlyReviews: true } });
            setRecoveryReceipt(receipt.approvalId);
            setRecoveryBatch(null);
          });
        }}>
          <ul>{recoveryBatch.missions.map(entry => <li key={entry.id}>
            {entry.title} · {entry.step} · revision {entry.revision} · <code>{entry.candidate}</code>
            {" · ends "}<time dateTime={entry.endsAt}>{new Date(entry.endsAt).toLocaleString()}</time>
            {!entry.ready && " · awaiting an eligible blocked step"}
          </li>)}</ul>
          <p>Resume these six steps with one delegated retry per eligible routine step within its current window.
            Reviews and retests use Read Only without fallback. Existing approval gates still apply.</p>
          <button type="submit" disabled={busy || !!recoveryError || !recoveryBatch.ready}>Approve recovery for all six missions</button>
        </form>
      </details>}
      {!missionId && recoveryReceipt && <p role="status">Recovery approval recorded. Receipt <code>{recoveryReceipt}</code></p>}
      {!missionId && recoveryError && <p role="alert">Could not load the prepared recovery. {recoveryError}</p>}
      {missionError && <p role="alert">Could not refresh the mission list. {items.length > 0 && "Showing the last successful update."}</p>}
      {(missionError || recoveryError) && <button type="button" onClick={() => setRefresh(value => value + 1)}>Retry loading missions and recovery</button>}
      {!missionId && <InitiativeEnrollment api={api} onEnrolled={() => setRefresh(value => value + 1)} />}
      {grantReceipt && <section className="operations-missions__record" aria-labelledby="horizon-grant-receipt">
        <h3 id="horizon-grant-receipt" ref={receiptHeading} tabIndex={-1}>HORIZON scope granted</h3>
        <p>First Mate can register the mission in the selected conversation using grant ID <code>{grantReceipt.id}</code>.</p>
        <div className="operations-missions__controls">
          <button type="button" onClick={copyGrantId}>Copy grant ID</button>
          <button type="button" onClick={() => inspect(grantReceipt.sourceId, "Conversation")}>Open First Mate conversation</button>
        </div>
        <p role="status">{copyStatus}</p>
      </section>}
      {missionId && !linkedMission && !missionError && <p role="status">
        {loaded ? "This mission is unavailable in the current mission list." : "Loading mission…"}
      </p>}
      {!missionId && loaded && !missionError && !items.length && <p>No missions registered.</p>}
      {(missionId ? linkedMission ? [linkedMission] : [] : items).map(item => <section className="operations-missions__record" key={item._id} aria-label={item.title}>
        <h3 ref={missionId ? linkedHeading : null} tabIndex={missionId ? -1 : undefined}>{item.title}</h3>
        {item.initiativeId && item.status === "authorized" &&
          <InitiativeDependencies api={api} initiativeId={item.initiativeId} grantId={item._id} />}
        <p>{item.status} · Window ends <time dateTime={item.endsAt}>{new Date(item.endsAt).toLocaleString()}</time></p>
        {item.reason && <p>{item.reason}</p>}
        {item.status === "active" && item.dispatchHold && <p>{item.dispatchHold}</p>}
        {item.status === "active" && !item.hostOnline && <p>Waiting for the relay to reconnect.</p>}
        {item.status === "active" && item.usageHeld && <p>Waiting for subscription capacity.</p>}
        {item.next && <p>{item.current ? "Selected step" : "Next step"} <strong>{titleFor(item, item.next)}</strong></p>}
        {item.execution && <button type="button" onClick={() => inspect(item.execution._id)}>Inspect {item.execution.status} execution</button>}
        {item.awaitingApprovals?.map(key => <div key={key}>
          {item.approvalRequests?.[key] && <p>{item.approvalRequests[key].reason}</p>}
          <button type="button" disabled={busy || item.status !== "active"}
            onClick={() => control(item, "approve", { step: key })}>Approve {titleFor(item, key)}</button>
        </div>)}
        {item.coordinatorActorId && item.authorization && item.steps.some(step => step.key === item.completionStep && step.approval) &&
          <details><summary>First Mate authority</summary>
            <form key={item.executiveAuthority?.authorizedAt || "unconfigured"} onSubmit={event => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const end = data.get("renewUntil");
              control(item, "executive-authority", { authority: {
                commission: data.has("commission"),
                ...(data.has("commission") ? {
                  browserVerification: data.has("browserVerification"), addDevelopmentRoute: data.has("addDevelopmentRoute"),
                  objectiveIds: String(data.get("objectives")).split(/\s*,\s*/).map(id => id.trim()).filter(Boolean),
                } : {}),
                ...(end ? { renewUntil: new Date(end).toISOString() } : {}),
              } });
            }}>
              <label><input type="checkbox" name="commission" defaultChecked={item.executiveAuthority?.commission} /> Allow commissioning</label>
              {item.workspace === "development" && !item.authorization.routes.some(route => route.profile === "development") &&
                <label><input type="checkbox" name="addDevelopmentRoute" /> Authorize restricted development edits</label>}
              <label>Standalone objective IDs, separated by commas
                <input name="objectives" defaultValue={item.executiveAuthority?.objectiveIds?.join(", ") || ""} />
              </label>
              <label><input type="checkbox" name="browserVerification" defaultChecked={item.executiveAuthority?.browserVerification} /> Allow public browser verification</label>
              <label>Renewal ceiling <input name="renewUntil" type="datetime-local"
                defaultValue={item.executiveAuthority?.renewUntil ? localTime(new Date(item.executiveAuthority.renewUntil)) : ""} /></label>
              <button disabled={busy}>Save First Mate authority</button>
              {item.executiveAuthority && <button type="button" disabled={busy}
                onClick={() => control(item, "executive-authority", { authority: null })}>Revoke First Mate authority</button>}
            </form>
          </details>}
        <div className="operations-missions__controls">
          {item.status === "active" && <button type="button" disabled={busy} onClick={() => control(item, "pause")}>Pause mission</button>}
          {item.status === "paused" && <button type="button" disabled={busy} onClick={() => control(item, "resume")}>Resume mission</button>}
          {["expired", "blocked"].includes(item.status) && +new Date(item.endsAt) <= Date.now() && <form onSubmit={event => {
            event.preventDefault();
            const renewal = new FormData(event.currentTarget).get("renewal");
            control(item, item.status === "blocked" ? "renew" : "resume", { endsAt: new Date(renewal).toISOString() });
          }}>
            <label>New window end<input name="renewal" type="datetime-local" required /></label>
            <button disabled={busy}>Renew operating window</button>
          </form>}
          {["authorized", "active", "paused", "expired", "blocked"].includes(item.status) && <button type="button" disabled={busy} onClick={() => {
            if (window.confirm("Terminate this mission permanently? An execution already admitted can finish.")) control(item, "terminate");
          }}>Terminate mission</button>}
        </div>
        <details open={missionId && item.status === "blocked" ? true : undefined}><summary>Plan and execution history</summary>
          {item.status === "authorized" && <p>Grant ID <code>{item._id}</code></p>}
          {item.sourceConversationId && <button type="button" onClick={() => inspect(item.sourceConversationId)}>
            Inspect source conversation
          </button>}
          {item.authorization && <ul aria-label="Authorized execution routes">
            {item.authorization.routes.map(route => <li key={route.profile}>
              {route.profile} · {route.capabilities.join(", ")}
            </li>)}
          </ul>}
          <ol>{item.steps.map(step => <li key={step.key}>
            <strong>{step.title}</strong> · {item.results[step.key]?.result || (item.current?.step === step.key ? "selected" : "pending")}
            {step.requires?.length > 0 && <span> · {step.profile} ({step.allowProfileFallback ? "fallback allowed" : "required"}) · {step.requires.join(", ")}</span>}
            {item.results[step.key]?.jobId && <button type="button" onClick={() => inspect(item.results[step.key].jobId)}>Inspect</button>}
            {item.results[step.key]?.previousJobId && <button type="button" onClick={() => inspect(item.results[step.key].previousJobId)}>
              Inspect previous attempt
            </button>}
            {item.recoveries?.filter(attempt => attempt.step === step.key).map(attempt => <p key={attempt.jobId}>
              Owner resolution on <time dateTime={attempt.authorizedAt}>{new Date(attempt.authorizedAt).toLocaleString()}</time>
              {" — "}{attempt.resolution}
              {attempt.previous.jobId && <button type="button" onClick={() => inspect(attempt.previous.jobId)}>
                Inspect blocked attempt
              </button>}
            </p>)}
            {item.status === "blocked" && item.results[step.key]?.result === "blocked" && <form onSubmit={event => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const renewal = data.get("renewal");
              control(item, "recover", { step: step.key, resolution: data.get("resolution"),
                ...(renewal ? { endsAt: new Date(renewal).toISOString() } : {}) });
            }}>
              <label>Owner resolution for {step.title}<textarea name="resolution" required maxLength={800} /></label>
              <label>New window end (required after expiry)<input name="renewal" type="datetime-local"
                required={+new Date(item.endsAt) <= Date.now()} /></label>
              <button disabled={busy}>Resume blocked step</button>
            </form>}
          </li>)}</ol>
        </details>
      </section>)}
      {!missionId && (guiding ? <HorizonGrant api={api} hosts={hosts} onCancel={() => {
        guideFocus.current = guideButton;
        setGuiding(false);
      }} onGranted={(receipt, sourceId) => {
        guideFocus.current = receiptHeading;
        setGrantReceipt({ id: receipt._id, sourceId });
        setGuiding(false);
        setRefresh(value => value + 1);
      }} /> : !creating ? <div className="operations-missions__controls">
        <button type="button" onClick={prepareMission}>Prepare mission</button>
        <button type="button" ref={guideButton} onClick={() => {
          setGrantReceipt(null);
          setCopyStatus("");
          setGuiding(true);
        }}>Prepare HORIZON grant</button>
      </div> :
        <form onSubmit={create} className="operations-missions__create" onInvalid={event => {
          const field = event.target.labels?.[0]?.textContent?.trim();
          setRegistrationError(field ? `Check the ${field} field and try again.` : "Complete the required mission fields.");
        }}>
          <label>Plan template<select value={template} onChange={event => {
            setTemplate(event.target.value); setCustom(null);
          }}><option value="acceptance">Hosted continuation acceptance</option>
            <option value="foundry">Operation FOUNDRY</option></select></label>
          <label>Mission title<input name="title" key={template}
            defaultValue={template === "foundry" ? "Operation FOUNDRY" : "FOUNDRY continuation acceptance"} required maxLength={120} /></label>
          <label>Relay<select value={host?._id || ""} onChange={event => setHostId(event.target.value)} required>
            <option value="">Select relay</option>
            {hosts.map(device => <option key={device._id} value={device._id}>
              {device.label}{device.missionOnly ? " · capability-authorized missions only" : ""}
            </option>)}
          </select></label>
          <label>Reasoning effort<select name="effort" defaultValue="low" required>
            {host?.efforts?.map(effort => <option key={effort}>{effort}</option>)}
          </select></label>
          <label>Independent reviewer<select value={reviewer} onChange={event => {
            setReviewer(event.target.value); setCustom(null);
          }} required={custom === null}>
            <option value="">Select reviewer</option>
            {employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
          </select></label>
          {template === "foundry" && <label>Implementation permissions<select value={profile} onChange={event => {
            setProfile(event.target.value); setCustom(null);
          }}>
            <option value="read-only">Read Only</option>
            {host?.profiles?.includes("development") && <option value="development">Development editing</option>}
          </select></label>}
          <label>Authorize dispatch until<input type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} /></label>
          <label><span><input type="checkbox" name="paused" /> Register paused</span></label>
          <details><summary>Review or edit the authorized plan</summary>
            <p>Provide an object with <code>steps</code> and either <code>authorization</code> or a First Mate <code>sourceConversationId</code> on this relay. Each step lists the capabilities it requires.</p>
            <p>Set <code>allowProfileFallback</code> on a step to let the relay select another verified route within the mission’s authorization. Leave it unset to require the listed profile.</p>
            <p>Use <code>assignee</code> for a production employee or <code>reviewer</code> for an independent reviewer.</p>
            <label>Plan JSON<textarea rows={12} value={custom ?? JSON.stringify(steps, null, 2)}
              onChange={event => setCustom(event.target.value)} /></label>
            {custom !== null && <label><span><input type="checkbox" name="firstMateGrant" /> Authorize First Mate to register this plan</span></label>}
          </details>
          <p>Pause and expiry prevent new dispatch. An execution already admitted can finish. Approval gates apply to their own steps.</p>
          {registrationError && <p role="alert" tabIndex={-1} ref={registrationAlert}>{registrationError}</p>}
          <button disabled={busy || !host}>{busy ? "Registering mission…" : "Register mission"}</button>
        </form>)}
    </dialog>
  </>;
}
