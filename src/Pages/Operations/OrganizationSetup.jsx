import { useEffect, useState } from "react";

const labels = { create: "Create", retain: "Keep", conflict: "Needs review" };

export default function OrganizationSetup({ api }) {
  const [snapshot, setSnapshot] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    api("/organization").then((result) => {
      if (active) setSnapshot(result);
    }).catch((failure) => {
      if (active) setError(failure.message);
    });
    return () => { active = false; };
  }, [api, version]);

  function refresh() {
    setSnapshot(null);
    setError("");
    setVersion((value) => value + 1);
  }

  async function initialize() {
    setPending(true);
    setNotice("");
    setError("");
    try {
      const { created } = await api("/organization/initialize", {
        method: "POST", body: { planId: snapshot.planId },
      });
      setNotice(`Created ${created.length} foundation records. Open Workforce, Projects or Objectives to inspect them.`);
      refresh();
    } catch (failure) {
      if (failure.status === 409) refresh();
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  const plan = snapshot?.plan || [];
  const changes = plan.some((item) => item.state === "create");
  const conflicts = plan.some((item) => item.state === "conflict");

  return <section className="operations__panel" aria-labelledby="organization-foundation">
    <h2 id="organization-foundation">Studio foundation</h2>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!snapshot && !error && <p role="status">Checking owner-scoped records…</p>}
    {snapshot && <>
      <p>{snapshot.counts.departments} departments · {snapshot.counts.employees} employees · {snapshot.counts.projects} projects · {snapshot.counts.objectives} objectives</p>
      <details open={conflicts || undefined}>
        <summary>Review foundation records and evidence</summary>
        <ul className="operations__feed">
          {plan.map(({ key, name, state, reason, sources }) => <li key={key}>
            <strong>{name}</strong>
            <span>{labels[state]}</span>
            {reason && <p>{reason}</p>}
            <details>
              <summary>Provenance</summary>
              <ul>{sources.map((source) => <li key={source}>{source}</li>)}</ul>
            </details>
          </li>)}
        </ul>
      </details>
      {conflicts && <p>Resolve conflicting records, then reload the foundation plan.</p>}
      {!changes && !conflicts && <p>The studio foundation is in place.</p>}
      {changes && !conflicts && <button type="button" disabled={pending} onClick={initialize}>Create missing foundation records</button>}
    </>}
    {(snapshot || error) && <button type="button" onClick={refresh} disabled={pending}>Refresh foundation plan</button>}
  </section>;
}
