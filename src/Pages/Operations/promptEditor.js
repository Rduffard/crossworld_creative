export const PROMPT_LIMIT = 120_000;
export const LEGACY_PROMPT_LIMIT = 12_000;
export const ATTACHMENT_BYTES = 480_000;
const draftKey = "cw_operations_prompt_draft";

function keyFor(session) {
  return session ? `${draftKey}:${session}` : draftKey;
}

export function loadPromptDraft(storage, session) {
  return storage.getItem(keyFor(session)) ?? "";
}

export function savePromptDraft(storage, prompt, previous, session) {
  if (prompt) storage.setItem(keyFor(session), prompt);
  else if (loadPromptDraft(storage, session) === previous) storage.removeItem(keyFor(session));
}

export async function importPromptFile(file, prompt) {
  if (!/\.(?:md|markdown|txt)$/i.test(file.name)) {
    throw new Error("Choose a Markdown (.md or .markdown) or plain-text (.txt) file.");
  }
  if (file.size > ATTACHMENT_BYTES) {
    throw new Error("The attachment exceeds the 480,000-byte file limit.");
  }
  let contents;
  try {
    contents = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error("The attachment could not be read as UTF-8 text.");
  }
  if (!contents.trim() || contents.includes("\0")) {
    throw new Error("The attachment must contain readable text.");
  }
  const combined = prompt ? `${prompt}\n\n${contents}` : contents;
  if (combined.length > PROMPT_LIMIT) {
    throw new Error("The attachment and existing prompt together exceed 120,000 characters.");
  }
  return combined;
}
