import { useEffect, useState } from "react";

const refreshMs = 10000;
const backgroundRefreshMs = 30000;
const pauseConfirmationMs = 30000;
const serviceStates = ["Working", "Standing By", "Awaiting Decision", "Paused"];
const orchestrationStates = { healthy: "Healthy", degraded: "Degraded", stale: "Stale" };

function serviceDate(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const date = new Date(value);
  return Number.isNaN(+date) ? null : date;
}

function ServiceTime({ label, date }) {
  if (!date) return null;
  return <div><dt>{label}</dt><dd><time dateTime={date.toISOString()}>{date.toLocaleString()}</time></dd></div>;
}

export default function ExecutiveService({ api, openJob, openMission }) {
  const [service, setService] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingPause, setPendingPause] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (saving) return;
    const controller = new AbortController();
    let timer;
    const deadlineTimer = pendingPause && !pendingPause.expired ? setTimeout(() => {
      controller.abort();
      clearTimeout(timer);
      setStatusError(previous => previous || "A fresh status could not be confirmed in time.");
      setPendingPause({ ...pendingPause, expired: true });
    }, Math.max(0, pendingPause.deadline - Date.now())) : undefined;
    async function refresh() {
      try {
        const result = await api("/executive-service", { signal: controller.signal });
        if (!serviceStates.includes(result?.state) || typeof result.paused !== "boolean") {
          throw new Error("The service status response is incomplete.");
        }
        if (!controller.signal.aborted) {
          const matchesRequest = !pendingPause || result.paused === pendingPause.paused;
          if (!matchesRequest && !pendingPause.expired) {
            setStatusError("");
            return;
          }
          setService(result);
          setStatusError("");
          if (matchesRequest) setPendingPause(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatusError(error.message || "The status check failed.");
        }
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
      clearTimeout(deadlineTimer);
    };
  }, [api, saving, pendingPause, refreshVersion]);

  async function changePause() {
    setSaving(true);
    setUpdateError("");
    const paused = !service.paused;
    try {
      await api("/executive-service", { method: "PATCH", body: { paused } });
      setPendingPause({ paused, deadline: Date.now() + pauseConfirmationMs });
    } catch (error) {
      setUpdateError(error.message);
    } finally {
      setSaving(false);
    }
  }

  const orchestration = service?.orchestration;
  const lastReview = serviceDate(service?.lastReviewAt);
  const nextReview = serviceDate(service?.nextReviewAt);
  const healthStatus = typeof orchestration?.status === "string" && Object.hasOwn(orchestrationStates, orchestration.status)
    ? orchestrationStates[orchestration.status] : null;
  const lastCheck = serviceDate(orchestration?.finishedAt);
  const nextCheck = serviceDate(orchestration?.nextSweepAt);
  const { onlineRelays, relayCount } = orchestration ?? {};
  const hasRelayCounts = Number.isInteger(onlineRelays) && Number.isInteger(relayCount) &&
    onlineRelays >= 0 && onlineRelays <= relayCount;
  const hasHealthMetrics = lastCheck || nextCheck || hasRelayCounts;
  const awaitingConfirmation = !!pendingPause && !pendingPause.expired;
  const lastKnown = awaitingConfirmation || !!statusError;
  return <section className="operations__panel operations__briefing" aria-labelledby="operations-executive-service-title">
    <div className="operations__briefing-title">
      <h2 id="operations-executive-service-title">First Mate service</h2>
      {service && <strong role="status">{service.state}{lastKnown && " (last known)"}</strong>}
    </div>
    {!service && !statusError && <p role="status">Checking service status…</p>}
    {(pendingPause || statusError) && <div>
      {awaitingConfirmation && <p role="status">
        {pendingPause.paused ? "Pause request accepted." : "Resume request accepted."} Waiting for the updated service status.
      </p>}
      {pendingPause?.expired && <p role="alert">
        {pendingPause.paused ? "Pause request accepted." : "Resume request accepted."} The requested state was not confirmed.
        {!statusError && " Showing the latest service status."}
      </p>}
      {statusError && <p role="alert">Service status unavailable. {statusError}</p>}
      <button type="button" onClick={() => setRefreshVersion(value => value + 1)}>Refresh service status</button>
    </div>}
    {updateError && <p role="alert">Could not confirm the service update. {updateError}</p>}
    {service?.reason && <p>{service.reason}</p>}
    {(lastReview || nextReview) && <dl className="operations__counters">
      <ServiceTime label="Last review" date={lastReview} />
      <ServiceTime label="Next review" date={nextReview} />
    </dl>}
    {service && <section className="operations__orchestration" aria-labelledby="operations-orchestration-title">
      <h3 id="operations-orchestration-title">Orchestration health</h3>
      <p role="status">
        <strong>{healthStatus || "Unavailable"}{healthStatus && lastKnown && " (last known)"}</strong>
        {!healthStatus && lastKnown && hasHealthMetrics && <>. Metrics shown are last known.</>}
      </p>
      {typeof orchestration?.reason === "string" && orchestration.reason && <p>{orchestration.reason}</p>}
      {hasHealthMetrics && <dl className="operations__counters">
        <ServiceTime label="Last check" date={lastCheck} />
        <ServiceTime label="Next check" date={nextCheck} />
        {hasRelayCounts && <div><dt>Relays online</dt><dd>{onlineRelays} of {relayCount}</dd></div>}
      </dl>}
    </section>}
    <div className="operations__modes">
      {service && <button type="button" onClick={changePause} disabled={saving || lastKnown}>
        {saving ? "Saving…" : service.paused ? "Resume First Mate" : "Pause First Mate"}
      </button>}
      {service?.decision?.kind === "mission" && <button type="button" onClick={() => openMission(service.decision.id)}>Open mission approval</button>}
      {service?.jobId && <button type="button" onClick={() => openJob(service.jobId, "Execution")}>View service execution</button>}
    </div>
  </section>;
}
