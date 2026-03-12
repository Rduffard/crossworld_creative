import DashboardCard from "../../components/DashboardCard/DashboardCard";
import "./Music.css";

const musicProjects = [
  {
    id: "pale-shelter",
    title: "Pale Shelter",
    subtitle: "Band page",
    description:
      "A home for Pale Shelter releases, visuals, updates, and future music content.",
    pillText: "Soon",
    href: "https://paleshelter.crossworldcreative.com",
    external: true,
    ctaText: "Visit Band Page →",
  },
  {
    id: "southern-implication",
    title: "The Southern Implication",
    subtitle: "Band page",
    description:
      "A dedicated space for the band’s music, identity, recordings, and future releases.",
    pillText: "Soon",
    href: "https://thesouthernimplication.crossworldcreative.com",
    external: true,
    ctaText: "Visit Band Page →",
  },
  {
    id: "solo-projects",
    title: "Solo Projects",
    subtitle: "Crossworld Creative",
    description:
      "A place for solo work, experiments, recordings, and personal releases under Crossworld Creative.",
    pillText: "Here",
    to: "/music/solo-projects",
    ctaText: "Explore Music →",
  },
];

function Music() {
  return (
    <main className="music-page">
      <section className="music-hero">
        <h1 className="music-title">Music</h1>
        <p className="music-intro">
          Bands, recordings, solo work, and future releases will live here as
          the music side of Crossworld Creative grows.
        </p>
      </section>

      <section className="music-grid">
        {musicProjects.map((item) => (
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
            variant="music"
          />
        ))}
      </section>
    </main>
  );
}

export default Music;
