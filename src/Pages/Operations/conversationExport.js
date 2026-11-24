import { agentMessages } from "./executionEvents.js";

export async function readTurn(api, id, includeActivity = false) {
  const endpoint = "/jobs/" + id;
  const first = await api(endpoint);
  const eventCount = first.eventCount ?? first.events.length;
  const events = [...first.events];
  while (events.length < eventCount) {
    const page = await api(endpoint + "?compact=true&offset=" + events.length);
    if (!page.events.length) throw new Error("A committed turn page could not be loaded.");
    events.push(...page.events.slice(0, eventCount - events.length));
  }
  return {
    id, createdAt: first.createdAt, finishedAt: first.finishedAt, status: first.status,
    actor: first.conversationActor?.name || first.assigneeName || first.reviewerName || first.studioActor?.name ||
      (first.studioTools ? "First Mate" : "Codex"),
    prompt: first.prompt || "",
    answer: events.filter(event => event.view === "response").map(event => event.text).join(""),
    messages: agentMessages(events),
    attachments: [...(first.mediaInputs || []), ...(first.mediaOutputs || [])].map(({ name, mime }) => ({ name, mime })),
    ...(first.delegatedBy ? { delegatedFrom: first.delegatedBy.sourceTurnId, objectiveId: first.objectiveId } : {}),
    ...(includeActivity ? { activity: events.filter(event => ["activity", "execution"].includes(event.view)) } : {}),
  };
}

export async function conversationPage(api, sessionId, before) {
  const query = new URLSearchParams({ session: sessionId, compact: "true" });
  if (before) query.set("before", before);
  return api("/jobs?" + query);
}

export async function readConversation(api, sessionId, progress) {
  let before;
  const seen = new Set();
  const turns = [];
  for (;;) {
    const records = await conversationPage(api, sessionId, before);
    for (const record of records) {
      if (seen.has(record._id)) continue;
      seen.add(record._id);
      turns.push(record._id);
    }
    if (records.length < 50) break;
    const next = records.at(-1)._id;
    if (next === before) throw new Error("Conversation paging did not advance.");
    before = next;
  }
  if (!seen.has(sessionId)) turns.push(sessionId);
  const messages = [];
  const ordered = turns.reverse();
  for (let index = 0; index < ordered.length; index += 4) {
    const batch = await Promise.all(ordered.slice(index, index + 4).map(id => readTurn(api, id)));
    messages.push(...batch);
    progress?.(messages.length);
  }
  return messages;
}

export function redactExport(value) {
  return value
    .replace(/\bBearer[ \t]+[\w.~/+=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:github_pat_|gh[pousr]_|sk-)[\w-]+/g, "[redacted]")
    .replace(/\b[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\.[a-f\d]{64}\b/gi, "[redacted]")
    .replace(/\b(?:token|password|api[_ -]?key|secret)\s*[:=]\s*[^\s]+/gi, "[redacted]");
}

export function conversationMarkdown(turns) {
  return turns.map(turn => [
    `## Owner${turn.createdAt ? " · " + turn.createdAt : ""}`, turn.prompt,
    ...(turn.messages || []).flatMap(event => [
      `### ${turn.actor} · ${event.label}${event.at ? " · " + event.at : ""}`, event.text,
    ]),
    `## ${turn.actor}${turn.finishedAt ? " · " + turn.finishedAt : ""}`, turn.answer || `Status: ${turn.status}`,
    turn.attachments.length ? "Attachments: " + turn.attachments.map(({ name }) => name || "Attachment").join(", ") : "",
    turn.delegatedFrom ? "First Mate handoff: " + turn.delegatedFrom + ". Objective: " + turn.objectiveId : "",
  ].filter(Boolean).join("\n\n")).join("\n\n---\n\n");
}

export function downloadText(name, type, contents) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
