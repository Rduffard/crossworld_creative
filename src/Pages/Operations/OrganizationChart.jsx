import { useState } from "react";
import CrewPortrait from "./CrewPortrait";
import { employeeActivity, roleLabel } from "./crewActivity";

export default function OrganizationChart({ departments, employees, observedRuns, projectAssignments, selection, select }) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(null);
  const [zoom, setZoom] = useState(100);
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

  function person(employee) {
    const state = employeeActivity(employee, observedRuns, projectAssignments).state;
    return <button className="operations__org-person" type="button" aria-pressed={selection === employee._id}
      onClick={() => select(employee._id)}>
      <CrewPortrait employee={employee} state={state} />
      <span><strong>{employee.name}</strong><small>{roleLabel(employee.role)} · {state}</small></span>
    </button>;
  }

  function branch(employee) {
    const children = reports.get(employee._id) || [];
    return <li key={employee._id}>{person(employee)}
      {children.length > 0 && <details open>
        <summary>{children.length} direct {children.length === 1 ? "report" : "reports"}</summary>
        <ul>{children.map(branch)}</ul>
      </details>}
    </li>;
  }

  const term = query.trim().toLocaleLowerCase();
  const matches = employees.filter(employee => [employee.name, roleLabel(employee.role)].some(value => value?.toLocaleLowerCase().includes(term)));
  return <>
    <label>Find an employee <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="operations__modes">
      <button type="button" disabled={!byId.has(selection)} onClick={() => { setFocus(selection); setQuery(""); }}>Focus selected</button>
      <button type="button" disabled={!focus} onClick={() => setFocus(null)}>Whole organization</button>
      <label>Chart scale <select value={zoom} onChange={event => setZoom(Number(event.target.value))}>
        <option value={100}>100%</option><option value={125}>125%</option><option value={150}>150%</option>
      </select></label>
    </div>
    <div className="operations__org-viewport" role="region" aria-label="Scrollable reporting chart" tabIndex={0}>
      <div className="operations__org-chart" style={{ minWidth: zoom + "%", fontSize: zoom + "%" }}>
        {term ? <>
          <p>{matches.length} matching employees</p>
          <ul>{matches.map(employee => <li key={employee._id}>{person(employee)}</li>)}</ul>
        </> : focus && byId.has(focus) ? <ul>{branch(byId.get(focus))}</ul> : <>
          <h3>Owner</h3>
          <ul>{(reports.get(null) || []).map(branch)}</ul>
          {!!unattached.length && <><h3>Reporting relationship unavailable</h3>
            <ul>{unattached.map(employee => <li key={employee._id}>{person(employee)}</li>)}</ul></>}
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
