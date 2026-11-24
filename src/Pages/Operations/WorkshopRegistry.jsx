import { useEffect, useState } from "react";

const statuses = ["research_candidate", "acquired", "inspected", "experimentally_tested", "validated", "rejected"];
const readable = (value) => value.replaceAll("_", " ");
const metadata = [
  ["creator", "Creator"], ["format", "Format"], ["license", "License"],
  ["commercial_use", "Commercial use"], ["modification", "Modification"], ["redistribution", "Redistribution"],
  ["ml_training", "Training"], ["localPath", "Workshop path"], ["reviewPath", "Review"],
  ["licenseEvidence", "License evidence"], ["integrityManifest", "Integrity manifest"], ["downloadUrl", "Download reference"], ["metrics", "Metrics"], ["sha256", "SHA-256"],
];

const registryFields = [
  "id", "status", "creator", "format", "license", "purpose", "reason", "commercial_use", "modification",
  "redistribution", "ml_training", "original_url", "download_url", "local_path", "license_evidence",
  "review_path", "metrics", "integrity_manifest", "sha256",
];

function registryMetadata(payload) {
  if (payload?.schema_version !== 1 || !Array.isArray(payload.resources) || payload.resources.length > 200) {
    throw new Error("Select a Workshop schema version 1 resource registry.");
  }
  const urlFields = ["original_url", "download_url", "license_evidence"];
  const resources = payload.resources.map((entry) => Object.fromEntries(registryFields.flatMap((field) => {
    const value = entry?.[field];
    if (typeof value !== "string") return [];
    if (!urlFields.includes(field) || !/^https?:\/\//i.test(value.trim())) return [[field, value]];
    try {
      const url = new URL(value);
      if (url.username || url.password) return [];
      url.search = "";
      url.hash = "";
      return [[field, url.href]];
    } catch {
      return [];
    }
  })));
  return { schema_version: 1, resources };
}

export default function WorkshopRegistry({ api }) {
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let current = true;
    api("/workshop-registry?" + filter).then((result) => {
      if (current) { setSnapshot(result); setLoadError(""); }
    }).catch((error) => { if (current) setLoadError(error.message); });
    return () => { current = false; };
  }, [api, filter, version]);

  async function upload(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const file = form.elements.registry.files[0];
    if (!file || file.size > 64 * 1024) {
      setFeedback({ error: "Choose a Workshop registry JSON file up to 64 KiB." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      let body;
      try { body = JSON.parse((await file.text()).replace(/^\uFEFF/, "")); }
      catch { throw new Error("The selected file contains invalid JSON."); }
      const { total } = await api("/workshop-registry", { method: "POST", body: registryMetadata(body) });
      form.reset();
      setFeedback({ message: "Registry saved with " + total + " resource records." });
      setVersion((value) => value + 1);
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      setBusy(false);
    }
  }

  function search(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget);
    if (!status) query.delete("status");
    setFilter(new URLSearchParams(query).toString());
  }

  return <section aria-label="Workshop resource registry">
    <form onSubmit={upload}>
      <label>Workshop registry JSON <input type="file" name="registry" accept=".json,application/json" required /></label>
      <button type="submit" disabled={busy}>{busy ? "Importing…" : "Import registry metadata"}</button>
      {feedback?.error && <p role="alert">{feedback.error}</p>}
      {feedback?.message && <p role="status">{feedback.message}</p>}
    </form>
    {loadError && <p role="alert">{loadError}</p>}
    {!snapshot && !loadError && <p role="status">Loading registry…</p>}
    {snapshot?.importedAt && <>
      <p>Imported <time dateTime={snapshot.importedAt}>{new Date(snapshot.importedAt).toLocaleString()}</time> · {snapshot.total} resources</p>
      <form className="operations__selectors" onSubmit={search}>
        <label>Search registry <input name="q" type="search" maxLength={120} /></label>
        <label>Registry status <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{readable(value)}</option>)}
        </select></label>
        <button type="submit">Search registry</button>
      </form>
      {snapshot.entries.length === 0 && <p>No matching registry entries.</p>}
      <ul className="operations__feed">{snapshot.entries.map((entry) => <li key={entry.id}>
        <details>
          <summary>{entry.id} · {readable(entry.status)}</summary>
          {entry.purpose && <p>{entry.purpose}</p>}
          {entry.reason && <p>{entry.reason}</p>}
          {entry.originalUrl && <p><a href={entry.originalUrl} target="_blank" rel="noreferrer">Original source</a></p>}
          <dl>{metadata.filter(([key]) => entry[key]).map(([key, label]) => <div key={key}>
            <dt>{label}</dt><dd>{entry[key]}</dd>
          </div>)}</dl>
        </details>
      </li>)}</ul>
    </>}
    {snapshot && !snapshot.importedAt && <p>No workshop registry imported.</p>}
  </section>;
}
