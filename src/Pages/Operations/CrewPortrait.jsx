export default function CrewPortrait({ employee, state }) {
  const initials = employee.name.trim().split(/\s+/u).slice(0, 2).map(word => Array.from(word)[0]).join("");
  return <span className="operations__crew-portrait" data-role={employee.role} data-state={state}
    aria-hidden="true"><span>{initials}</span></span>;
}
