import { useEffect, useState } from "react";
import { profileNames } from "./workspaces";
import WorkforcePolicy from "./WorkforcePolicy";
import OrganizationChart from "./OrganizationChart";
import CrewPortrait from "./CrewPortrait";
import { employeeActivity } from "./crewActivity";

const roles = {
  worker: "Worker", lead: "Department lead", "first-mate": "First Mate", "art-director": "Art Director", qa: "Quality assurance", air: "AIR",
};

function EmployeeForm({ employee, departments, save, pending }) {
  const [role, setRole] = useState(employee?.role || "worker");
  const reportsToOwner = role === "air" || role === "first-mate";
  return <form onSubmit={(event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.departmentId ||= "";
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
    <button type="submit" disabled={pending}>{employee ? "Save employee" : "Add employee"}</button>
  </form>;
}

export default function Workforce({ api, openJob, openRecord, openWorkflow, messageEmployee, initialId }) {
  const [directory, setDirectory] = useState(null);
  const [editor, setEditor] = useState(null);
  const selection = editor || initialId;

  function selectEmployee(id) {
    setEditor(null);
    openRecord("employee", id);
  }
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    let current = true;
    api("/workforce").then((result) => { if (current) setDirectory(result); })
      .catch((failure) => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [api, version]);

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

  if (!directory) return <p role={error ? "alert" : "status"}>{error || "Loading workforce…"}</p>;
  const { departments, employees, observedRuns = [], projectAssignments = [], roles: positions = [] } = directory;
  const employee = employees.find((entry) => entry._id === selection);
  const assignments = observedRuns.filter((run) => run.employeeId === employee?._id);
  const projects = projectAssignments.filter((assignment) => assignment.employeeId === employee?._id);
  const position = positions.find((entry) => entry.key === employee?.role);
  const supervisor = employees.find((entry) => entry._id === employee?.supervisorId);
  const department = departments.find((entry) => entry._id === employee?.departmentId);
  const directReports = employee ? employees.filter(entry => entry.supervisorId === employee._id) : [];
  const state = employee ? employeeActivity(employee, observedRuns, projectAssignments).state : null;
  return <section className="operations__layout operations__knowledge operations__workforce" aria-label="Workforce">
    <section className="operations__panel">
      <h2>Organization</h2>
      <details onToggle={event => setPolicyOpen(event.currentTarget.open)}>
        <summary>Execution configuration</summary>
        {policyOpen && <WorkforcePolicy api={api} employees={employees} departments={departments} />}
      </details>
      <OrganizationChart departments={departments} employees={employees} observedRuns={observedRuns}
        projectAssignments={projectAssignments} selection={selection} select={selectEmployee} />
      <div className="operations__modes">
        <button type="button" onClick={() => setEditor("employee")}>Add employee</button>
        <button type="button" onClick={() => setEditor("department")}>Add department</button>
      </div>
    </section>
    <section className="operations__panel">
      <h2>{employee?.name || (selection === "department" ? "Add department" : "Employee profile")}</h2>
      {error && <p role="alert">{error}</p>}
      {employee && <div className="operations__profile-identity">
        <CrewPortrait employee={employee} state={state} /><span>{state}</span>
      </div>}
      {position && <p><strong>{position.name}</strong>{supervisor && <> · Reports to{" "}
        <button className="operations__source" type="button" onClick={() => selectEmployee(supervisor._id)}>{supervisor.name}</button>
      </>}</p>}
      {department && <p>Department · {department.name}</p>}
      {directReports.length > 0 && <details>
        <summary>{directReports.length} direct {directReports.length === 1 ? "report" : "reports"}</summary>
        <ul className="operations__crew-list">{directReports.map(report => <li key={report._id}>
          <button type="button" onClick={() => selectEmployee(report._id)}>{report.name}</button>
        </li>)}</ul>
      </details>}
      {employee?.status === "available" && <button type="button" onClick={() => messageEmployee(employee)}>Message employee</button>}
      {(employee || selection === "employee") && <EmployeeForm key={employee ? employee._id + "/" + employee.revision : "new"}
        employee={employee} departments={departments} save={save} pending={pending} />}
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
