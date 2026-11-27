import { useEffect, useState } from "react";

const refreshMs = 10000;
const backgroundRefreshMs = 30000;
const serviceStates = ["Working", "Standing By", "Awaiting Decision", "Paused"];

function ReviewTime({ label, value }) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(+date)) return null;
  return <div><dt>{label}</dt><dd><time dateTime={value}>{date.toLocaleString()}</time></dd></div>;
}

export default function ExecutiveService({ api, openJob, openMission }) {
  const [service, setService] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (saving) return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      try {
        const result = await api("/executive-service", { signal: controller.signal });
        if (!serviceStates.includes(result?.state) || typeof result.paused !== "boolean") {
          throw new Error("The service status response is incomplete.");
        }
        if (!controller.signal.aborted) {
          setService(result);
          setStatusError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setStatusError(error.message);
      } finally {
        if (!controller.signal.aborted) {
          timer = setTimeout(refresh, document.hidden ? backgroundRefreshMs : refreshMs);
        }
      }
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [api, saving, refreshVersion]);

  async function changePause() {
    setSaving(true);
    setUpdateError("");
    try {
      await api("/executive-service", { method: "PATCH", body: { paused: !service.paused } });
      const result = await api("/executive-service");
      if (!serviceStates.includes(result?.state) || typeof result.paused !== "boolean") {
        throw new Error("The service status response is incomplete.");
      }
      setService(result);
      setStatusError("");
    } catch (error) {
      setUpdateError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="operations__panel operations__briefing" aria-labelledby="operations-executive-service-title">
    <div className="operations__briefing-title">
      <h2 id="operations-executive-service-title">First Mate service</h2>
      {service && <strong role="status">{service.state}{statusError && " (last known)"}</strong>}
    </div>
    {!service && !statusError && <p role="status">Checking service status…</p>}
    {statusError && <p role="alert">Service status unavailable. {statusError}</p>}
    {updateError && <p role="alert">Could not confirm the service update. {updateError}</p>}
    {service?.reason && <p>{service.reason}</p>}
    {(service?.lastReviewAt || service?.nextReviewAt) && <dl className="operations__counters">
      <ReviewTime label="Last review" value={service.lastReviewAt} />
      <ReviewTime label="Next review" value={service.nextReviewAt} />
    </dl>}
    <div className="operations__modes">
      {service && <button type="button" onClick={changePause} disabled={saving || !!statusError}>
        {saving ? "Saving…" : service.paused ? "Resume First Mate" : "Pause First Mate"}
      </button>}
      {service?.decision?.kind === "mission" && <button type="button" onClick={() => openMission(service.decision.id)}>Open mission approval</button>}
      {service?.jobId && <button type="button" onClick={() => openJob(service.jobId, "Execution")}>View service execution</button>}
      {statusError && <button type="button" onClick={() => setRefreshVersion(value => value + 1)}>Refresh service status</button>}
    </div>
  </section>;
}
