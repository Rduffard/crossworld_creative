import { useEffect, useState } from "react";
import "./finance.css";

const sections = {
  workflows: ["Recent CI runs", item => [`actions/runs/${item.id}`, item.name, item.conclusion ?? item.status]],
  commits: ["Recent repository commits", item => [`commit/${item.sha}`, item.summary, item.author]],
  pulls: ["Open pull requests", item => [`pull/${item.number}`, item.title, item.draft ? "Draft" : "Open"]],
  issues: ["Recently updated issues", item => [`issues/${item.number}`, item.title, null]],
  releases: ["Recent releases", item => [`releases/tag/${encodeURIComponent(item.tag_name)}`, item.name || item.tag_name, item.prerelease ? "Prerelease" : null]],
};

function RepositoryDetails({ repo }) {
  const url = `https://github.com/${repo.name}`;
  return Object.entries(sections).map(([key, [label, describe]]) => {
    const section = repo.details?.[key];
    if (!section) return null;
    return <details key={key}>
      <summary>{label}</summary>
      {section.status !== "available" && <small>
        {section.status.replaceAll("-", " ")}{section.observedAt != null && ` · Showing data from ${new Date(section.observedAt).toLocaleString()}`}
      </small>}
      {section.items?.length ? <ul className="operations-finance__entries">{section.items.map(item => {
          const [path, title, detail] = describe(item);
          return <li key={path}><div>
            <a href={`${url}/${path}`} target="_blank" rel="noreferrer">{title || "Open in GitHub"}</a>
            {detail && <small>{detail}</small>}
          </div></li>;
        })}</ul> : section.status === "available" && <small>No entries in the latest GitHub response.</small>}
    </details>;
  });
}

export default function Engineering({ request }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let current = true;
    request("/engineering").then(value => {
      if (current) setSnapshot(value);
    }).catch(failure => {
      if (current) setError(failure.message);
    });
    return () => { current = false; };
  }, [request]);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await request("/engineering/refresh", { method: "POST" });
      setSnapshot(await request("/engineering"));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="operations-finance" aria-label="Engineering">
      <div className="operations-finance__toolbar">
        <div>
          <strong>GitHub activity</strong>
          <div><small>Public GitHub data for allowlisted repositories</small></div>
        </div>
        <button disabled={!snapshot?.configured || refreshing} onClick={refresh}>{refreshing ? "Refreshing…" : "Refresh repositories"}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!snapshot && !error && <p role="status">Loading integration status…</p>}
      {snapshot?.configured === 0 && <p>No repositories configured. Set the backend Operations GitHub repository allowlist to enable synchronization.</p>}
      {snapshot?.configured > 0 && !snapshot.observedAt && <p>Refresh to fetch the first repository snapshot.</p>}
      {snapshot?.observedAt != null && <p role="status">
        Last refresh {new Date(snapshot.observedAt).toLocaleString()}{snapshot.degraded ? " · Partial coverage" : ""}{snapshot.stale ? " · Some data is stale" : ""}
      </p>}
      {snapshot && snapshot.configured > snapshot.limit && <p>Showing the first {snapshot.limit} configured repositories.</p>}
      {snapshot?.nextAttempt && <small>Next refresh available at {new Date(snapshot.nextAttempt).toLocaleTimeString()}.</small>}
      <ul className="operations-finance__entries">
        {snapshot?.repositories.map(repo => <li key={repo.name}>
          <div>
            <a href={`https://github.com/${repo.name}`} target="_blank" rel="noreferrer">{repo.name}</a>
            {repo.status !== "available" && <small>
              Repository data {repo.status.replaceAll("-", " ")}{repo.observedAt != null && ` · Showing data from ${new Date(repo.observedAt).toLocaleString()}`}.
            </small>}
            {repo.observedAt != null && <>
              <small>{[repo.visibility, repo.default_branch, repo.language].filter(Boolean).join(" · ")}</small>
              {repo.pushed_at && <small>Last push {new Date(repo.pushed_at).toLocaleString()}</small>}
              {Number.isFinite(repo.open_issues_count) && <small>{repo.open_issues_count} open issues and pull requests combined</small>}
              <RepositoryDetails repo={repo} />
            </>}
          </div>
        </li>)}
      </ul>
    </section>
  );
}
