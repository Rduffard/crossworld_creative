import { useEffect, useRef, useState } from "react";

const roles = { qa: "Independent QA", "first-mate": "First Mate", air: "AIR" };

export default function ObjectiveReviews({ api, objective, openJob }) {
  const [reviews, setReviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [sourceId, setSourceId] = useState("");
  const [role, setRole] = useState("qa");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);
  const reviewId = useRef(null);
  const endpoint = "/objective-runs/" + objective._id;

  useEffect(() => {
    let current = true;
    api("/workforce").then(({ employees }) => {
      if (current) setReviewers(employees.filter((employee) => Object.hasOwn(roles, employee.role) && employee.status === "available"));
    }).catch((failure) => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [api]);

  useEffect(() => {
    let current = true;
    let timer;
    async function refresh() {
      try {
        const [entries, sources] = await Promise.all([api(endpoint), api("/jobs?compact=true")]);
        if (current) {
          setReviews(entries);
          setJobs(sources);
        }
      } catch (failure) {
        if (current) setError(failure.message);
      }
      if (current) timer = setTimeout(refresh, 5000);
    }
    refresh();
    return () => { current = false; clearTimeout(timer); };
  }, [api, endpoint, version]);

  async function queue(event) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const key = JSON.stringify(body);
    if (reviewId.current?.key !== key) reviewId.current = { key, id: crypto.randomUUID() };
    setPending(true);
    setError("");
    try {
      await api(endpoint, { method: "POST", body: { ...body, id: reviewId.current.id } });
      reviewId.current = null;
      form.reset();
      setSourceId("");
      setVersion((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  const sources = (role === "first-mate" ? reviews : jobs).filter((job) => {
    if (role === "air") return job.workerRole !== "air";
    if (["failed", "cancelled", "interrupted", "cancelling"].includes(job.status)) return false;
    if (role === "first-mate") return job.workerRole === "qa";
    return !Object.hasOwn(roles, job.workerRole);
  });
  const source = sources.find((job) => job._id === sourceId);
  const eligible = reviewers.filter((reviewer) => reviewer.workspace === source?.workspace && reviewer.role === role);

  return <section aria-label="Objective runs">
    <h3>Objective runs</h3>
    {error && <p role="alert">{error}</p>}
    {reviews.length === 0 && <p>No QA, First Mate, or AIR turns recorded.</p>}
    <ul className="operations__feed">{reviews.map((review) => <li key={review._id}>
      <button type="button" onClick={() => openJob(review._id, "Conversation")}>{roles[review.workerRole]} · {review.reviewerName} · {review.status}</button>
      <button type="button" className="operations__source" onClick={() => openJob(review.reviewOf, "Conversation")}>Source turn</button>
      {review.error && <small>{review.error}</small>}
    </li>)}</ul>
    {objective.status === "active" && <details>
      <summary>Queue a dependent turn</summary>
      <form onSubmit={queue}>
        <label>Role <select name="role" value={role} onChange={(event) => {
          setRole(event.target.value);
          setSourceId("");
        }}>
          {Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Source turn <select name="sourceId" value={sourceId} onChange={(event) => setSourceId(event.target.value)} required>
          <option value="">Select a recent turn</option>
          {sources.map((job) => <option key={job._id} value={job._id}>
            {job.title || job.prompt || job.workspace} · {job.status}
          </option>)}
        </select></label>
        <label>Employee <select key={sourceId} name="employeeId" required>
          <option value="">{source && eligible.length === 0 ? "No available employee for this workspace" : "Select an employee"}</option>
          {eligible.map((reviewer) => <option key={reviewer._id} value={reviewer._id}>{reviewer.name}</option>)}
        </select></label>
        <label>Evidence and checks <textarea name="evidence" maxLength={1500} required /></label>
        <button type="submit" disabled={pending || !eligible.length}>{pending ? "Queuing…" : "Queue read-only turn"}</button>
      </form>
    </details>}
  </section>;
}
