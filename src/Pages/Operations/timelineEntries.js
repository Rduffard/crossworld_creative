import { eventCategory, isAgentMessage } from "./executionEvents.js";

export function turnActor(turn) {
  const role = turn.assignedRole || turn.workerRole;
  return turn.conversationActor?.name || turn.assigneeName || turn.reviewerName || turn.studioActor?.name ||
    (turn.studioTools ? "First Mate" : role && role !== "direct" ? role.replaceAll("-", " ") : "Codex");
}

const idSuffix = / · [\w:-]+$/;
const terminal = new Set(["failed", "cancelled", "interrupted"]);
const time = value => Date.parse(value) || 0;

export function conversationTimeline(turns) {
  const ordered = turns.flatMap((turn, turnIndex) => {
    const actor = turnActor(turn);
    let chronology = time(turn.createdAt);
    const items = [];
    function add(offset, type, fields) {
      chronology = Math.max(chronology, time(fields.at));
      items.push({ ...fields, actor, type, key: turn._id + ":" + offset, chronology, turnIndex, offset });
    }
    add(-1, "owner", { at: turn.createdAt, text: turn.prompt, media: turn.mediaInputs });
    const steering = new Map();
    for (const instruction of turn.steeringHistory || []) {
      const offset = instruction.eventOffset;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > turn.events.length) continue;
      if (!steering.has(offset)) steering.set(offset, []);
      steering.get(offset).push(instruction);
    }
    function addSteering(offset) {
      for (const instruction of steering.get(offset) || []) {
        add(offset - 0.5, "steer", { at: instruction.at, text: instruction.text });
        items.at(-1).key = turn._id + ":steer:" + instruction.id;
      }
    }
    turn.events.forEach((event, index) => {
      addSteering(index);
      const type = isAgentMessage(event) ? "commentary" : event.view === "response" ? "response" :
        /error|fail|interrupt|warning/i.test(event.label) ? "notice" : "activity";
      if (type === "activity" && !["activity", "execution"].includes(event.view)) return;
      const text = event.label === "Steering accepted" ? "The active execution accepted the steering instruction." : event.text;
      add(index, type, { ...event, text });
    });
    addSteering(turn.events.length);
    if (turn.events.length >= (turn.eventCount ?? turn.events.length)) {
      if (turn.mediaOutputs?.length) add(turn.events.length, "artifacts", { media: turn.mediaOutputs, at: turn.finishedAt });
      if (terminal.has(turn.status) && !(turn.error && items.some(item => item.type === "notice" && item.text === turn.error))) {
        add(turn.events.length + 1, "notice", { label: "Execution " + turn.status, text: turn.error, at: turn.finishedAt });
      }
    }
    return items;
  }).sort((a, b) => a.chronology - b.chronology || a.turnIndex - b.turnIndex || a.offset - b.offset);
  const compact = [];
  for (const item of ordered) {
    const last = compact.at(-1);
    if (last?.turnIndex === item.turnIndex && last.type === item.type) {
      if (item.type === "activity") {
        last.events.push(item);
        continue;
      }
      if (item.type === "response" || (item.type === "commentary" && item.messageId && item.messageId === last.messageId)) {
        last.text += item.text;
        continue;
      }
    }
    compact.push(item.type === "activity" ? { ...item, events: [item] } : item);
  }
  return compact;
}

export function activityDescription(event) {
  const category = eventCategory(event);
  const label = event.label.replace(idSuffix, "");
  if (category === "Commands" && event.label === "Command started") {
    if (/\b(?:rg|Get-Content|git\s+(?:status|show|diff|log))\b/i.test(event.text)) return "Inspected project files";
    if (/\b(?:npm(?:\.cmd)?\s+(?:run\s+)?test|pytest|node\s+--test)\b/i.test(event.text)) return "Ran tests";
    return "Started a command";
  }
  if (category === "Command output") return "Command output";
  if (category === "File changes") return "File changes reported";
  return label;
}
