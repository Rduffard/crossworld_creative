import { useEffect, useRef, useState } from "react";
import { profileNames } from "./workspaces";
import WorkforcePolicy from "./WorkforcePolicy";
import OrganizationChart from "./OrganizationChart";
import CrewPortrait from "./CrewPortrait";
import { employeeActivity } from "./crewActivity";
import "./WorkforceDirectory.css";

const roles = {
  worker: "Worker", lead: "Department lead", "first-mate": "First Mate", "art-director": "Art Director", qa: "Quality assurance", air: "AIR",
};

const identityFields = [
  ["background", "Background", 1200], ["temperament", "Temperament", 300],
  ["communication", "Communication style", 600], ["standards", "Professional standards", 1200],
  ["terminology", "Preferred terminology", 400],
];

function EmployeeForm({ employee, departments, identityEnabled, save, pending }) {
  const [role, setRole] = useState(employee?.role || "worker");
  const reportsToOwner = role === "air" || role === "first-mate";
  return <form onSubmit={(event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.departmentId ||= "";
    if (identityEnabled) {
      body.identity = Object.fromEntries(identityFields.map(([key]) => [key, body["identity-" + key]]));
      for (const [key] of identityFields) delete body["identity-" + key];
    }
    if (employee) body.revision = employee.revision;
    save("/employees" + (employee ? "/" + employee._id : ""), body, employee ? "PUT" : "POST");
  }}>
    <label>Name <input name="name" maxLength={100} defaultValue={employee?.name} required /></label>
    <label>Role <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
      {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {reportsToOwner ? <p>Reports directly to the owner.</p> : <label>Department
      <select name="departmentId" defaultValue={employee?.departmentId || ""}>
        <option value="">Direct report to owner</option>
        {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
      </select>
    </label>}
    <label>Workspace preference <select name="workspace" defaultValue={employee?.workspace || "development"}>
      <option value="development">Development</option><option value="workshop">Workshop</option>
    </select></label>
    <label>Administrative status <select name="status" defaultValue={employee?.status || "available"}>
      <option value="available">Available</option><option value="paused">Paused</option><option value="retired">Retired</option>
    </select></label>
    <label>Responsibilities <textarea name="responsibilities" maxLength={2000} defaultValue={employee?.responsibilities} required /></label>
    <label>Instructions <textarea name="instructions" maxLength={6000} defaultValue={employee?.instructions} /></label>
    {identityEnabled && <details>
      <summary>Identity and communication</summary>
      {identityFields.map(([key, label, limit]) => <label key={key}>{label}
        <textarea name={"identity-" + key} maxLength={limit} defaultValue={employee?.identity?.[key]} />
      </label>)}
    </details>}
    <button type="submit" disabled={pending}>{employee ? "Save employee" : "Add employee"}</button>
  </form>;
}

function ReportingForm({ employee, employees, pending, save }) {
  const current = employee.supervisorId || "";
  const byId = new Map(employees.map(entry => [entry._id, entry]));
  const valid = employees.filter(entry => {
    if (["first-mate", "air"].includes(employee.role)) return false;
    const visited = new Set([employee._id]);
    for (let id = entry._id; id; id = byId.get(id).supervisorId) {
      const supervisor = byId.get(id);
      if (!supervisor || supervisor.status === "retired" || visited.has(id)) return false;
      visited.add(id);
    }
    return true;
  });
  const name = id => byId.get(id)?.name || (id ? "Former employee" : "Owner");
  return <details>
    <summary>Reporting relationship</summary>
    <form onSubmit={event => {
      event.preventDefault();
      const next = new FormData(event.currentTarget).get("supervisor");
      if (next === current || !window.confirm("Change who supervises " + employee.name + "?")) return;
      save("/employees/" + employee._id + "/supervisor", { supervisorId: next || null, revision: employee.revision }, "PATCH");
    }}>
      <label>Reports to <select name="supervisor" defaultValue={current}>
        <option value="">Owner</option>
        {current && !valid.some(entry => entry._id === current) && <option value={current}>{name(current)}</option>}
        {valid.map(entry => <option key={entry._id} value={entry._id}>{entry.name}</option>)}
      </select></label>
      <button type="submit" disabled={pending}>Change supervisor</button>
    </form>
    {employee.reportingChanges?.length > 0 && <ul className="operations__feed">
      {[...employee.reportingChanges].reverse().map((entry, index) => <li key={entry.at + "/" + index}>
        <span>{name(entry.from)} to {name(entry.to)}</span><small>{new Date(entry.at).toLocaleString()}</small>
      </li>)}
    </ul>}
  </details>;
}

function WorkforceDirectory({ departments, employees, observedRuns, positions, selection, select }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const departmentNames = new Map(departments.map(department => [department._id, department.name]));
  const positionNames = new Map(positions.map(position => [position.key, position.name]));
  const matching = employees.map(employee => ({
    employee,
    position: positionNames.get(employee.role) || roles[employee.role] || employee.role,
    department: departmentNames.get(employee.departmentId) || "No department",
  })).filter(({ employee, position, department }) =>
    (!status || employee.status === status) &&
    [employee.name, position, department].some(value => value.toLocaleLowerCase().includes(query)));

  return <section className="operations__workforce-directory" aria-label="Workforce directory">
    <div className="operations__workforce-directory-filters">
      <label htmlFor="workforce-search">Find employees</label>
      <input id="workforce-search" type="search" value={search} placeholder="Name, position, or department"
        onChange={event => setSearch(event.target.value)} />
      <label htmlFor="workforce-directory-status">Profile status</label>
      <select id="workforce-directory-status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        <option value="available">Available</option>
        <option value="paused">Paused</option>
        <option value="retired">Retired</option>
      </select>
    </div>
    <p role="status">{matching.length
      ? `${matching.length} of ${employees.length} employees`
      : "No employees match these filters."}</p>
    {matching.length > 0 && <ul className="operations__crew-list">
      {matching.map(({ employee, position, department }) => {
        const activity = employeeActivity(employee, observedRuns);
        return <li key={employee._id}>
          <button type="button" aria-pressed={selection === employee._id}
            onClick={event => select(employee._id, event.currentTarget)}>
            <CrewPortrait employee={employee} state={activity.state} />
            <span><strong>{employee.name}</strong><small>{position} · {department}</small>
              <small>{activity.label}</small></span>
          </button>
        </li>;
      })}
    </ul>}
  </section>;
}

export default function Workforce({ api, openJob, openRecord, openWorkflow, messageEmployee, initialId }) {
  const [directory, setDirectory] = useState(null);
  const [editor, setEditor] = useState(null);
  const selection = editor || initialId;
  const profileHeading = useRef(null);
  const chartHeading = useRef(null);
  const chartTrigger = useRef(null);
  const focusProfile = useRef(false);

  function selectEmployee(id, focus = "mobile") {
    focusProfile.current = focus;
    if (selection === id && !editor) {
      if (focus === "always" || window.matchMedia("(max-width: 768px)").matches) profileHeading.current?.focus();
      focusProfile.current = false;
    }
    setEditor(null);
    openRecord("employee", id);
  }
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [version, setVersion] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [view, setView] = useState("chart");

  useEffect(() => {
    let current = true;
    let timer;
    async function refresh() {
      try {
        const result = await api("/workforce");
        if (current) {
          setDirectory(result);
          setRefreshError("");
        }
      } catch (failure) {
        if (current) setRefreshError(failure.message);
      }
      if (current) timer = setTimeout(refresh, document.hidden ? 30_000 : 10_000);
    }
    refresh();
    return () => { current = false; clearTimeout(timer); };
  }, [api, version]);

  useEffect(() => {
    if (!focusProfile.current || !profileHeading.current) return;
    const focus = focusProfile.current;
    focusProfile.current = false;
    if (focus === "always" || window.matchMedia("(max-width: 768px)").matches) profileHeading.current.focus();
  }, [selection, directory]);

  async function save(path, body, method = "POST") {
    setPending(true);
    setError("");
    try {
      const created = await api("/workforce" + path, { method, body });
      if (path === "/employees") selectEmployee(created._id);
      if (path === "/departments") setEditor(null);
      setVersion((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) setVersion((value) => value + 1);
    } finally {
      setPending(false);
    }
  }

  if (!directory) return <p role={refreshError ? "alert" : "status"}>{refreshError || "Loading workforce…"}</p>;
  const { departments, employees, observedRuns = [], projectAssignments = [], roles: positions = [] } = directory;
  const employee = employees.find((entry) => entry._id === selection);
  const assignments = observedRuns.filter((run) => run.employeeId === employee?._id);
  const projects = projectAssignments.filter((assignment) => assignment.employeeId === employee?._id);
  const position = positions.find((entry) => entry.key === employee?.role);
  const supervisor = employees.find((entry) => entry._id === employee?.supervisorId);
  const department = departments.find((entry) => entry._id === employee?.departmentId);
  const directReports = employee ? employees.filter(entry => entry.supervisorId === employee._id) : [];
  const activity = employee ? employeeActivity(employee, observedRuns) : null;
  return <section className="operations__layout operations__knowledge operations__workforce" aria-label="Workforce">
    <section className="operations__panel">
      <h2 ref={chartHeading} tabIndex={-1}>Organization</h2>
      {refreshError && <p role="alert">Workforce updates unavailable. Showing the last successful refresh. {refreshError}</p>}
      <details onToggle={event => setPolicyOpen(event.currentTarget.open)}>
        <summary>Execution configuration</summary>
        {policyOpen && <WorkforcePolicy api={api} employees={employees} departments={departments} />}
      </details>
      <div className="operations__modes operations__workforce-view">
        <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")}>Reporting chart</button>
        <button type="button" aria-pressed={view === "directory"} onClick={() => setView("directory")}>Employee directory</button>
      </div>
      {view === "chart"
        ? <OrganizationChart departments={departments} employees={employees} observedRuns={observedRuns}
          selection={selection} select={(id, trigger) => {
            chartTrigger.current = trigger;
            selectEmployee(id);
          }} />
        : <WorkforceDirectory departments={departments} employees={employees} positions={positions} observedRuns={observedRuns}
          selection={selection} select={(id, trigger) => {
            chartTrigger.current = trigger;
            selectEmployee(id, "always");
          }} />}
      <div className="operations__modes">
        <button type="button" onClick={() => setEditor("employee")}>Add employee</button>
        <button type="button" onClick={() => setEditor("department")}>Add department</button>
      </div>
    </section>
    <section className="operations__panel">
      <h2 ref={profileHeading} tabIndex={-1}>{employee?.name || (selection === "department" ? "Add department" : "Employee profile")}</h2>
      {employee && <button type="button" className="operations__workforce-return" onClick={() => {
        const target = chartTrigger.current;
        target?.focus();
        if (!target || document.activeElement !== target) chartHeading.current?.focus();
      }}>Back to organization</button>}
      {error && <p role="alert">{error}</p>}
      {employee && <div className="operations__profile-identity">
        <CrewPortrait employee={employee} state={activity.state} /><span>{activity.label}</span>
      </div>}
      {employee && <p><strong>{position?.name || roles[employee.role] || employee.role}</strong>
        {" · Reports to "}{supervisor
          ? <button className="operations__source" type="button" onClick={() => selectEmployee(supervisor._id)}>{supervisor.name}</button>
          : employee.supervisorId ? "Unavailable" : "Owner"}</p>}
      {department && <p>Department · {department.name}</p>}
      {directReports.length > 0 && <details>
        <summary>{directReports.length} direct {directReports.length === 1 ? "report" : "reports"}</summary>
        <ul className="operations__crew-list">{directReports.map(report => <li key={report._id}>
          <button type="button" onClick={() => selectEmployee(report._id)}>{report.name}</button>
        </li>)}</ul>
      </details>}
      {employee?.status === "available" && <button type="button" onClick={() => messageEmployee(employee)}>Message employee</button>}
      {employee && <p>{employee.responsibilities}</p>}
      {selection === "employee" && <EmployeeForm key="new" departments={departments}
        identityEnabled={directory.capabilities?.employeeIdentity === true} save={save} pending={pending} />}
      {employee && <details key={employee._id}>
        <summary>Edit employee profile and reporting</summary>
        <EmployeeForm key={employee.revision} employee={employee} departments={departments}
          identityEnabled={directory.capabilities?.employeeIdentity === true} save={save} pending={pending} />
        {directory.capabilities?.reportingChanges === true && employee.status !== "retired" &&
          !["first-mate", "air"].includes(employee.role) && <ReportingForm key={"reporting-" + employee.revision}
            employee={employee} employees={employees} pending={pending} save={save} />}
      </details>}
      {employee && <section>
        <button type="button" onClick={() => openWorkflow(employee._id)}>View employee workflow</button>
        {projects.length > 0 && <>
          <h3>Project responsibilities</h3>
          <ul className="operations__feed">{projects.map((assignment) => <li key={assignment._id}>
            {openRecord ? <>
              <button className="operations__source" type="button" onClick={() => openRecord("project", assignment.projectId)}>{assignment.projectName}</button>
              <button className="operations__source" type="button" onClick={() => openRecord("objective", assignment.objectiveId)}>Open assigned objective</button>
            </> : <strong>{assignment.projectName}</strong>}
            <small>{assignment.status}</small>
          </li>)}</ul>
        </>}
        <h3>Recent employee executions</h3>
        {assignments.length === 0 && <p>No recent turns recorded for {employee.name}.</p>}
        <ul className="operations__feed">{assignments.map((run) => <li key={run._id}>
          <button type="button" onClick={() => openJob(run._id, "Execution")}>{run.title || "Open execution"}</button>
          <small>{run.status}{run.startedAt && ` · Started ${new Date(run.startedAt).toLocaleString()}`}
            {run.finishedAt && ` · Finished ${new Date(run.finishedAt).toLocaleString()}`}</small>
          <small>Requested {run.model || "model unknown"} · {run.effort || "reasoning unknown"} · {profileNames[run.profile] || "Permission profile unknown"}</small>
          {run.delegatedBy?.sourceTurnId && <button type="button" className="operations__source"
            onClick={() => openJob(run.delegatedBy.sourceTurnId, "Execution")}>Open initiating execution</button>}
          {run.status === "completed" && run.objectiveId && !run.parentId && <button type="button" className="operations__source"
            onClick={() => openRecord("report", run._id)}>Open report</button>}
        </li>)}</ul>
      </section>}
      {selection === "department" && <form onSubmit={(event) => {
        event.preventDefault();
        save("/departments", Object.fromEntries(new FormData(event.currentTarget)));
      }}>
        <label>Name <input name="name" required maxLength={100} /></label>
        <label>Responsibilities <textarea name="responsibilities" required maxLength={2000} /></label>
        <button type="submit" disabled={pending}>Add department</button>
      </form>}
      {!selection && <p>Select an employee to inspect their profile.</p>}
    </section>
  </section>;
}
