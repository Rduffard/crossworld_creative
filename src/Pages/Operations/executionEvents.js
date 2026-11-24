export function isAgentMessage(event) {
  return event.view === "activity" && ["Agent commentary", "Agent message"].includes(event.label);
}

export function agentMessages(events) {
  const messages = [];
  for (const event of events) {
    if (!isAgentMessage(event)) continue;
    const previous = messages.at(-1);
    if (event.messageId && previous?.messageId === event.messageId) previous.text += event.text;
    else messages.push({ ...event });
  }
  return messages;
}

export function eventCategory(event) {
  const label = event.label;
  if (isAgentMessage(event)) return "Agent updates";
  if (/^(?:Command output|Output) · /.test(label)) return "Command output";
  if (/warning/i.test(label)) return "Warnings";
  if (/error|failed/i.test(label)) return "Errors";
  if (/^Test/i.test(label)) return "Test results";
  if (/^Command/i.test(label)) return "Commands";
  if (/^File change/i.test(label)) return "File changes";
  if (/delegat|handoff/i.test(label) || event.text.startsWith("collabAgentToolCall ")) return "Delegation";
  if (/^Tool/i.test(label)) return "Tool activity";
  return "Lifecycle";
}

export function activityEntries(events) {
  const entries = [];
  const outputs = new Map();
  events.forEach((event, index) => {
    if (!["activity", "execution"].includes(event.view)) return;
    const category = eventCategory(event);
    const stream = category === "Command output" ? event.label : isAgentMessage(event) ? event.messageId : null;
    const output = stream && outputs.get(stream);
    if (output) {
      output.text += event.text;
      output.at = event.at;
      output.order = index;
      return;
    }
    const entry = { ...event, category, index, order: index };
    entries.push(entry);
    if (stream) outputs.set(stream, entry);
  });
  return entries.sort((a, b) => b.order - a.order);
}
