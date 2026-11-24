const roles = {
  worker: "Worker", lead: "Department lead", "first-mate": "First Mate",
  "art-director": "Art Director", qa: "Quality assurance", air: "AIR",
};
const activeStates = ["running", "cancelling", "queued", "waiting", "scheduled"];

export function roleLabel(role) {
  return roles[role] || role;
}

export function employeeActivity(employee, runs, assignments) {
  const active = runs.filter(run => run.employeeId === employee._id && activeStates.includes(run.status));
  const current = active.find(run => ["running", "cancelling"].includes(run.status)) || active[0];
  const assigned = assignments.some(entry => entry.employeeId === employee._id && entry.status === "assigned");
  return { runs: active, state: current?.status || (employee.status === "available" && assigned ? "assigned" : employee.status) };
}
