import { useEffect, useRef, useState } from "react";
import CrewPortrait from "./CrewPortrait";
import { employeeActivity, roleLabel } from "./crewActivity";
import "./VirtualOffice.css";

function roomStatus(room) {
  if (room.hosts) {
    const connected = room.hosts.filter(host => host.online).length;
    return `${connected} of ${room.hosts.length} hosts online`;
  }
  const running = room.members.filter(({ activity }) => ["running", "cancelling"].includes(activity.state)).length;
  const waiting = room.members.filter(({ activity }) => ["queued", "waiting", "scheduled"].includes(activity.state)).length;
  return [
    `${room.members.length} ${room.members.length === 1 ? "employee" : "employees"}`,
    running ? `${running} active` : "",
    waiting ? `${waiting} preparing or waiting` : "",
  ].filter(Boolean).join(" · ");
}

export default function VirtualOffice({ api, openEmployee, openJob, openHeadquarters, openWorkflow, messageEmployee, canMessage }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState("owner");
  const [employeeId, setEmployeeId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const roomHeading = useRef(null);
  const employeeHeading = useRef(null);
  const focusEmployee = useRef(false);

  useEffect(() => {
    if (!employeeId || !focusEmployee.current) return;
    employeeHeading.current?.focus();
    focusEmployee.current = false;
  }, [employeeId]);

  useEffect(() => {
    let mounted = true;
    let timer;
    async function refresh() {
      try {
        const [directory, headquarters] = await Promise.all([api("/workforce"), api("/headquarters")]);
        if (mounted) {
          setSnapshot({ directory, stations: headquarters.workforce || [], approvals: headquarters.approvals || [],
            observedAt: headquarters.observedAt });
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
  const roster = employees.map(employee => ({ employee, activity: employeeActivity(employee, observedRuns) }));
  const approvalsByRun = new Map(snapshot.approvals.map(entry => [entry._id, entry]));
  const rooms = [
    { id: "owner", name: "Owner’s office", members: roster.filter(({ employee }) => !employee.departmentId) },
    ...departments.map(department => ({
      id: department._id, name: department.name, department,
      members: roster.filter(({ employee }) => employee.departmentId === department._id),
    })),
    { id: "hosts", name: "Infrastructure", members: [], hosts: snapshot.stations },
  ];
  const room = rooms.find(entry => entry.id === roomId) || rooms[0];
  const selected = room.members.find(({ employee }) => employee._id === employeeId);
  const employee = selected?.employee;
  const supervisor = employees.find(entry => entry._id === employee?.supervisorId);
  const hasMandate = employee && projectAssignments.some(entry => entry.employeeId === employee._id && entry.status === "assigned");
  const selectRoom = id => {
    setRoomId(id);
    setEmployeeId(null);
  };
  const inspectMember = id => {
    if (id === employeeId) employeeHeading.current?.focus();
    else {
      focusEmployee.current = true;
      setEmployeeId(id);
    }
  };

  return <section className="operations__office-map" aria-label="Living office">
    <div className="operations__briefing-title operations__office-toolbar">
      <div className="operations__modes">
        <button type="button" onClick={openHeadquarters}>Headquarters</button>
        <button type="button" onClick={openWorkflow}>Live workflow</button>
      </div>
      <label><span id="operations-office-room-label">Room</span> <select value={room.id}
        aria-labelledby="operations-office-room-label" aria-controls="operations-office-inspector"
        onChange={event => selectRoom(event.target.value)}>
        {rooms.map(entry => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
      </select></label>
      <label><span id="operations-office-scale-label">Map scale</span> <select value={zoom}
        aria-labelledby="operations-office-scale-label" onChange={event => setZoom(Number(event.target.value))}>
        <option value={100}>100%</option><option value={125}>125%</option><option value={150}>150%</option>
      </select></label>
    </div>
    {error && <p role="alert">Office updates unavailable. Showing the last successful refresh. {error}</p>}
    {snapshot.approvals.length > 0 && <section className="operations__office-attention operations__panel" aria-labelledby="office-attention">
      <h2 id="office-attention">Execution approvals</h2>
      <ul>{snapshot.approvals.map(entry => <li key={entry._id}>
        <button type="button" onClick={() => openJob(entry._id, "Execution")}>
          <strong>{entry.title || entry.workspace || "Open execution"}</strong>
          <span>{entry.approval.operation}</span>
        </button>
      </li>)}</ul>
    </section>}
    <div className="operations__office-room-summary">
      <span><strong>{room.name}</strong>{" · "}{roomStatus(room)}</span>
      <button type="button" onClick={() => roomHeading.current?.focus()}>Room details</button>
    </div>
    <div className="operations__studio-layout">
      <div className="operations__studio-viewport" role="region" aria-label="Scrollable office floor plan" tabIndex={0}>
        <div className="operations__studio-plan" style={{ minWidth: zoom + "%", "--office-zoom": zoom / 100 }}>
          {rooms.map(entry => <button type="button" key={entry.id} className="operations__studio-room" data-room={entry.id === "owner" || entry.id === "hosts" ? entry.id : "department"}
            aria-pressed={entry.id === room.id} aria-controls="operations-office-inspector"
            onClick={() => selectRoom(entry.id)}>
            <span className="operations__studio-furniture" aria-hidden="true"><i /><i /><i /></span>
            <span className="operations__studio-room-label">
              <strong>{entry.name}</strong>
              {entry.id === room.id && <small className="operations__room-selected" aria-hidden="true">Selected room</small>}
              <small>{roomStatus(entry)}</small>
            </span>
            <span className="operations__studio-crew" aria-hidden="true">
              {entry.members.slice(0, 5).map(({ employee, activity }) =>
                <CrewPortrait key={employee._id} employee={employee} state={activity.state} />)}
            </span>
          </button>)}
        </div>
      </div>
      <section id="operations-office-inspector" className="operations__panel operations__studio-inspector" aria-label="Office inspector">
        <h2 ref={roomHeading} tabIndex={-1}>{room.name}</h2>
        {room.department?.responsibilities && <p>{room.department.responsibilities}</p>}
        {snapshot.observedAt && <p className="operations__office-observed"><time dateTime={snapshot.observedAt}>
          Updated at {new Date(snapshot.observedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </time></p>}
        {room.hosts ? <>
          {!room.hosts.length && <p>No execution hosts reported.</p>}
          <ul className="operations__feed">{room.hosts.map(host => <li key={host._id}>
            <strong>{host.label}</strong><small>{host.state}</small>
            {(host.jobs || (host.job ? [host.job] : [])).map(job => <button key={job._id} type="button"
              onClick={() => openJob(job._id, "Execution")}>{job.title || "Open execution"}</button>)}
          </li>)}</ul>
        </> : <>
          {!room.members.length && <p>No employees assigned.</p>}
          <ul className="operations__office-desks" aria-label="Room workstations">{room.members.map(({ employee: member, activity }) => <li key={member._id}>
            <button type="button" data-state={activity.state} aria-pressed={member._id === employee?._id}
              onClick={() => inspectMember(member._id)}>
              <span className="operations__office-desk">
                <CrewPortrait employee={member} state={activity.state} />
                <span className="operations__office-terminal" aria-hidden="true" />
              </span>
              <strong>{member.name}</strong>
              <small>{roleLabel(member.role)} · {activity.runs.some(run => approvalsByRun.has(run._id)) ? "Approval required" : activity.label}</small>
            </button>
          </li>)}</ul>
        </>}
        {employee && <section className="operations__crew-inspector" aria-label={employee.name + " inspector"}>
          <h3 ref={employeeHeading} tabIndex={-1}>{employee.name}</h3>
          <p>{roleLabel(employee.role)} · {selected.activity.label}</p>
          {hasMandate && <p>Has an active project mandate.</p>}
          {supervisor && <p>Reports to {supervisor.name}</p>}
          <p>{employee.responsibilities}</p>
          {selected.activity.runs.length > 0 && <ul className="operations__office-executions">
            {selected.activity.runs.map(run => <li key={run._id}>
              <button type="button" onClick={() => openJob(run._id, "Execution")}>
                {run.title || "Open execution"}{approvalsByRun.has(run._id) && <small>Approval required</small>}
              </button>
            </li>)}
          </ul>}
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
