import { Link } from "react-router-dom";

export function StudioHeading({ title, intro, label, children }) {
  return (
    <header className="studio-heading">
      <div className="studio-heading__copy">
        <p className="studio-kicker">{label}</p>
        <h1>{title}</h1>
        <p className="studio-intro">{intro}</p>
      </div>
      {children}
    </header>
  );
}

export function StudioLink({ to, href, children }) {
  const arrow = <span aria-hidden="true">{href ? "↗" : "→"}</span>;
  return href ? (
    <a className="studio-link" href={href} target="_blank" rel="noreferrer">{children}{arrow}</a>
  ) : (
    <Link className="studio-link" to={to}>{children}{arrow}</Link>
  );
}
