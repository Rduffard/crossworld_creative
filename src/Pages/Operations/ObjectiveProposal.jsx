import { useEffect, useState } from "react";

const activeStates = ["queued", "running", "waiting", "cancelling"];

export default function ObjectiveProposal({ request, jobId, jobStatus, openObjective }) {
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    let timer;
    async function read() {
      try {
        const found = await request(`/jobs/${jobId}/objective-proposal`);
        if (!active) return;
        setProposal(found);
        if (!found && !document.hidden && activeStates.includes(jobStatus)) timer = setTimeout(read, 8000);
      } catch (failure) {
        if (active && failure.status !== 404) setError(failure.message);
      }
    }
    read();
    document.addEventListener("visibilitychange", readWhenVisible);
    function readWhenVisible() {
      if (!document.hidden) {
        clearTimeout(timer);
        read();
      }
    }
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", readWhenVisible);
    };
  }, [request, jobId, jobStatus]);

  async function decide(decision) {
    setError("");
    setSaving(true);
    try {
      setProposal(await request(`/jobs/${jobId}/objective-proposal`, {
        method: "POST", body: { decision, digest: proposal.digest },
      }));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  if (!proposal) return null;
  return <section className="operations__panel" aria-label="Objective proposal">
    <h3>{proposal.input.title}</h3>
    <p>{proposal.projectName} · {proposal.input.priority} priority · {proposal.state === "pending" ? "Owner decision required" : proposal.state}</p>
    <p>{proposal.input.instruction}</p>
    <ul>{proposal.input.criteria.map(criterion => <li key={criterion}>{criterion}</li>)}</ul>
    {error && <p role="alert">{error}</p>}
    {["pending", "authorized"].includes(proposal.state) && <div className="operations-finance__toolbar">
      <button disabled={saving} type="button" onClick={() => decide("approve")}>{proposal.state === "pending" ? "Create objective" : "Retry creating objective"}</button>
      {proposal.state === "pending" && <button disabled={saving} type="button" onClick={() => decide("reject")}>Reject proposal</button>}
    </div>}
    {proposal.state === "applied" && <button type="button" onClick={() => openObjective(proposal.objectiveId)}>Open objective</button>}
  </section>;
}
