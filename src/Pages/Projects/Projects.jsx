import { useNavigate } from "react-router-dom";
import "./Projects.css";

const projects = [
  {
    id: "squash",
    title: "Squash",
    subtitle: "QA + bug tracking platform (in progress)",
    description:
      "A bug tracking + QA management platform inspired by Jira, built to be clean, fast, and portfolio-ready.",
    status: "Live",
    tags: ["React", "Express", "MongoDB", "Auth", "Storage"],
    route: "https://squash.crossworldcreative.com",
    external: true,
  },
  {
    id: "wtwr",
    title: "WTWR",
    subtitle: "Weather-based outfit picker",
    description:
      "React app that suggests clothing items based on weather conditions with a connected backend.",
    status: "Demo",
    tags: ["React", "API", "Routing"],
    route: "https://github.com/Rduffard", // swap this to your actual WTWR link
    external: true,
  },
  {
    id: "crossworld",
    title: "Crossworld Creative",
    subtitle: "Portfolio + creative hub",
    description:
      "Your main landing site for projects, music, games, and writing — built as a hub for everything Crossworld.",
    status: "Live",
    tags: ["React", "Branding", "UI/UX"],
    route: "https://crossworldcreative.com",
    external: true,
  },
];

function Projects() {
  const navigate = useNavigate();

  const handleOpen = (project) => {
    if (project.external) {
      window.open(project.route, "_blank", "noreferrer");
      return;
    }

    navigate(project.route);
  };

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
        {projects.map((p) => (
          <article
            key={p.id}
            className={`projects__card ${
              p.id === "squash" ? "projects__card--featured" : ""
            }`}
          >
            <div className="projects__card-top">
              <div>
                <h2 className="projects__card-title">{p.title}</h2>
                <p className="projects__card-subtitle">{p.subtitle}</p>
              </div>

              <span
                className={`projects__pill ${
                  p.id === "squash" ? "projects__pill--gold" : ""
                }`}
              >
                {p.status}
              </span>
            </div>

            <p className="projects__card-desc">{p.description}</p>

            <div className="projects__tags">
              {p.tags.map((tag) => (
                <span key={tag} className="projects__tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="projects__actions">
              <button
                type="button"
                className="projects__button"
                onClick={() => handleOpen(p)}
              >
                {p.id === "squash" ? "Open Squash" : "View Project"}
              </button>

              {p.id === "squash" && (
                <button
                  type="button"
                  className="projects__button projects__button--ghost"
                  onClick={() =>
                    window.open(
                      "https://squash.crossworldcreative.com",
                      "_blank",
                    )
                  }
                >
                  Live Site
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Projects;
