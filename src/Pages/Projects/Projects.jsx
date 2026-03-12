import DashboardCard from "../../components/DashboardCard/DashboardCard";
import "./Projects.css";

const projects = [
  {
    id: "squash",
    title: "Squash",
    subtitle: "QA + bug tracking platform (in progress)",
    description:
      "A bug tracking + QA management platform inspired by Jira, built to be clean, fast, and portfolio-ready.",
    pillText: "Live",
    tags: ["React", "Express", "MongoDB", "Auth", "Storage"],
    href: "https://squash.crossworldcreative.com",
    external: true,
    ctaText: "Open Squash →",
    featured: true,
  },
  {
    id: "wtwr",
    title: "WTWR",
    subtitle: "Weather-based outfit picker",
    description:
      "React app that suggests clothing items based on weather conditions with a connected backend.",
    pillText: "Demo",
    tags: ["React", "API", "Routing"],
    href: "https://wtwr.crossworldcreative.com",
    external: true,
    ctaText: "View Project →",
  },
  {
    id: "crossworld",
    title: "Crossworld Creative",
    subtitle: "Portfolio + creative hub",
    description:
      "Your main landing site for projects, music, games, and writing — built as a hub for everything Crossworld.",
    pillText: "Live",
    tags: ["React", "Branding", "UI/UX"],
    href: "https://crossworldcreative.com",
    external: true,
    ctaText: "View Project →",
  },
];

function Projects() {
  return (
    <main className="projects">
      <header className="projects__header">
        <h1 className="projects__title">Projects</h1>
        <p className="projects__subtitle">
          Showcase your development work, school assignments, experiments, and
          personal creations here.
        </p>
      </header>

      <section className="projects__grid">
        {projects.map((project) => (
          <DashboardCard
            key={project.id}
            title={project.title}
            subtitle={project.subtitle}
            description={project.description}
            href={project.href}
            external={project.external}
            pillText={project.pillText}
            ctaText={project.ctaText}
            tags={project.tags}
            featured={project.featured}
            variant="projects"
          />
        ))}
      </section>
    </main>
  );
}

export default Projects;
