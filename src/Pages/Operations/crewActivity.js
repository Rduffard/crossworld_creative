const roles = {
  worker: "Worker", lead: "Department lead", "first-mate": "First Mate",
  "art-director": "Art Director", qa: "Quality assurance", air: "AIR",
};
const activeStates = ["running", "cancelling", "queued", "waiting", "scheduled"];

export function roleLabel(role) {
  return roles[role] || role;
}

const executionLabels = {
  running: "Running", cancelling: "Cancelling", queued: "Queued", waiting: "Waiting", scheduled: "Scheduled",
};
const availabilityLabels = { available: "No active turn reported", paused: "Profile paused", retired: "Profile retired" };

export function employeeActivity(employee, runs) {
  const active = runs.filter(run => run.employeeId === employee._id && activeStates.includes(run.status));
  const current = active.find(run => ["running", "cancelling"].includes(run.status)) || active[0];
  return {
    runs: active,
    state: current?.status || employee.status,
    label: current ? executionLabels[current.status] : availabilityLabels[employee.status],
  };
}
