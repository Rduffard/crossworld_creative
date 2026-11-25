export const groups = [
  ["Studio", [["headquarters", "Headquarters"], ["command", "Command Center"], ["office", "Office"], ["workflow", "Workflow"], ["workforce", "Workforce"], ["communications", "Communications"]]],
  ["Production", [["projects", "Projects"], ["objectives", "Objectives"], ["reports", "Reports"], ["art", "Art Department"], ["artifacts", "Artifacts"], ["quality", "Quality"], ["references", "References"], ["knowledge", "Knowledge"]]],
  ["Operations", [["approvals", "Approvals"], ["infrastructure", "Infrastructure"], ["schedules", "Schedules"], ["engineering", "Engineering"], ["finance", "Finance"], ["activity", "Activity"], ["settings", "Settings"], ["help", "Help"]]],
];

export const workspaces = groups.flatMap(([, entries]) => entries);

export const profileNames = {
  "read-only": "Read-only inspection", development: "Development repository editing",
  workshop: "Workshop editing", scoped: "Scoped editing across drives", "full-access": "Full Access",
};
export const workspaceNames = { development: "C: · Development", workshop: "D: · Art Workshop" };
