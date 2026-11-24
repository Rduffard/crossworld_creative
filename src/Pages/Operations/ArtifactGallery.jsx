import { useEffect, useState } from "react";
import { MediaLibrary, MediaPreview } from "./MediaAttachments";

const idPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/;
const states = {
  pending: "Pending review", approved: "Approved", "changes-requested": "Changes requested",
  rejected: "Rejected", archived: "Archived", superseded: "Superseded",
};

function ArtifactInspector({ api, id, close }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!idPattern.test(id)) return;
    let active = true;
    api("/media/" + id).then(data => { if (active) setItem(data); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [api, id, refresh]);

  async function review(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError("");
    setStatus("");
    try {
      const updated = await api("/media/" + id + "/review", {
        method: "PATCH", body: { ...data, revision: item.review.revision },
      });
      setItem(updated);
      setStatus("Review recorded.");
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) setRefresh(value => value + 1);
    } finally {
      setPending(false);
    }
  }

  return <section className="operations__panel" aria-label="Artifact inspector">
    <button type="button" onClick={close}>Back to artifact library</button>
    {!idPattern.test(id) ? <p role="alert">Invalid artifact reference.</p> : <>
      {error && <p role="alert">{error}</p>}
      {!item && !error && <p role="status">Loading artifact…</p>}
      {item && <>
        <h2>{item.name}</h2>
        <p>{item.mime || "Type unavailable"} · {Number.isSafeInteger(item.size) ? item.size.toLocaleString() + " bytes" : "Size unavailable"}</p>
        <p>Recorded <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></p>
        {item.jobId && <a href={"/operations?workspace=command&job=" + encodeURIComponent(item.jobId)}>Open source execution</a>}
        {item.state === "ready" ? <MediaPreview key={id} id={id} name={item.name} inspect />
          : <p>This upload has not finished.</p>}
        {item.review ? <>
          <h3>Candidate review</h3>
          <p>{states[item.review.state]} · Production publication requires separate approval.</p>
          {status && <p role="status">{status}</p>}
          <form key={item.review.revision} onSubmit={review}>
            <label>Decision <select name="state" defaultValue="" required>
              <option value="" disabled>Select a decision</option>
              {Object.entries(states).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Feedback <textarea name="feedback" maxLength={2000} /></label>
            <button type="submit" disabled={pending}>Record review decision</button>
          </form>
          {item.review.history?.length > 0 && <details>
            <summary>Review history</summary>
            <ul className="operations__feed">{[...item.review.history].reverse().map(entry => <li key={entry.revision}>
              <strong>{states[entry.state]}</strong><small>Owner · {new Date(entry.at).toLocaleString()}</small>
              {entry.feedback && <p className="operations__knowledge-text">{entry.feedback}</p>}
            </li>)}</ul>
          </details>}
        </> : <p>Review decisions require the updated media API.</p>}
      </>}
    </>}
  </section>;
}

export default function ArtifactGallery({ api, artifactId, openArtifact }) {
  if (artifactId) return <ArtifactInspector key={artifactId} api={api} id={artifactId} close={() => openArtifact(null)} />;
  return <section className="operations__panel" aria-label="Artifact library">
    <h2>Review library</h2>
    <p>Files are served through the private media relay. A preview may be unavailable while its device is offline.</p>
    <MediaLibrary api={api} openArtifact={openArtifact} />
  </section>;
}
