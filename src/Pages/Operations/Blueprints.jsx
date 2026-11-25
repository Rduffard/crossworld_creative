import { useEffect, useState } from "react";
import BlueprintCanvas from "./BlueprintCanvas";

const stepTypes = { task: "Read-only task", review: "Independent review", correction: "Bounded correction", retest: "Independent retest" };
const newStep = () => ({ id: crypto.randomUUID(), type: "task", name: "", employeeId: "", prompt: "", dependencies: [] });
const newBlueprint = () => ({ _id: crypto.randomUUID(), name: "", revision: 0, steps: [newStep()] });

export default function Blueprints({ api, openJob, standalone = false }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(newBlueprint);
  const [dirty, setDirty] = useState(true);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [run, setRun] = useState({ objectiveId: "", hostId: "", workspace: "development" });
  const [scopedCorrection, setScopedCorrection] = useState(false);
  const [selection, setSelection] = useState(null);
  const [palette, setPalette] = useState("");
  const selected = draft.steps.find(step => step.id === selection) || draft.steps[0];
  const latest = data?.runs.find(item => item.blueprintId === draft._id && item.revision === draft.revision);
  const selectedRunStep = !dirty && latest?.steps.find(step => step.id === selected.id);
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
    setDraft(previous => ({ ...previous, ...value }));
    setDirty(true);
    setNotice("");
  }

  function updateStep(id, fields) {
    change({ steps: draft.steps.map(step => step.id === id ? { ...step, ...fields } : step) });
  }

  function openDraft(saved) {
    setDraft(saved || newBlueprint());
    setSelection(null);
    setDirty(!saved);
    setProblem("");
    setNotice("");
  }

  function duplicate() {
    const ids = new Map(draft.steps.map(step => [step.id, crypto.randomUUID()]));
    openDraft({
      ...draft, _id: crypto.randomUUID(), revision: 0, name: (draft.name.slice(0, 115) + " copy").trim(),
      steps: draft.steps.map(step => ({ ...step, id: ids.get(step.id), dependencies: step.dependencies.map(id => ids.get(id)) })),
      layout: Object.fromEntries(Object.entries(draft.layout || {}).map(([id, point]) => [ids.get(id), point])),
    });
    setDirty(true);
  }

  function connect(source, target) {
    const byId = new Map(draft.steps.map(step => [step.id, step]));
    const from = byId.get(source);
    const to = byId.get(target);
    if (!from || !to || to.dependencies.includes(source)) return false;
    const ancestors = new Set(from.dependencies);
    for (const id of ancestors) {
      for (const dependency of byId.get(id)?.dependencies || []) ancestors.add(dependency);
    }
    if (source === target || ancestors.has(target)) {
      setProblem("This connection would create a dependency cycle.");
      return false;
    }
    const required = { review: "task", correction: "review", retest: "correction" }[to.type];
    if (required && (from.type || "task") !== required) {
      setProblem("Connect " + stepTypes[required].toLowerCase() + " to " + stepTypes[to.type].toLowerCase() + ".");
      return false;
    }
    if (["correction", "retest"].includes(to.type) && to.dependencies.length) {
      setProblem("Remove the current predecessor before connecting a different step.");
      return false;
    }
    setProblem("");
    updateStep(target, { dependencies: [...to.dependencies, source] });
    return true;
  }

  async function submit(event, start) {
    event.preventDefault();
    const incomplete = !start && draft.steps.find(step => !step.name.trim() || !step.employeeId || !step.prompt.trim());
    if (incomplete) {
      setSelection(incomplete.id);
      setProblem("Each step needs a name, an employee and instructions.");
      return;
    }
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

  const Wrapper = standalone ? "section" : "details";
  return <Wrapper className="operations__panel operations__blueprints">
    {!standalone && <summary>Blueprints</summary>}
    {problem && <p role="alert">{problem}</p>}
    {notice && <p role="status">{notice}</p>}
    {data && <>
      <div className="operations__blueprint-header">
      <label>Saved Blueprint
      <select value={data.blueprints.some(item => item._id === draft._id) ? draft._id : ""} disabled={pending}
        onChange={event => openDraft(data.blueprints.find(item => item._id === event.target.value))}>
        <option value="">Unsaved Blueprint</option>
        {data.blueprints.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
      </select></label>
      <button type="button" disabled={pending} onClick={() => openDraft()}>New Blueprint</button>
      <button type="button" disabled={pending || !draft.name.trim()} onClick={duplicate}>Duplicate</button>
      </div>
      <form onSubmit={event => submit(event, false)}>
        <fieldset disabled={pending}>
          <legend>Workflow definition</legend>
          <label>Name <input value={draft.name} maxLength={120} required onChange={event => change({ name: event.target.value })} /></label>
          <div className="operations__blueprint-editor">
          <BlueprintCanvas key={draft._id} steps={draft.steps} types={stepTypes}
            employees={new Map(data.employees.map(employee => [employee._id, employee.name]))}
            states={new Map((dirty ? [] : latest?.steps || []).map(step => [step.id, step.status]))}
            selected={selected.id} select={setSelection} connect={connect} positions={draft.layout || {}}
            move={(id, position) => {
              setDraft(previous => ({ ...previous, layout: { ...previous.layout, [id]: position } }));
              setDirty(true);
            }} />
          <div className="operations__blueprint-inspector">
          <label>Find step type <input type="search" value={palette} onChange={event => setPalette(event.target.value)} /></label>
          <div className="operations__blueprint-palette" aria-label="Add to workflow">
            {Object.entries(stepTypes).filter(([, label]) => label.toLowerCase().includes(palette.trim().toLowerCase()))
              .map(([type, label]) => <button key={type} type="button" disabled={draft.steps.length >= 12} onClick={() => {
                const step = { ...newStep(), type };
                change({ steps: [...draft.steps, step] });
                setSelection(step.id);
              }}>+ {label}</button>)}
          </div>
          {[selected].map(step => <fieldset key={step.id}>
            <legend>{step.name || "Step configuration"}</legend>
            {selectedRunStep?.jobId && <button type="button" onClick={() => openJob(selectedRunStep.jobId, "Execution")}>
              Inspect {selectedRunStep.status} execution
            </button>}
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
                <input type="checkbox" checked={step.dependencies.includes(item.id)} onChange={event => {
                  if (event.target.checked) connect(item.id, step.id);
                  else updateStep(step.id, { dependencies: step.dependencies.filter(id => id !== item.id) });
                }} /> {item.name || "Untitled step " + (otherIndex + 1)}
              </label>)}
            </fieldset>}
            <button type="button" disabled={draft.steps.length < 2} onClick={() => change({
              layout: Object.fromEntries(Object.entries(draft.layout || {}).filter(([id]) => id !== step.id)),
              steps: draft.steps.filter(item => item.id !== step.id).map(item => ({
                ...item, dependencies: item.dependencies.filter(id => id !== step.id),
              })),
            })}>Remove step</button>
          </fieldset>)}
          </div>
          </div>
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
  </Wrapper>;
}
