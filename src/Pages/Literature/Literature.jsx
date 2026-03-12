import DashboardCard from "../../components/DashboardCard/DashboardCard";
import "./Literature.css";

const literatureWorks = [
  {
    id: "taxi-cop",
    title: "Taxi Cop",
    subtitle: "Novel",
    description:
      "A grimy sci-fi noir story of violence, grief, and multiversal desperation set in the city of Bastion.",
    pillText: "In Progress",
    to: "/literature/taxi-cop",
    ctaText: "Read More →",
  },
  {
    id: "persona-non-grata",
    title: "Persona Non Grata",
    subtitle: "Original work",
    description:
      "A developing written project exploring identity, conflict, and larger thematic storytelling.",
    pillText: "Planned",
    to: "/literature/persona-non-grata",
    ctaText: "Read More →",
  },
];

function Literature() {
  return (
    <main className="literature-page">
      <section className="literature-hero">
        <h1 className="literature-title">Literature</h1>
        <p className="literature-intro">
          Novels, stories, written worlds, and long-form narrative projects will
          live here.
        </p>
      </section>

      <section className="literature-grid">
        {literatureWorks.map((item) => (
          <DashboardCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            description={item.description}
            to={item.to}
            pillText={item.pillText}
            ctaText={item.ctaText}
            variant="literature"
          />
        ))}
      </section>
    </main>
  );
}

export default Literature;
