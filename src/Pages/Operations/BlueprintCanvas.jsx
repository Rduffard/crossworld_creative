import { useRef, useState } from "react";

const cardWidth = 224;
const cardHeight = 92;
const defaultPosition = (index) => ({ x: 40 + index % 3 * 290, y: 45 + Math.floor(index / 3) * 152 });

export default function BlueprintCanvas({ steps, types, employees, states, selected, select, connect, positions, move }) {
  const viewport = useRef(null);
  const gesture = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [source, setSource] = useState(null);
  const nodes = new Map(steps.map((step, index) => [step.id, {
    ...step, ...defaultPosition(index), ...positions[step.id],
  }]));
  const width = Math.max(420, ...Array.from(nodes.values(), node => node.x + cardWidth + 45));
  const height = Math.max(330, ...Array.from(nodes.values(), node => node.y + cardHeight + 48));

  function start(event, node) {
    if (event.button !== 0 || (!node && event.target.closest("button"))) return;
    const { clientX, clientY, pointerId, currentTarget } = event;
    gesture.current = { clientX, clientY, pointerId, node, left: viewport.current.scrollLeft, top: viewport.current.scrollTop };
    currentTarget.setPointerCapture(pointerId);
    if (node) select(node.id);
  }

  function drag(event) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - active.clientX;
    const deltaY = event.clientY - active.clientY;
    if (!active.node) {
      viewport.current.scrollLeft = active.left - deltaX;
      viewport.current.scrollTop = active.top - deltaY;
    } else if (Math.abs(deltaX) + Math.abs(deltaY) >= 4) {
      move(active.node.id, {
        x: Math.round(Math.max(14, Math.min(4000, active.node.x + deltaX / zoom))),
        y: Math.round(Math.max(14, Math.min(4000, active.node.y + deltaY / zoom))),
      });
    }
  }

  function fit() {
    setZoom(Math.max(0.35, Math.min(1, viewport.current.clientWidth / width, viewport.current.clientHeight / height)));
    viewport.current.scrollTo(0, 0);
  }

  return <section className="operations__blueprint-diagram" aria-label="Workflow canvas">
    <div className="operations__blueprint-tools">
      <button type="button" onClick={fit}>Fit</button>
      <label>Zoom <input aria-label="Canvas zoom" type="range" min="35" max="150" value={Math.round(zoom * 100)}
        onChange={event => setZoom(Number(event.target.value) / 100)} /></label>
      <output>{Math.round(zoom * 100)}%</output>
      <button type="button" onClick={() => { setZoom(1); viewport.current.scrollTo(0, 0); }}>Reset view</button>
      {source && <button type="button" onClick={() => setSource(null)}>Cancel connection</button>}
    </div>
    <div tabIndex={0} ref={viewport} className="operations__blueprint-viewport" aria-label="Scrollable workflow"
      onPointerDown={event => { if (event.pointerType === "mouse") start(event); }}
      onPointerMove={drag} onLostPointerCapture={() => { gesture.current = null; }}>
      <div className="operations__blueprint-sheet" style={{ width: width * zoom, height: height * zoom }}>
        <div className="operations__blueprint-plane" style={{ width, height, transform: `scale(${zoom})` }}>
          <svg aria-hidden="true" width={width} height={height} className="operations__blueprint-lines">
            {Array.from(nodes.values(), target => target.dependencies.map(id => {
              const origin = nodes.get(id);
              if (!origin) return null;
              const x1 = origin.x + cardWidth;
              const x2 = target.x;
              const y1 = origin.y + cardHeight / 2;
              const y2 = target.y + cardHeight / 2;
              const curve = Math.max(45, Math.abs(x2 - x1) * 0.48);
              return <path key={target.id + id} d={`M${x1} ${y1} C${x1 + curve} ${y1} ${x2 - curve} ${y2} ${x2} ${y2}`} />;
            }))}
          </svg>
          {Array.from(nodes.values(), node => <article className="operations__blueprint-node" key={node.id}
            data-type={node.type || "task"} data-selected={selected === node.id}
            style={{ left: node.x, top: node.y, width: cardWidth, height: cardHeight }}>
            <button className="operations__blueprint-input" type="button" disabled={!source || source === node.id}
              aria-label={"Connect into " + (node.name || "untitled step")}
              onClick={() => { if (connect(source, node.id)) setSource(null); }}>‹</button>
            <button className="operations__blueprint-node-title" type="button" aria-pressed={selected === node.id}
              onClick={() => select(node.id)} onPointerDown={event => start(event, node)}>
              <small>{types[node.type || "task"]}</small>
              <strong>{node.name || "Untitled step"}</strong>
              <span>{states.get(node.id) || employees.get(node.employeeId) || "Choose employee"}</span>
            </button>
            <button className="operations__blueprint-output" type="button" aria-pressed={source === node.id}
              aria-label={"Connect from " + (node.name || "untitled step")}
              onClick={() => setSource(source === node.id ? null : node.id)}>›</button>
          </article>)}
        </div>
      </div>
    </div>
  </section>;
}
