import { useEffect, useState } from "react";

export default function ExecutionApprovals({ api, openJob }) {
  const [approvals, setApprovals] = useState(null);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState(null);
  const [candidateError, setCandidateError] = useState("");
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const [snapshot, blueprint] = await Promise.allSettled([api("/headquarters"), api("/blueprints/pending-approvals")]);
        if (!active) return;
        if (snapshot.status === "fulfilled") setApprovals(snapshot.value.approvals);
        setError(snapshot.status === "rejected" ? snapshot.reason.message : "");
        if (blueprint.status === "fulfilled") setCandidates(blueprint.value);
        setCandidateError(blueprint.status === "rejected" ? blueprint.reason.message : "");
      } finally {
        if (active) timer = setTimeout(refresh, 10000);
      }
    }
    refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, version]);

  async function decide(candidate, decision) {
    setPending(true);
    setCandidateError("");
    try {
      await api("/blueprints/runs/" + candidate.runId + "/steps/" + candidate.stepId + "/approval",
        { method: "POST", body: { jobId: candidate.jobId, decision } });
      setVersion(value => value + 1);
    } catch (failure) { setCandidateError(failure.message); }
    finally { setPending(false); }
  }

  return <section aria-label="Execution approvals">
    <h3>Execution approvals</h3>
    {error && <p role="alert">{error}</p>}
    {!approvals && !error && <p role="status">Checking execution approvals…</p>}
    {approvals?.length === 0 && <p>No pending execution approvals.</p>}
    {approvals?.length > 0 && <ul className="operations__feed">{approvals.map(entry =>
      <li key={entry.approval.id}>
        <strong>{entry.title || "Execution"}</strong>
        <small>Expires {new Date(entry.approval.expiresAt).toLocaleString()}</small>
        <button type="button" onClick={() => openJob(entry._id)}>Inspect request</button>
      </li>
    )}</ul>}
    <h3>Blueprint approvals</h3>
    {candidateError && <p role="alert">{candidateError}</p>}
    {!candidates && !candidateError && <p role="status">Checking Blueprint approvals…</p>}
    {candidates?.length === 0 && <p>No Blueprint candidates awaiting approval.</p>}
    {candidates?.length > 0 && <ul className="operations__feed">{candidates.map(candidate => <li key={candidate.jobId}>
      <strong>{candidate.stepName}</strong><small>{candidate.name} · revision {candidate.revision}</small>
      {candidate.correctionScope && <p>Correction scope · {candidate.correctionScope}</p>}
      <div className="operations__modes">
        <button type="button" onClick={() => openJob(candidate.jobId)}>Inspect candidate</button>
        <button type="button" disabled={pending} onClick={() => decide(candidate, "approve")}>{candidate.correctionScope ? "Authorize correction" : "Approve"}</button>
        <button type="button" disabled={pending} onClick={() => decide(candidate, "reject")}>Reject</button>
      </div>
    </li>)}</ul>}
  </section>;
}
