import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { downloadText } from "./conversationExport";

function showDate(value) {
  return value ? new Date(value).toLocaleString() : "Unavailable";
}

function summaryFor(report) {
  const title = report.title || "Assignment report";
  const employee = report.assigneeName || report.reviewerName || "Employee attribution unavailable";
  const executive = report.response.trim().split(/\r?\n\s*\r?\n/).find(part => !/^#+\s+[^\n]+$/.test(part)) || "";
  return [
    `# ${title}`,
    `- Responsible employee: ${employee}`,
    report.supervisor && `- Supervisor: ${report.supervisor.name}`,
    report.project && `- Project: ${report.project.name}`,
    report.objective && `- Objective: ${report.objective.title}`,
    `- Completed: ${showDate(report.finishedAt)}`,
    `- Owner acceptance: ${report.objective?.status === "completed" ? "Objective accepted" : "No objective acceptance recorded"}`,
    "",
    "## Summary from the recorded response",
    "",
    executive || "The relay did not record a final response for this assignment.",
  ].filter(line => line !== false && line != null).join("\n");
}

export default function Reports({ api, reportId, openRecord, openJob, copy }) {
  const [data, setData] = useState({ reports: [], before: null });
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [directory, setDirectory] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (reportId) return;
    let current = true;
    Promise.all([api("/projects"), api("/workforce")])
      .then(([projects, { employees }]) => { if (current) setDirectory({ projects, employees }); })
      .catch(() => { /* Search remains available while filter choices cannot be loaded. */ });
    return () => { current = false; };
  }, [api, reportId]);

  useEffect(() => {
    let current = true;
    async function load() {
      setBusy(true);
      setProblem("");
      try {
        if (!reportId) {
          const result = await api("/reports?" + new URLSearchParams(filter));
          if (current) setData(result);
        } else {
          const result = await api("/reports/" + reportId);
          if (current) setDetail(result);
        }
      } catch (failure) {
        if (current) setProblem(failure.message);
      } finally {
        if (current) setBusy(false);
      }
    }
    load();
    return () => { current = false; };
  }, [api, filter, reportId]);

  async function more() {
    setBusy(true);
    setProblem("");
    try {
      const result = await api("/reports?" + new URLSearchParams(filter + "&before=" + data.before));
      setData({ reports: [...data.reports, ...result.reports], before: result.before });
    } catch (failure) {
      setProblem(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!reportId) return <section className="operations__panel">
    <form onSubmit={event => {
      event.preventDefault();
      const query = new URLSearchParams({ search: search.trim() });
      if (projectId) query.set("projectId", projectId);
      if (employeeId) query.set("employeeId", employeeId);
      setFilter(query.toString());
    }}>
      <label>Search reports<input type="search" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /></label>
      {directory && <div className="operations__selectors">
        <label>Project<select value={projectId} onChange={event => setProjectId(event.target.value)}>
          <option value="">All projects</option>
          {directory.projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
        </select></label>
        <label>Employee<select value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
          <option value="">All employees</option>
          {directory.employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
        </select></label>
      </div>}
      <button type="submit">Search</button>
    </form>
    {problem && <p role="alert">{problem}</p>}
    {busy && <p role="status">Loading reports…</p>}
    {!busy && !problem && !data.reports.length && <p>No completed assignment reports found.</p>}
    <ul className="operations__feed">{data.reports.map(report => <li key={report._id}>
      <button type="button" onClick={() => openRecord("report", report._id)}>{report.title || "Assignment report"}</button>
      <small>{report.assigneeName || report.reviewerName} · {showDate(report.finishedAt)}</small>
    </li>)}</ul>
    {data.before && <button type="button" disabled={busy} onClick={more}>Load older reports</button>}
  </section>;

  if (busy || detail?._id !== reportId || problem) return <p role={problem ? "alert" : "status"}>{problem || "Loading assignment report…"}</p>;
  const summary = summaryFor(detail);
  const duration = Date.parse(detail.finishedAt) - Date.parse(detail.startedAt);
  const criteria = detail.objective?.criteria || [];
  const technical = [
    summary, "## Full recorded response", detail.response || "No final response recorded.",
    "## Assignment brief", detail.prompt || "No brief recorded.",
    "## Objective criteria and current owner decisions",
    ...criteria.map(criterion => `- ${criterion.text} (${criterion.review?.decision || "awaiting review"})`),
    "## Recorded reviews", ...detail.review.map(review => `- ${review.title || review.workerRole} (${review.status})`),
    "## Attachments", ...detail.attachments.map(attachment => `- ${attachment.name}`),
    "## Provenance", `- Source execution: ${detail._id}`,
    detail.delegatedBy && `- First Mate handoff: ${detail.delegatedBy.sourceTurnId}`,
    Number.isFinite(duration) && duration >= 0 && `- Execution duration: ${Math.round(duration / 1000)} seconds`,
  ].filter(Boolean).join("\n\n");
  const file = "operations-report-" + detail._id;
  return <article className="operations__panel operations__response">
    <Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{summary}</Markdown>
    <div className="operations__modes">
      <button type="button" onClick={() => copy(summary)}>Copy summary</button>
      <button type="button" onClick={() => copy(technical)}>Copy full report</button>
      <button type="button" onClick={() => downloadText(file + ".md", "text/markdown;charset=utf-8", technical)}>Download Markdown</button>
      <button type="button" onClick={() => downloadText(file + ".txt", "text/plain;charset=utf-8", technical)}>Download text</button>
      <button type="button" onClick={() => downloadText(file + ".json", "application/json", JSON.stringify(detail, null, 2))}>Download JSON</button>
    </div>
    <details><summary>Full technical report</summary>
      <Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}>{technical}</Markdown>
    </details>
    <div className="operations__modes">
      <button type="button" onClick={() => openJob(detail._id, "Conversation")}>Execution transcript</button>
      {detail.objective && <button type="button" onClick={() => openRecord("objective", detail.objectiveId)}>Objective and acceptance</button>}
      {detail.delegatedBy && <button type="button" onClick={() => openJob(detail.delegatedBy.sourceTurnId, "Conversation")}>First Mate handoff</button>}
    </div>
  </article>;
}
