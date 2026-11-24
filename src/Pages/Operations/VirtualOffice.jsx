import { useEffect, useState } from "react";

const activeStates = ["running", "cancelling", "queued", "waiting", "scheduled"];
const roleLabels = {
  worker: "Worker", lead: "Department lead", "first-mate": "First Mate", qa: "Quality assurance", air: "AIR",
};

function Room({ name, members, assignments, openEmployee, openJob }) {
  return <section className="operations__room" aria-label={name}>
    <h3>{name}</h3>
    {members.length === 0 && <p>No employees assigned.</p>}
    <ul className="operations__room-list">{members.map((employee) => {
      const current = assignments.find((run) => run.employeeId === employee._id && activeStates.includes(run.status));
      const state = current?.status || employee.status;
      return <li key={employee._id} className="operations__occupant" data-state={state}>
        <span className="operations__occupant-symbol" aria-hidden="true" />
        <div>
          <button type="button" className="operations__source" onClick={() => openEmployee(employee._id)}>{employee.name}</button>
          <small>{roleLabels[employee.role]} · {state}</small>
          {current && <button type="button" className="operations__source" onClick={() => openJob(current._id, "Execution")}>
            {current.title || "Open assigned turn"}
          </button>}
        </div>
      </li>;
    })}</ul>
  </section>;
}

export default function VirtualOffice({ api, openEmployee, openJob, openHeadquarters }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let timer;
    async function refresh() {
      try {
        const [directory, headquarters] = await Promise.all([api("/workforce"), api("/headquarters")]);
        if (mounted) {
          setSnapshot({ directory, stations: headquarters.workforce || [] });
          setError("");
        }
      } catch (failure) {
        if (mounted) setError(failure.message);
      }
      if (mounted) timer = setTimeout(refresh, 8000);
    }
    refresh();
    return () => { mounted = false; clearTimeout(timer); };
  }, [api]);

  if (!snapshot) return <p role={error ? "alert" : "status"}>{error || "Loading office…"}</p>;
  const { departments, employees, observedRuns = [] } = snapshot.directory;
  const rooms = [
    { id: "owner", name: "Direct reports", members: employees.filter((employee) => !employee.departmentId) },
    ...departments.map((department) => ({
      id: department._id, name: department.name, members: employees.filter((employee) => employee.departmentId === department._id),
    })),
  ];
  return <section className="operations__panel operations__office-map" aria-labelledby="operations-office-map">
    <div className="operations__briefing-title">
      <h2 id="operations-office-map">Virtual office</h2>
      <button type="button" className="operations__source" onClick={openHeadquarters}>Open Headquarters</button>
    </div>
    {error && <p role="alert">Office updates unavailable. Showing the last successful refresh. {error}</p>}
    <div className="operations__floorplan">
      {rooms.map((room) => <Room key={room.id} name={room.name} members={room.members}
        assignments={observedRuns} openEmployee={openEmployee} openJob={openJob} />)}
      <section className="operations__room operations__machine-room" aria-label="Execution hosts">
        <h3>Execution hosts</h3>
        {snapshot.stations.length === 0 && <p>No execution hosts reported.</p>}
        <ul className="operations__room-list">{snapshot.stations.map((host) => <li key={host._id} className="operations__occupant" data-state={host.state}>
          <span className="operations__host-symbol" aria-hidden="true" />
          <div>
            <strong>{host.label}</strong>
            <small>{host.state}</small>
            {host.job && <button type="button" className="operations__source" onClick={() => openJob(host.job._id, "Execution")}>
              {host.job.title || "Open assigned turn"}
            </button>}
          </div>
        </li>)}</ul>
      </section>
    </div>
  </section>;
}
