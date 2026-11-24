import { Link } from "react-router-dom";
import { StudioHeading, StudioLink } from "../../studio/StudioPresentation";

export function SoloProjects() {
  return (
    <article className="studio-page studio-music studio-detail">
      <Link className="studio-back" to="/dashboard/music">← Music</Link>
      <StudioHeading title="Solo projects" label="Crossworld Creative / Recordings" intro="Solo recordings and experiments. This collection has no published tracks yet." />
    </article>
  );
}

export default function Music() {
  return (
    <div className="studio-page studio-music">
      <StudioHeading title="Music" label="Crossworld Creative / Listening room" intro="Find the bands and recordings that make up the studio’s music catalogue.">
        <div className="studio-record" aria-hidden="true" />
      </StudioHeading>
      <ul className="music-tracklist">
        <li><div><h2>Pale Shelter</h2><p>Band</p></div><StudioLink href="https://paleshelter.crossworldcreative.com">Visit Pale Shelter</StudioLink></li>
        <li><div><h2>The Southern Implication</h2><p>Band</p></div><StudioLink href="https://thesouthernimplication.crossworldcreative.com">Visit The Southern Implication</StudioLink></li>
        <li><div><h2>Solo projects</h2><p>Recordings and experiments</p></div><StudioLink to="solo-projects">Explore solo projects</StudioLink></li>
      </ul>
    </div>
  );
}
