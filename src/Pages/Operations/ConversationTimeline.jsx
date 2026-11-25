import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { conversationPage, readExecutionTurn } from "./conversationExport";
import { activityDescription, conversationTimeline } from "./timelineEntries.js";
import { MediaPreview } from "./MediaAttachments";

const pageSize = 4;

function Message({ item, copy }) {
  const owner = item.type === "owner" || item.type === "steer";
  if (item.type === "activity") {
    const descriptions = [...new Set(item.events.map(activityDescription))];
    return <details className="operations__timeline-activity">
      <summary>{descriptions.slice(0, 2).join(" · ")}
        <small>{item.events.length > 1 ? item.events.length + " events" : "Details"}</small>
      </summary>
      <ol>{item.events.map((event, index) => <li key={index}>
        <strong>{event.label}</strong>{event.text && <pre>{event.text}</pre>}
      </li>)}</ol>
    </details>;
  }
  if (item.type === "notice") return <details className="operations__timeline-activity operations__timeline-notice">
    <summary>{activityDescription(item)}</summary>
    {item.text && <pre>{item.text}</pre>}
  </details>;
  if (item.type === "artifacts") return <ul className="operations__timeline-artifacts" aria-label="Returned artifacts">
    {item.media.map(({ id, name }) => <li key={id}>
      <a href={"/operations?workspace=artifacts&artifact=" + encodeURIComponent(id)}>{name || "Inspect returned artifact"}</a>
      <MediaPreview id={id} name={name} />
    </li>)}
  </ul>;
  return <article className={`operations__timeline-message operations__timeline-message--${item.type}`} aria-label={
    owner ? item.type === "steer" ? "Owner steering" : "Owner message" :
      item.actor + (item.type === "response" ? " response" : " update")
  }>
    <div className="operations__timeline-byline">
      <strong>{owner ? "Owner" : item.actor}</strong>
      {item.type === "steer" && <span>Steering</span>}
      {item.text && <button type="button" className="operations__timeline-copy" aria-label="Copy message"
        onClick={() => copy(item.text)}>Copy</button>}
    </div>
    {item.text ? <div className="operations__response"><Markdown skipHtml remarkPlugins={[remarkGfm]} disallowedElements={["img"]}
      components={{ pre: ({ children: code }) => <div className="operations__code-block">
        {typeof code?.props?.children === "string" && <button type="button" className="operations__timeline-copy"
          onClick={() => copy(code.props.children)}>Copy code</button>}
        <pre>{code}</pre>
      </div> }}>
      {item.text}
    </Markdown></div> : <p role="status">Loading message…</p>}
    {item.media?.map(({ id, name }) => <MediaPreview key={id} id={id} name={name} />)}
  </article>;
}

export default function ConversationTimeline({ api, job, copy, proposal, promptPreview, visible }) {
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [reload, setReload] = useState(0);
  const [latest, setLatest] = useState(false);
  const scrolling = useRef(null);
  const anchor = useRef(null);
  const pinned = useRef(true);
  const cached = useRef(new Map());

  useEffect(() => {
    let active = true;
    api("/jobs/" + job._id + "?conversation=true&offset=" + Number.MAX_SAFE_INTEGER)
      .then(turn => { if (active) setCurrent(turn); })
      .catch(error => { if (active) setFailure(error.message); });
    return () => { active = false; };
  }, [api, job._id, job.instruction?.id, reload]);

  useEffect(() => {
    let active = true;
    let timer;
    let first = true;
    async function load() {
      try {
        const session = job.sessionId || job._id;
        const rows = await conversationPage(api, session);
        const newest = [...new Map(rows.map(row => [row._id, row])).values()];
        const consumed = newest.slice(0, newest.slice(0, pageSize + 1).some(row => row._id === job._id) ? pageSize + 1 : pageSize);
        const turns = await Promise.all(consumed.filter(row => row._id !== job._id).map(row => {
          const existing = cached.current.get(row._id);
          return existing && existing.eventCount === row.eventCount && existing.status === row.status &&
            existing?.instruction?.id === row.instruction?.id ? existing : readExecutionTurn(api, row._id);
        }));
        if (active) {
          for (const turn of turns) cached.current.set(turn._id, turn);
          setHistory([...cached.current.values()]);
          if (first) setCursor(newest.length > consumed.length ? consumed.at(-1)?._id : null);
        }
      } catch (error) { if (active && first) setFailure(error.message); }
      finally {
        if (active) {
          if (first) setLoading(false);
          first = false;
          timer = setTimeout(load, document.hidden ? 30000 : 8000);
        }
      }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [api, job._id, job.sessionId, reload]);

  async function earlier() {
    if (loading || !cursor) return;
    setLoading(true);
    setFailure("");
    try {
      const rows = await conversationPage(api, job.sessionId || job._id, cursor);
      const ids = [...new Set(rows.slice(0, pageSize).map(row => row._id))]
        .filter(id => id !== job._id && !history.some(turn => turn._id === id));
      const turns = await Promise.all(ids.map(id => readExecutionTurn(api, id)));
      const node = scrolling.current;
      const firstVisible = [...node.querySelectorAll("[data-timeline-entry]")].find(entry =>
        entry.getBoundingClientRect().bottom > node.getBoundingClientRect().top);
      if (firstVisible) anchor.current = { node: firstVisible, top: firstVisible.getBoundingClientRect().top };
      for (const turn of turns) cached.current.set(turn._id, turn);
      setHistory([...cached.current.values()]);
      const next = rows.slice(0, pageSize).at(-1)?._id;
      setCursor(next && next !== cursor && rows.length > pageSize ? next : null);
    } catch (error) { setFailure(error.message); }
    finally { setLoading(false); }
  }

  const timeline = useMemo(() => {
    const selected = { ...current, ...job, prompt: current?.prompt ?? promptPreview, steeringHistory: current?.steeringHistory };
    const turns = [...history, selected].sort((a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) || a._id.localeCompare(b._id));
    return conversationTimeline(turns);
  }, [history, job, current, promptPreview]);

  useLayoutEffect(() => {
    const node = scrolling.current;
    if (!visible || !node) return;
    if (anchor.current) {
      node.scrollTop += anchor.current.node.getBoundingClientRect().top - anchor.current.top;
      anchor.current = null;
    } else if (pinned.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [timeline, loading, visible]);

  function jump() {
    const node = scrolling.current;
    node.scrollTop = node.scrollHeight;
    pinned.current = true;
    setLatest(false);
  }

  return <div className="operations__timeline-shell" hidden={!visible}>
    <section className="operations__timeline-scroll" aria-label="Conversation" tabIndex={0}
      ref={scrolling} onScroll={event => {
        const node = event.currentTarget;
        pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        setLatest(!pinned.current);
      }}>
      <div className="operations__timeline-content">
        <div className="operations__timeline-pagination">
          {cursor && <button type="button" disabled={loading} onClick={earlier}>
            {loading ? "Loading earlier messages…" : "Load earlier messages"}
          </button>}
          {loading && !cursor && <p role="status">Loading conversation history…</p>}
          {failure && <p role="status">{failure} <button type="button" onClick={() => {
            setFailure("");
            if (cursor) earlier();
            else setReload(value => value + 1);
          }}>Retry</button></p>}
        </div>
        {timeline.map(item => <div data-timeline-entry key={item.key}><Message item={item} copy={copy} /></div>)}
        {proposal}
      </div>
    </section>
    {latest && <button type="button" className="operations__timeline-jump" onClick={jump}>Jump to latest</button>}
  </div>;
}
