import { useEffect, useState } from "react";

function executionState(host, run) {
  if (!host.online) return "Relay disconnected";
  if (run.state === "lease expired") return "Lease expired";
  if (run.state === "approval required") return "Awaiting approval";
  return run.status === "cancelling" ? "Cancelling" : "Running";
}

export default function ExecutionDock({ request, inspect }) {
  const [snapshot, setSnapshot] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer;

    async function refresh() {
      try {
        const result = await request("/headquarters", { signal: controller.signal, cache: "no-store" });
        if (!controller.signal.aborted) {
          setSnapshot(result);
          setUnavailable(false);
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          if ([401, 403].includes(failure.status)) setSnapshot(null);
          setUnavailable(true);
        }
      }
      if (!controller.signal.aborted) {
        timer = setTimeout(refresh, document.hidden ? 30000 : 5000);
      }
    }

    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [request]);

  const executions = snapshot?.workforce?.flatMap(host =>
    (host.jobs ?? (host.job ? [host.job] : [])).map(run => ({ host, run })));

  return <>
    {unavailable && <p role="status">{snapshot
      ? "Updates unavailable. Showing the last relay observation."
      : "Execution status is unavailable. Retrying…"}</p>}
    {!snapshot && !unavailable && <p role="status">Checking active executions…</p>}
    {snapshot && !executions && !unavailable && <p role="status">This release does not provide relay execution details.</p>}
    {snapshot?.observedAt && <p className="operations__dock-observation">
      Last checked <time dateTime={snapshot.observedAt}>{new Date(snapshot.observedAt).toLocaleTimeString()}</time>
    </p>}
    {executions?.length === 0 && !unavailable && <p role="status">No executions reported on the relays.</p>}
    {!!executions?.length && <ul className="operations__dock-list">
      {executions.map(({ host, run }) => <li key={run._id}>
        <div>
          <strong>{run.title || run.workspace || "Execution"}</strong>
          <small>{[run.employee, host.label, run.slot].filter(Boolean).join(" · ")}</small>
          <span>{executionState(host, run)}</span>
        </div>
        <button type="button" onClick={() => inspect(run._id)}
          aria-label={`Inspect execution ${run.title || run.workspace || run._id}${run.employee ? ` for ${run.employee}` : ""}`}>
          Inspect
        </button>
      </li>)}
    </ul>}
  </>;
}
