import { useRef, useState } from "react";
import CrewPortrait from "./CrewPortrait";
import { employeeActivity, roleLabel } from "./crewActivity";

export default function OrganizationChart({ departments, employees, observedRuns, selection, select }) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [focus, setFocus] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const viewport = useRef(null);
  const chart = useRef(null);
  const pan = useRef(null);
  const departmentNames = new Map(departments.map(department => [department._id, department.name]));
  const byId = new Map(employees.map(employee => [employee._id, employee]));
  const reports = new Map();
  const unattached = [];
  for (const employee of employees) {
    const visited = new Set([employee._id]);
    let ancestor = employee.supervisorId;
    while (ancestor && byId.has(ancestor) && !visited.has(ancestor)) {
      visited.add(ancestor);
      ancestor = byId.get(ancestor).supervisorId;
    }
    if (ancestor) {
      unattached.push(employee);
      continue;
    }
    const supervisor = employee.supervisorId || null;
    if (!reports.has(supervisor)) reports.set(supervisor, []);
    reports.get(supervisor).push(employee);
  }
  const inDepartment = employee => !departmentId || employee.departmentId === departmentId;
  const visible = new Set();
  if (departmentId) {
    for (const employee of employees.filter(inDepartment)) {
      for (let entry = employee; entry && !visible.has(entry._id); entry = byId.get(entry.supervisorId)) {
        visible.add(entry._id);
      }
    }
  }
  const showBranch = employee => !departmentId || visible.has(employee._id);

  function person(employee) {
    const { state, label, runs } = employeeActivity(employee, observedRuns);
    const assignment = runs.find(run => run.status === "running") || runs[0];
    return <button className="operations__org-person" type="button" aria-pressed={selection === employee._id} data-state={state}
      onClick={event => select(employee._id, event.currentTarget)}>
      <CrewPortrait employee={employee} state={state} />
      <span><strong>{employee.name}</strong><small>{roleLabel(employee.role)} · {label}</small>
        {departmentNames.has(employee.departmentId) && <small>{departmentNames.get(employee.departmentId)}</small>}
        {assignment?.title && <small className="operations__org-assignment" title={assignment.title}>{assignment.title}</small>}</span>
    </button>;
  }

  function branch(employee) {
    const children = (reports.get(employee._id) || []).filter(showBranch);
    const expanded = !collapsed.has(employee._id);
    const branchId = "reports-" + employee._id;
    return <li key={employee._id}>{person(employee)}
      {children.length > 0 && <>
        <button type="button" className="operations__org-expand" aria-expanded={expanded} aria-controls={branchId}
          aria-label={(expanded ? "Collapse " : "Expand ") + employee.name + "'s direct reports"}
          onClick={() => setCollapsed(previous => {
            const next = new Set(previous);
            if (next.has(employee._id)) next.delete(employee._id);
            else next.add(employee._id);
            return next;
          })}>{expanded ? "−" : "+"} {children.length}</button>
        <ul id={branchId} hidden={!expanded}>{expanded && children.map(branch)}</ul>
      </>}
    </li>;
  }

  const term = query.trim().toLocaleLowerCase();
  const matches = employees.filter(employee => inDepartment(employee)
    && [employee.name, roleLabel(employee.role)].some(value => value?.toLocaleLowerCase().includes(term)));
  function fit() {
    const width = chart.current.offsetWidth;
    const height = chart.current.offsetHeight;
    setZoom(Math.max(28, Math.min(100, Math.floor(100 * Math.min(
      viewport.current.clientWidth / width, viewport.current.clientHeight / height,
    )))));
    viewport.current.scrollTo(0, 0);
  }

  return <>
    <label>Find an employee <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="operations__modes">
      <button type="button" disabled={!byId.has(selection) || !showBranch(byId.get(selection))}
        onClick={() => { setFocus(selection); setQuery(""); }}>Focus selected</button>
      <button type="button" disabled={!focus && !departmentId} onClick={() => {
        setFocus(null);
        setDepartmentId("");
        setQuery("");
      }}>Whole organization</button>
      <label>Department <select aria-label="Filter by department" value={departmentId} onChange={event => {
        setDepartmentId(event.target.value);
        setFocus(null);
      }}>
        <option value="">All departments</option>
        {departments.map(department => <option value={department._id} key={department._id}>{department.name}</option>)}
      </select></label>
      <button type="button" onClick={fit}>Fit chart</button>
      <label>Zoom <input type="range" min="28" max="150" value={zoom}
        onChange={event => setZoom(Number(event.target.value))} /></label>
      <output>{zoom}%</output>
    </div>
    <div ref={viewport} className="operations__org-viewport" role="region" aria-label="Scrollable reporting chart" tabIndex={0}
      onPointerDown={event => {
        if (event.button !== 0 || event.pointerType !== "mouse" || event.target.closest("button")) return;
        const current = event.currentTarget;
        pan.current = { x: event.clientX, y: event.clientY, left: current.scrollLeft, top: current.scrollTop };
        current.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (pan.current) event.currentTarget.scrollTo(
          pan.current.left + pan.current.x - event.clientX,
          pan.current.top + pan.current.y - event.clientY,
        );
      }}
      onLostPointerCapture={() => { pan.current = null; }}>
      <div ref={chart} className="operations__org-chart" style={{ zoom: zoom + "%" }}>
        {term ? <>
          <p>{matches.length} matching employees</p>
          <ul>{matches.map(employee => <li key={employee._id}>{person(employee)}</li>)}</ul>
        </> : focus && byId.has(focus) ? <ul>{branch(byId.get(focus))}</ul> : <>
          <h3 className="operations__org-owner">Owner</h3>
          <ul>{(reports.get(null) || []).filter(showBranch).map(branch)}</ul>
          {departmentId && visible.size === 0 && <p>No employees in this department.</p>}
          {unattached.some(inDepartment) && <><h3>Reporting relationship unavailable</h3>
            <ul>{unattached.filter(inDepartment).map(employee => <li key={employee._id}>{person(employee)}</li>)}</ul></>}
        </>}
      </div>
    </div>
    <details>
      <summary>Department directory</summary>
      {departments.map(department => <details key={department._id}>
        <summary>{department.name}</summary>
        <p>{department.responsibilities}</p>
        <ul className="operations__crew-list">{employees.filter(employee => employee.departmentId === department._id)
          .map(employee => <li key={employee._id}>{person(employee)}</li>)}</ul>
      </details>)}
    </details>
  </>;
}
