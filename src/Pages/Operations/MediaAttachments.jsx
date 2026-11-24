import { useEffect, useRef, useState } from "react";
import { requestPrivateMedia } from "../../utils/api";
import "./MediaAttachments.css";

const imageTypes = ["image/png", "image/jpeg", "image/webp"];
const formats = [...imageTypes, "video/mp4", "video/quicktime", "video/webm"];
const accept = formats.join(",");
const mib = 1024 * 1024;
const gib = mib * 1024;
function storageSize(bytes) {
  if (bytes >= gib) return `${(bytes / gib).toFixed(1)} GiB`;
  if (bytes >= mib) return `${(bytes / mib).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} bytes`;
}

function mediaApi(api, path, options) {
  return api(`/media${path}`, options);
}

function Uploader({ api, hostId, canUpload, onBusy, onReady, imagesOnly, disabled }) {
  const mount = useRef(null);
  const current = useRef(null);
  const uploadAction = useRef(null);
  const [progress, setProgress] = useState(0);
  const [upload, setUpload] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const objectUrl = upload?.url;

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);
  useEffect(() => () => current.current?.abort(), []);

  async function send(task) {
    if (current.current || disabled || !hostId) return;
    const controller = new AbortController();
    current.current = controller;
    setBusy(true);
    onBusy?.(true);
    setError("");
    const target = { ...task };
    try {
      if (!target.id) {
        const { maxSize, chunkSize } = await mediaApi(api, "");
        if (target.file.size > maxSize) throw new Error("This file exceeds the upload size limit.");
        const record = await mediaApi(api, "", { method: "POST", body: {
          hostId, size: target.file.size, name: target.file.name,
        } });
        target.id = record._id;
        target.chunkSize = chunkSize;
        setUpload(target);
      }
      const { offset } = await mediaApi(api, `/${target.id}`);
      let position = offset;
      while (position < target.file.size) {
        controller.signal.throwIfAborted();
        const response = await requestPrivateMedia(`/${target.id}/chunks/${position}`, {
          method: "PUT", signal: controller.signal,
          body: target.file.slice(position, position + target.chunkSize),
        });
        const result = await response.json();
        if (!Number.isSafeInteger(result.offset) || result.offset <= position) throw new Error("The upload did not advance.");
        position = result.offset;
        setProgress(position / target.file.size);
      }
      controller.signal.throwIfAborted();
      const ready = await mediaApi(api, `/${target.id}/finalize`, { method: "POST", body: {} });
      controller.signal.throwIfAborted();
      onReady(ready);
      setUpload(null);
    } catch (failure) {
      if (controller.signal.aborted) {
        setError("Transfer paused. Retry to continue or discard the upload.");
      } else setError(failure.message);
    } finally {
      current.current = null;
      setBusy(false);
      onBusy?.(false);
    }
  }

  function select(file) {
    if (!file || upload || current.current || disabled || !hostId) return;
    if (!canUpload) { setError("The selected media device is unavailable."); return; }
    if (!(imagesOnly ? imageTypes : formats).includes(file.type) || file.size < 12 ||
        file.size > (imagesOnly ? 12 : 100) * mib) {
      setError(imagesOnly ? "Choose a PNG, JPEG, or WebP image up to 12 MiB." : "Choose a supported image or video up to 100 MiB.");
      return;
    }
    const task = { file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null };
    setProgress(0);
    setUpload(task);
    void send(task);
  }
  uploadAction.current = !disabled && !upload && canUpload ? select : null;
  useEffect(() => {
    const composer = imagesOnly && mount.current?.closest("form");
    if (!composer) return;
    function paste(event) {
      const file = [...(event.clipboardData?.files || [])].find((item) => imageTypes.includes(item.type));
      if (!file || !uploadAction.current) return;
      event.preventDefault();
      uploadAction.current(file);
    }
    composer.addEventListener("paste", paste);
    return () => composer.removeEventListener("paste", paste);
  }, [imagesOnly]);

  async function discard() {
    if (busy) return;
    try {
      if (upload.id) await mediaApi(api, `/${upload.id}`, { method: "DELETE" });
      setUpload(null);
      setError("");
    } catch (failure) { setError(failure.message); }
  }

  return <div ref={mount} className="operations-media__upload" onDragOver={(event) => {
    if (canUpload && !disabled && event.dataTransfer.types.includes("Files")) event.preventDefault();
  }} onDrop={(event) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    select(event.dataTransfer.files[0]);
  }}>
    {!upload && <label className="operations-media__choose">
      {imagesOnly ? "Attach image" : "Upload image or video"}
      <input type="file" accept={imagesOnly ? imageTypes.join(",") : accept} disabled={!canUpload || disabled}
        onChange={(event) => { select(event.target.files[0]); event.target.value = ""; }} />
    </label>}
    {upload && <div className="operations-media__transfer">
      {upload.url && <img alt="" src={upload.url} />}
      <span>{upload.file.name}</span>
      <progress aria-label="Upload progress" max={1} value={progress} />
      {busy ? <button type="button" onClick={() => current.current?.abort()}>Pause</button> : <>
        <button type="button" disabled={disabled || !canUpload} onClick={() => send(upload)}>Retry</button>
        <button type="button" onClick={discard}>Discard</button>
      </>}
    </div>}
    {error && <span role="alert">{error}</span>}
  </div>;
}

export function MediaComposer({ hostId, api, attachments, onChange, onBusy, disabled }) {
  const [devices, setDevices] = useState(null);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState(null);
  const [transferring, setTransferring] = useState(false);
  useEffect(() => {
    let ignore = false;
    if (hostId) mediaApi(api, "").then((response) => { if (!ignore) setDevices(response.hosts); })
      .catch((failure) => { if (!ignore && failure.status !== 404) setError(failure.message); });
    return () => { ignore = true; };
  }, [api, hostId]);

  const canUpload = !!devices?.some((item) => item._id === hostId && item.online);
  const selected = attachments.filter((item) => item.hostId === hostId);
  const available = choices?.filter((item) => item.hostId === hostId && item.state === "ready" &&
    imageTypes.includes(item.mime) && item.size <= 12 * mib && !selected.some((entry) => entry._id === item._id));
  async function list() {
    try {
      const { items, hosts } = await mediaApi(api, "");
      setDevices(hosts);
      setChoices(items);
      setError("");
    } catch (failure) { setError(failure.message); }
  }
  const full = selected.length >= 4;
  function reportTransfer(value) {
    setTransferring(value);
    onBusy?.(value);
  }
  return <div className="operations-media">
    <Uploader key={hostId} api={api} hostId={hostId} canUpload={canUpload} imagesOnly onBusy={reportTransfer} disabled={disabled || full}
      onReady={(item) => onChange([...attachments, item])} />
    <button type="button" disabled={disabled || transferring || full || !hostId} onClick={list}>Browse uploads</button>
    {available && <label>Reuse image <select disabled={disabled || transferring || full} value="" onChange={(event) => {
      const item = available.find((entry) => entry._id === event.target.value);
      if (item) onChange([...attachments, item]);
    }}>
      <option value="">{available.length ? "Select an uploaded image" : "No eligible uploads on this host"}</option>
      {available.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
    </select></label>}
    {error && <p role="alert">{error}</p>}
    {selected.length > 0 && <ul className="operations-media__items">{selected.map((item) => <li key={item._id}>
      <span>{item.name}</span>
      <button type="button" disabled={disabled || transferring} aria-label={`Remove ${item.name}`}
        onClick={() => onChange(attachments.filter((entry) => entry._id !== item._id))}>Remove</button>
    </li>)}</ul>}
  </div>;
}

export function MediaPreview({ id, name }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function open() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setLoading(true);
    try {
      const response = await requestPrivateMedia(`/${id}/content`, { signal: controller.signal });
      const data = await response.blob();
      controller.signal.throwIfAborted();
      if (!formats.includes(data.type)) throw new Error("This file cannot be previewed.");
      setPreview({ url: URL.createObjectURL(data), image: data.type.startsWith("image/") });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally { request.current = null; setLoading(false); }
  }

  return <figure className="operations-media__preview">
    {preview?.image && <img src={preview.url} alt={name || "Uploaded attachment"} />}
    {preview && !preview.image && <video controls playsInline src={preview.url} aria-label={name || "Uploaded video"} />}
    <figcaption>
      {!preview && !loading && <button type="button" onClick={open}>{name ? `Preview ${name}` : "Preview attached image"}</button>}
      {loading && <button type="button" onClick={() => request.current?.abort()}>Cancel preview loading</button>}
      {preview && <>
        {name && <span>{name}</span>}
        <button type="button" onClick={() => setPreview(null)}>Close preview</button>
      </>}
      {error && <p role="alert">{error}</p>}
    </figcaption>
  </figure>;
}

function FrameExtractor({ api, item, available, onReady }) {
  const [seconds, setSeconds] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <details>
    <summary>Extract a frame</summary>
    <label>Video time in seconds <input type="number" min="0" max="3600" step="0.001" value={seconds}
      onChange={(event) => setSeconds(event.target.value)} /></label>
    <button type="button" disabled={!available || busy || seconds === "" || Number(seconds) < 0 || Number(seconds) > 3600}
      onClick={async () => {
        setBusy(true);
        setMessage("");
        try {
          await mediaApi(api, `/${item._id}/frames`, { method: "POST", body: { atMs: Math.round(Number(seconds) * 1000) } });
          await onReady();
          setMessage("Frame saved to uploads.");
        } catch (failure) { setMessage(failure.message); }
        finally { setBusy(false); }
      }}>{busy ? "Extracting…" : "Save frame"}</button>
    {!available && <p>Frame extraction requires an online device with FFmpeg.</p>}
    {message && <p role="status">{message}</p>}
  </details>;
}

export function MediaLibrary({ api }) {
  const [records, setRecords] = useState(null);
  const [host, setHost] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  async function refresh(before) {
    try {
      const data = await mediaApi(api, before ? `?before=${encodeURIComponent(before)}` : "");
      setRecords((previous) => before ? { ...data, items: [...previous.items, ...data.items] } : data);
      setError("");
    } catch (failure) { setError(failure.message); }
  }
  useEffect(() => {
    let ignore = false;
    mediaApi(api, "").then((data) => { if (!ignore) setRecords(data); })
      .catch((failure) => { if (!ignore) setError(failure.message); });
    return () => { ignore = true; };
  }, [api]);
  const active = records?.hosts.find((item) => item._id === host) || records?.hosts.find((item) => item.online);
  const items = records?.items.filter((item) => item.state === "ready" && item.name.toLowerCase().includes(filter.toLowerCase()));
  return <section className="operations-media">
    <label>Storage device <select value={active?._id || ""} onChange={(event) => setHost(event.target.value)}>
      <option value="">Select device</option>
      {records?.hosts.map((item) => <option key={item._id} value={item._id}>{item.label || "Media device"} ({item.online ? "online" : "offline"})</option>)}
    </select></label>
    <button type="button" onClick={() => refresh()}>Refresh media</button>
    {active?.storage && <p className="operations-media__storage">
      {storageSize(active.storage.usedBytes)} stored of {storageSize(active.storage.quotaBytes)} ·{" "}
      {storageSize(active.storage.freeBytes)} free on device ·{" "}
      <time dateTime={new Date(active.storage.observedAt).toISOString()}>Observed {new Date(active.storage.observedAt).toLocaleString()}</time>
    </p>}
    <Uploader key={active?._id} api={api} hostId={active?._id} canUpload={!!active?.online}
      onReady={() => refresh()} />
    {error && <p role="alert">{error}</p>}
    {!active?.online && !error && <p>No media device is currently available.</p>}
    <label>Find an upload <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
    {items?.map((item) => <div className="operations-media__record" key={item._id}>
      <MediaPreview id={item._id} name={item.name} />
      {item.derivedFrom && <small>Requested offset {(item.derivedFrom.requestedOffsetMs / 1000).toFixed(3)} s · Derived video frame</small>}
      {item.mime?.startsWith("video/") && <FrameExtractor api={api} item={item}
        available={records.hosts.some((device) => device._id === item.hostId && device.online && device.videoFrames)}
        onReady={() => refresh()} />}
    </div>)}
    {records?.nextBefore && <button type="button" onClick={() => refresh(records.nextBefore)}>Load older uploads</button>}
  </section>;
}
