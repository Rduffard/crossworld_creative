import { Link, useParams } from "react-router-dom";
import { StudioHeading, StudioLink } from "../../studio/StudioPresentation";
import tide from "../../studio/art/tide.svg";

const projects = [
  {
    id: "archipelago",
    title: "Sanguine Archipelago",
    label: "Nautical fantasy / Live companion",
    intro: "A tabletop companion for an original world of fractured islands.",
    detail: "Create character sheets and organize campaigns in the Archipelago companion. The tabletop tools are built around the setting’s island world.",
    tech: "React, Express, MongoDB",
    href: "https://archipelago.crossworldcreative.com",
    action: "Open Archipelago",
    art: tide,
  },
  {
    id: "loom",
    title: "Loom",
    label: "Virtual tabletop / In development",
    intro: "A virtual tabletop project for shared roleplaying sessions.",
    detail: "Loom explores how a digital tabletop can support players and game masters around the same virtual table. A public build is unavailable.",
    symbol: "loom",
  },
  {
    id: "squash",
    title: "Squash",
    label: "Software / Live",
    intro: "A standalone QA and bug-tracking platform.",
    detail: "Squash gives project teams a dedicated place to track defects and organize quality assurance work.",
    tech: "React, Express, MongoDB",
    href: "https://squash.crossworldcreative.com",
    action: "Open Squash",
    symbol: "squash",
  },
  {
    id: "wtwr",
    title: "WTWR",
    label: "Software / Demo",
    intro: "A weather-based outfit picker with a connected backend.",
    detail: "The React application uses weather conditions to suggest clothing from the wardrobe.",
    tech: "React, Express, weather API",
    href: "https://wtwr.crossworldcreative.com",
    action: "View demo",
    symbol: "wtwr",
  },
  {
    id: "crossworld",
    title: "Crossworld Creative",
    label: "Website / Live",
    intro: "The studio’s home for games, software, music, and writing.",
    detail: "The React frontend brings public showcases, cross-app community spaces, and account settings into one site.",
    tech: "React, React Router, Vite",
    symbol: "crossworld",
  },
];

function ProjectArt({ project }) {
  return project.art ? (
    <img className="project-art" src={project.art} width="900" height="460" alt="" />
  ) : (
    <div className="project-art" data-symbol={project.symbol} aria-hidden="true"><span /></div>
  );
}

export function ProjectDetail() {
  const { projectId } = useParams();
  const project = projects.find(({ id }) => id === projectId);
  return (
    <article className="studio-page studio-project-detail">
      <Link className="studio-back" to="/dashboard/projects">← All projects</Link>
      {project ? (
        <>
          <StudioHeading title={project.title} label={project.label} intro={project.intro} />
          <ProjectArt project={project} />
          <div className="studio-project-detail__body">
            <h2>About the project</h2>
            <p>{project.detail}</p>
            {project.tech && <p><strong>Built with</strong> {project.tech}</p>}
            {project.href && <StudioLink href={project.href}>{project.action}</StudioLink>}
            {project.id === "crossworld" && <StudioLink to="/dashboard">Explore the studio</StudioLink>}
          </div>
        </>
      ) : <h1>Project unavailable</h1>}
    </article>
  );
}

export default function Projects() {
  const [featured, ...rest] = projects;
  return (
    <div className="studio-page studio-projects">
      <StudioHeading title="Projects" label="Crossworld Creative / Portfolio" intro="Original worlds, tools for the people who build them, and experiments across the studio." />
      <section className="project-feature" aria-label="Featured project">
        <ProjectArt project={featured} />
        <div>
          <p className="studio-kicker">{featured.label}</p>
          <h2>{featured.title}</h2>
          <p>{featured.intro}</p>
          <StudioLink to="/dashboard/projects/archipelago">Project details</StudioLink>
          <StudioLink href={featured.href}>{featured.action}</StudioLink>
        </div>
      </section>
      <ul className="project-ledger">
        {rest.map((project) => (
          <li key={project.id}>
            <ProjectArt project={project} />
            <div>
              <p className="studio-kicker">{project.label}</p>
              <h2><Link to={project.id}>{project.title}</Link></h2>
              <p>{project.intro}</p>
            </div>
            <StudioLink to={project.id}>Project details<span className="studio-sr"> for {project.title}</span></StudioLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
