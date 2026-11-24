import { useEffect, useState } from "react";
import CrewPortrait from "./CrewPortrait";
import { employeeActivity, roleLabel } from "./crewActivity";

export default function VirtualOffice({ api, openEmployee, openJob, openHeadquarters, openWorkflow, messageEmployee, canMessage }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState("owner");
  const [employeeId, setEmployeeId] = useState(null);
  const [zoom, setZoom] = useState(100);

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
      if (mounted) timer = setTimeout(refresh, document.hidden ? 30000 : 10000);
    }
    refresh();
    return () => { mounted = false; clearTimeout(timer); };
  }, [api]);

  if (!snapshot) return <p role={error ? "alert" : "status"}>{error || "Loading office…"}</p>;
  const { departments, employees, observedRuns = [], projectAssignments = [] } = snapshot.directory;
  const activity = (employee) => employeeActivity(employee, observedRuns, projectAssignments);
  const rooms = [
    { id: "owner", name: "Owner’s office", members: employees.filter(employee => !employee.departmentId) },
    ...departments.map(department => ({
      id: department._id, name: department.name, department,
      members: employees.filter(employee => employee.departmentId === department._id),
    })),
    { id: "hosts", name: "Infrastructure", members: [], hosts: snapshot.stations },
  ];
  const room = rooms.find(entry => entry.id === roomId) || rooms[0];
  const employee = room.members.find(entry => entry._id === employeeId);
  const supervisor = employees.find(entry => entry._id === employee?.supervisorId);

  return <section className="operations__office-map" aria-label="Living office">
    <div className="operations__briefing-title operations__office-toolbar">
      <div className="operations__modes">
        <button type="button" onClick={openHeadquarters}>Headquarters</button>
        <button type="button" onClick={openWorkflow}>Live workflow</button>
      </div>
      <label>Map scale <select value={zoom} onChange={event => setZoom(Number(event.target.value))}>
        <option value={100}>100%</option><option value={125}>125%</option><option value={150}>150%</option>
      </select></label>
    </div>
    {error && <p role="alert">Office updates unavailable. Showing the last successful refresh. {error}</p>}
    <div className="operations__studio-layout">
      <div className="operations__studio-viewport" role="region" aria-label="Scrollable office floor plan" tabIndex={0}>
        <div className="operations__studio-plan" style={{ minWidth: zoom + "%", "--office-zoom": zoom / 100 }}>
          {rooms.map(entry => <button type="button" key={entry.id} className="operations__studio-room" data-room={entry.id === "owner" || entry.id === "hosts" ? entry.id : "department"}
            aria-pressed={entry.id === room.id} onClick={() => { setRoomId(entry.id); setEmployeeId(null); }}>
            <span className="operations__studio-furniture" aria-hidden="true"><i /><i /><i /></span>
            <span className="operations__studio-room-label">
              <strong>{entry.name}</strong>
              <small>{entry.hosts ? entry.hosts.filter(host => host.online).length + " online" : entry.members.length + (entry.members.length === 1 ? " employee" : " employees")}</small>
            </span>
            <span className="operations__studio-crew" aria-hidden="true">
              {entry.members.slice(0, 5).map(member => <CrewPortrait key={member._id} employee={member} state={activity(member).state} />)}
            </span>
          </button>)}
        </div>
      </div>
      <section className="operations__panel operations__studio-inspector" aria-label="Office inspector">
        <label>Room <select value={room.id} onChange={event => { setRoomId(event.target.value); setEmployeeId(null); }}>
          {rooms.map(entry => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
        </select></label>
        <h2>{room.name}</h2>
        {room.department?.responsibilities && <p>{room.department.responsibilities}</p>}
        {room.hosts ? <>
          {!room.hosts.length && <p>No execution hosts reported.</p>}
          <ul className="operations__feed">{room.hosts.map(host => <li key={host._id}>
            <strong>{host.label}</strong><small>{host.state}</small>
            {(host.jobs || (host.job ? [host.job] : [])).map(job => <button key={job._id} type="button"
              onClick={() => openJob(job._id, "Execution")}>{job.title || "Open execution"}</button>)}
          </li>)}</ul>
        </> : <>
          {!room.members.length && <p>No employees assigned.</p>}
          <ul className="operations__crew-list">{room.members.map(member => <li key={member._id}>
            <button type="button" aria-pressed={member._id === employee?._id} onClick={() => setEmployeeId(member._id)}>
              <CrewPortrait employee={member} state={activity(member).state} />
              <span><strong>{member.name}</strong><small>{roleLabel(member.role)} · {activity(member).state}</small></span>
            </button>
          </li>)}</ul>
        </>}
        {employee && <section className="operations__crew-inspector" aria-label={employee.name + " inspector"}>
          <h3>{employee.name}</h3>
          <p>{roleLabel(employee.role)} · {activity(employee).state}</p>
          {supervisor && <p>Reports to {supervisor.name}</p>}
          <p>{employee.responsibilities}</p>
          {activity(employee).runs.map(run => <button key={run._id} type="button"
            onClick={() => openJob(run._id, "Execution")}>{run.title || "Open execution"}</button>)}
          <div className="operations__modes">
            <button type="button" onClick={() => openEmployee(employee._id)}>Full profile</button>
            {employee.status === "available" && <button type="button" disabled={!canMessage(employee)}
              onClick={() => messageEmployee(employee)}>Conversation</button>}
          </div>
          {employee.status === "available" && !canMessage(employee) && <small>Conversation requires a compatible selected relay.</small>}
        </section>}
      </section>
    </div>
  </section>;
}
