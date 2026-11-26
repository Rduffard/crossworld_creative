import { useEffect, useRef, useState } from "react";

export default function ExecutionApprovals({ api, openJob }) {
  const [approvals, setApprovals] = useState(null);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState(null);
  const [candidateError, setCandidateError] = useState("");
  const [pending, setPending] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const decisionPanel = useRef(null);
  const reviewButton = useRef(null);
  const result = useRef(null);

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

  useEffect(() => {
    if (reviewing) decisionPanel.current?.focus();
  }, [reviewing]);

  useEffect(() => {
    if (notice) result.current?.focus();
  }, [notice]);

  async function decide(candidate, decision) {
    setPending(true);
    setCandidateError("");
    try {
      await api("/blueprints/runs/" + candidate.runId + "/steps/" + candidate.stepId + "/approval",
        { method: "POST", body: { jobId: candidate.jobId, decision } });
      setCandidates(items => items.filter(item => item.jobId !== candidate.jobId));
      setReviewing(null);
      setNotice(`${candidate.stepName} ${decision === "approve" ? "approved" : "rejected"}.`);
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
    <div role="status" ref={result} tabIndex={-1}>{notice && <p>{notice}</p>}</div>
    {candidateError && <p role="alert">{candidateError}</p>}
    {!candidates && !candidateError && <p role="status">Checking Blueprint approvals…</p>}
    {candidates?.length === 0 && <p>No Blueprint candidates awaiting approval.</p>}
    {candidates?.length > 0 && <ul className="operations__feed">{candidates.map(candidate => <li key={candidate.jobId}>
      <strong>{candidate.stepName}</strong><small>{candidate.name} · revision {candidate.revision}</small>
      {candidate.correctionScope && <p>Correction scope · {candidate.correctionScope}</p>}
      <div className="operations__modes">
        <button type="button" onClick={() => openJob(candidate.jobId)}>Inspect candidate</button>
        <button type="button" disabled={pending} aria-expanded={reviewing === candidate.jobId} onClick={event => {
          reviewButton.current = event.currentTarget;
          setNotice("");
          setReviewing(candidate.jobId);
        }}>Review decision</button>
      </div>
      {reviewing === candidate.jobId && <fieldset disabled={pending}>
        <legend ref={decisionPanel} tabIndex={-1}>Decision for {candidate.stepName}</legend>
        <p>{candidate.correctionScope
          ? "Authorizing correction allows work within the scope above."
          : "Approval allows this Blueprint run to continue."}</p>
        <div className="operations__modes">
          <button type="button" onClick={() => decide(candidate, "approve")}>
            {candidate.correctionScope ? "Authorize correction" : "Approve candidate"}
          </button>
          <button type="button" onClick={() => decide(candidate, "reject")}>Reject candidate</button>
          <button type="button" onClick={() => {
            setReviewing(null);
            reviewButton.current?.focus();
          }}>Cancel</button>
        </div>
      </fieldset>}
    </li>)}</ul>}
  </section>;
}
