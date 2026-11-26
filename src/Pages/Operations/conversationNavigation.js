const firstMateKey = "cw_operations_first_mate_session";
export const executionIdPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

export function conversationTurn(turns) {
  return turns.find(turn => turn.status === "running" || turn.status === "cancelling") ||
    turns.find(turn => turn.status === "queued") || turns[0];
}

export function isFirstMateConversation(turn) {
  return !!turn?.studioTools && !turn.missionId && !turn.objectiveId && !turn.seriesId &&
    !turn.scheduledAt && !turn.conversationActor && !turn.delegatedBy;
}

export function firstMateSession(storage) {
  const session = storage.getItem(firstMateKey);
  return executionIdPattern.test(session || "") ? session : "";
}

export function saveFirstMateSession(storage, session) {
  if (session) storage.setItem(firstMateKey, session);
  else storage.removeItem(firstMateKey);
}

export function conversationLink(session) {
  return "/operations?" + new URLSearchParams({ workspace: "command", conversation: session });
}
