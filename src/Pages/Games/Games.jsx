import DashboardCard from "../../components/DashboardCard/DashboardCard";
import "./Games.css";

const games = [
  {
    id: "sanguine-archipelago",
    title: "Sanguine Archipelago",
    subtitle: "Live tabletop companion",
    description:
      "A narrative-rich world of fractured islands, conflict, mystery, and long-form creative development, now taking shape as a live companion app.",
    pillText: "Live",
    href: "https://archipelago.crossworldcreative.com",
    external: true,
    ctaText: "Open Archipelago ->",
  },
  {
    id: "taxi-cop",
    title: "Taxi Cop",
    subtitle: "Action noir concept",
    description:
      "A gritty sci-fi action concept blending absurdity, violence, and worldbuilding into a strange future ride.",
    pillText: "Concept",
    to: "/games/taxi-cop",
    ctaText: "Explore Game ->",
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
            href={item.href}
            external={item.external}
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
