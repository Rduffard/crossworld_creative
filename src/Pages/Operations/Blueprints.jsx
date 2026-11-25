import { useEffect, useState } from "react";

const stepTypes = { task: "Read-only task", review: "Independent review", correction: "Bounded correction", retest: "Independent retest" };
const newStep = () => ({ id: crypto.randomUUID(), type: "task", name: "", employeeId: "", prompt: "", dependencies: [] });
const newBlueprint = () => ({ _id: crypto.randomUUID(), name: "", revision: 0, steps: [newStep()] });

export default function Blueprints({ api, openJob }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(newBlueprint);
  const [dirty, setDirty] = useState(true);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [run, setRun] = useState({ objectiveId: "", hostId: "", workspace: "development" });
  const [scopedCorrection, setScopedCorrection] = useState(false);
  const hasCorrection = draft.steps.some(step => step.type === "correction");
  const supportsScopedCorrection = data?.devices.find(item => item._id === run.hostId)?.profiles?.includes("scoped");

  useEffect(() => {
    let current = true;
    let timer;
    async function load() {
      try {
        const result = await api("/blueprints");
        if (!current) return;
        setData(result);
        timer = setTimeout(load, result.runs.some(item => item.status === "active") ? 3500 : 15000);
      } catch (failure) {
        if (!current) return;
        setProblem(failure.message);
        if (![401, 403, 404].includes(failure.status)) timer = setTimeout(load, 15000);
      }
    }
    load();
    return () => { current = false; clearTimeout(timer); };
  }, [api, refresh]);

  function change(value) {
    setDraft({ ...draft, ...value });
    setDirty(true);
    setNotice("");
  }

  function updateStep(id, fields) {
    change({ steps: draft.steps.map(step => step.id === id ? { ...step, ...fields } : step) });
  }

  async function submit(event, start) {
    event.preventDefault();
    setPending(true);
    setProblem("");
    setNotice("");
    try {
      const path = "/blueprints/" + draft._id;
      if (start) {
        await api(path + "/runs", { method: "POST", body: { ...run, runId: crypto.randomUUID(), revision: draft.revision,
          ...(hasCorrection && scopedCorrection ? { correctionProfile: "scoped" } : {}),
        } });
        setNotice("Blueprint run queued.");
      } else {
        setDraft(await api(path, { method: "PUT", body: draft }));
        setDirty(false);
        setNotice("Blueprint saved.");
      }
      setRefresh(value => value + 1);
    } catch (failure) { setProblem(failure.message); }
    finally { setPending(false); }
  }

  async function decide(item, step, decision) {
    setPending(true);
    setProblem("");
    try {
      await api("/blueprints/runs/" + item._id + "/steps/" + step.id + "/approval", {
        method: "POST", body: { decision, jobId: step.jobId },
      });
      setNotice(decision === "approve" ? "Candidate approved." : "Candidate rejected.");
      setRefresh(value => value + 1);
    } catch (failure) { setProblem(failure.message); }
    finally { setPending(false); }
  }

  return <details className="operations__panel operations__blueprints">
    <summary>Blueprints</summary>
    {problem && <p role="alert">{problem}</p>}
    {notice && <p role="status">{notice}</p>}
    {data && <>
      <label htmlFor="operations-blueprint-current">Saved Blueprint</label>
      <select id="operations-blueprint-current" value={data.blueprints.some(item => item._id === draft._id) ? draft._id : ""} disabled={pending}
        onChange={event => {
          const saved = data.blueprints.find(item => item._id === event.target.value);
          setDraft(saved || newBlueprint());
          setDirty(!saved);
          setProblem("");
          setNotice("");
        }}>
        <option value="">New Blueprint</option>
        {data.blueprints.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
      </select>
      <form onSubmit={event => submit(event, false)}>
        <fieldset disabled={pending}>
          <legend>Workflow definition</legend>
          <label>Name <input value={draft.name} maxLength={120} required onChange={event => change({ name: event.target.value })} /></label>
          {draft.steps.map((step, index) => <fieldset key={step.id}>
            <legend>{step.name || "Step " + (index + 1)}</legend>
            <label>Step name <input value={step.name} maxLength={120} required onChange={event => updateStep(step.id, { name: event.target.value })} /></label>
            <label htmlFor={"operations-blueprint-type-" + step.id}>Step type</label>
            <select id={"operations-blueprint-type-" + step.id} value={step.type || "task"}
              onChange={event => updateStep(step.id, { type: event.target.value, employeeId: "", requiresApproval: false })}>
              {Object.entries(stepTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor={"operations-blueprint-employee-" + step.id}>Employee</label>
            <select id={"operations-blueprint-employee-" + step.id} required value={step.employeeId}
              onChange={event => updateStep(step.id, { employeeId: event.target.value })}>
              <option value="">Choose employee</option>
              {data.employees.filter(item => step.type === "correction" ? item.role === "worker" :
                ["review", "retest"].includes(step.type) ? item.role === "qa" : item.role !== "qa")
                .map(item => <option key={item._id} value={item._id}>{item.name} · {item.workspace}</option>)}
            </select>
            <label>{step.type === "correction" ? "Correction scope" : "Instructions"} <textarea required maxLength={2000} value={step.prompt}
              onChange={event => updateStep(step.id, { prompt: event.target.value })} /></label>
            {(!step.type || step.type === "task") && <label><input type="checkbox" checked={step.requiresApproval === true}
              onChange={event => updateStep(step.id, { requiresApproval: event.target.checked })} /> Require owner approval</label>}
            {draft.steps.length > 1 && <fieldset>
              <legend>Run after</legend>
              {draft.steps.filter(item => item.id !== step.id).map((item, otherIndex) => <label key={item.id}>
                <input type="checkbox" checked={step.dependencies.includes(item.id)} onChange={event => updateStep(step.id, {
                  dependencies: event.target.checked ? [...step.dependencies, item.id] : step.dependencies.filter(id => id !== item.id),
                })} /> {item.name || "Untitled step " + (otherIndex + 1)}
              </label>)}
            </fieldset>}
            <button type="button" disabled={draft.steps.length < 2} onClick={() => change({
              steps: draft.steps.filter(item => item.id !== step.id).map(item => ({
                ...item, dependencies: item.dependencies.filter(id => id !== step.id),
              })),
            })}>Remove step</button>
          </fieldset>)}
          <button type="button" disabled={draft.steps.length >= 12} onClick={() => change({ steps: [...draft.steps, newStep()] })}>Add step</button>
          <button type="submit">Save Blueprint</button>
        </fieldset>
      </form>
      <form onSubmit={event => submit(event, true)}>
        <fieldset disabled={pending || dirty}>
          <legend>Run saved revision {draft.revision || ""}</legend>
          <label htmlFor="operations-blueprint-objective">Objective</label>
          <select id="operations-blueprint-objective" required value={run.objectiveId} onChange={event => setRun({ ...run, objectiveId: event.target.value })}>
            <option value="">Choose objective</option>
            {data.objectives.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}
          </select>
          <label htmlFor="operations-blueprint-relay">Relay</label>
          <select id="operations-blueprint-relay" required value={run.hostId} onChange={event => {
            setScopedCorrection(false);
            setRun({ ...run, hostId: event.target.value });
          }}>
            <option value="">Choose relay</option>
            {data.devices.map(item => <option key={item._id} value={item._id}>{item.label}</option>)}
          </select>
          <label htmlFor="operations-blueprint-workspace">Workspace</label>
          <select id="operations-blueprint-workspace" value={run.workspace} onChange={event => setRun({ ...run, workspace: event.target.value })}>
            <option value="development">Development</option><option value="workshop">Workshop</option>
          </select>
          {hasCorrection && <section>
            <h3>Corrections authorized by this run</h3>
            <p>An independent QA failure can trigger these corrections. Final acceptance remains separate.</p>
            {supportsScopedCorrection && <label><input type="checkbox" checked={scopedCorrection}
              onChange={event => setScopedCorrection(event.target.checked)} /> Use scoped editing across drives for corrections</label>}
            {scopedCorrection && !supportsScopedCorrection && <p role="status">The selected relay no longer advertises scoped editing.</p>}
            <ul>{draft.steps.filter(step => step.type === "correction").map(step => <li key={step.id}>{step.name} · {step.prompt}</li>)}</ul>
          </section>}
          <button type="submit" disabled={hasCorrection && scopedCorrection && !supportsScopedCorrection}>Start Blueprint run</button>
        </fieldset>
      </form>
      {data.runs.length > 0 && <section>
        <h3>Recent Blueprint runs</h3>
        <ul className="operations__feed">{data.runs.map(item => <li key={item._id}>
          <strong>{item.name} · revision {item.revision} · {item.status}</strong>
          <ul>{item.steps.map(step => <li key={step.id}>
            {step.jobId ? <button type="button" onClick={() => openJob(step.jobId, "Execution")}>{step.name}</button> : step.name} · {step.status}
            {step.verdict && <small>QA verdict · {step.verdict}</small>}
            {step.approval && <small>{step.approval.decision === "approve" ? "Approved by owner" : "Rejected by owner"}</small>}
            {step.status === "awaiting approval" && <div className="operations__modes">
              {step.type === "review" && <p>{item.steps.find(entry => entry.type === "correction" && entry.dependencies.includes(step.id))?.correctionScope}</p>}
              <button type="button" disabled={pending} onClick={() => decide(item, step, "approve")}>{step.type === "review" ? "Authorize correction" : "Approve candidate"}</button>
              <button type="button" disabled={pending} onClick={() => decide(item, step, "reject")}>Reject candidate</button>
            </div>}
          </li>)}</ul>
        </li>)}</ul>
      </section>}
    </>}
    {!data && !problem && <p role="status">Loading Blueprints…</p>}
  </details>;
}
