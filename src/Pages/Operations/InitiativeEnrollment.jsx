import { useEffect, useState } from "react";

const dependencyMessages = {
  pending: "Waiting for predecessor",
  "needs-attention": "Predecessor needs attention",
  "cannot-continue": "Cannot continue through predecessor",
};

export function InitiativeDependencies({ api, initiativeId, grantId }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const initiative = await api("/missions/initiatives/" + initiativeId, { signal: controller.signal, cache: "no-store" });
        if (!controller.signal.aborted) {
          setResult(initiative.missions.find(mission => mission.grantId === grantId)?.dependencies ?? []);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setResult(failure.status === 404 ? "Waiting for initiative enrollment." :
          "Initiative dependency status is temporarily unavailable.");
      }
    }
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [api, initiativeId, grantId]);
  if (typeof result === "string") return <p>{result}</p>;
  const waiting = result?.filter(item => item.state !== "passed");
  return waiting?.length ? <ul aria-label="Initiative dependencies">
    {waiting.map(item => <li key={item.id}>{dependencyMessages[item.state]} <strong>{item.title || item.id}</strong> ({item.status})</li>)}
  </ul> : null;
}

function prepare(input) {
  const { initiative, grantDefaults, grants } = input ?? {};
  if (!initiative?.id || !initiative?.title || !initiative?.blueprintRevision ||
      !Array.isArray(initiative.missions) || !Array.isArray(grants) || !grants.length || grants.length > 30 ||
      grantDefaults?.initiativeId !== initiative.id || initiative.missions.length !== grants.length ||
      new Set(grants.map(grant => grant?.id)).size !== grants.length ||
      grants.some(grant => typeof grant?.title !== "string" || !Array.isArray(grant.steps) ||
        grant.steps.some(step => typeof step?.title !== "string" || typeof step.prompt !== "string" ||
          typeof step.profile !== "string" || !Array.isArray(step.requires)) ||
        !initiative.missions.some(mission => mission?.grantId === grant.id && Array.isArray(mission.after)))) {
    throw new Error("Choose an initiative file containing its Blueprint revision and matching mission grants.");
  }
  const { hostId, workspace, sourceConversationId, effort, completionStep } = grantDefaults;
  return { initiative, grants: grants.map(({ id, title, steps }) => ({
    id, title, steps, hostId, workspace, sourceConversationId, effort, completionStep, initiativeId: initiative.id,
  })) };
}

export default function InitiativeEnrollment({ api, onEnrolled }) {
  const [plan, setPlan] = useState(null);
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  async function select(event) {
    const file = event.target.files?.[0];
    setPlan(null);
    setError("");
    setReceipt(null);
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 1024 * 1024) throw new Error("Choose an initiative file under 1 MB.");
      setPlan(prepare(JSON.parse(await file.text())));
    } catch (failure) {
      setError(failure instanceof SyntaxError ? "The initiative file must contain valid JSON." : failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function enroll(event) {
    event.preventDefault();
    if (!plan || busy) return;
    setBusy(true);
    setError("");
    try {
      const endsAt = new Date(end).toISOString();
      for (const grant of plan.grants) {
        await api("/missions/grants", { method: "POST", body: { ...grant, endsAt } });
      }
      const result = await api("/missions/initiatives", { method: "POST", body: { ...plan.initiative, approvePlan: true } });
      setReceipt(result);
      onEnrolled();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <details>
    <summary>Enroll approved initiative</summary>
    <form className="operations-missions__create" onSubmit={enroll}>
      <label>Initiative file<input type="file" accept=".json,application/json" onChange={select} disabled={busy} /></label>
      {plan && <>
        <h3>{plan.initiative.title}</h3>
        <p>Blueprint reference {plan.initiative.blueprintRevision} · Anchor {plan.initiative.anchorId}</p>
        {plan.grants.map(grant => <details key={grant.id}>
          <summary>{grant.title}</summary>
          <p>{grant.workspace} · Relay {grant.hostId} · Source conversation {grant.sourceConversationId}</p>
          <p>After {plan.initiative.missions.find(mission => mission.grantId === grant.id).after.join(", ")}</p>
          <ol>{grant.steps.map(step => <li key={step.key}>
            <strong>{step.title}</strong> · {step.profile}{step.approval && " · Owner approval required"}
            <p>{step.requires.join(", ")}{step.allowProfileFallback && " · Fallback allowed"}</p>
            <p>{step.prompt}</p>
          </li>)}</ol>
        </details>)}
        <label>Authorize dispatch until<input type="datetime-local" required value={end}
          onChange={event => setEnd(event.target.value)} disabled={busy || !!receipt} /></label>
        <p>Approval authorizes these exact mission grants and dependencies within the selected window. Step approval gates still apply.</p>
        <button disabled={busy || !!receipt}>Approve and enroll initiative</button>
      </>}
      {error && <p role="alert">{error}</p>}
      {receipt && <p role="status">Initiative enrolled. The controller will register eligible missions on the relay.</p>}
    </form>
  </details>;
}
