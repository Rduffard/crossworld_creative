import DashboardCard from "../../components/DashboardCard/DashboardCard";
import "./Games.css";

const games = [
  {
    id: "sanguine-archipelago",
    title: "Sanguine Archipelago",
    subtitle: "Original game world",
    description:
      "A narrative-rich world of fractured islands, conflict, mystery, and long-form creative development.",
    pillText: "In Progress",
    to: "/games/sanguine-archipelago",
    ctaText: "Explore Game →",
  },
  {
    id: "taxi-cop",
    title: "Taxi Cop",
    subtitle: "Action noir concept",
    description:
      "A gritty sci-fi action concept blending absurdity, violence, and worldbuilding into a strange future ride.",
    pillText: "Concept",
    to: "/games/taxi-cop",
    ctaText: "Explore Game →",
  },
];

function Games() {
  return (
    <main className="games-page">
      <section className="games-hero">
        <h1 className="games-title">Games</h1>
        <p className="games-intro">
          Game worlds, interactive ideas, and future playable projects will be
          showcased here.
        </p>
      </section>

      <section className="games-grid">
        {games.map((item) => (
          <DashboardCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            description={item.description}
            to={item.to}
            pillText={item.pillText}
            ctaText={item.ctaText}
            variant="games"
          />
        ))}
      </section>
    </main>
  );
}

export default Games;
