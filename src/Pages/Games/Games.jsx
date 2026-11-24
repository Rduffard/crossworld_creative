import { Link } from "react-router-dom";
import { StudioHeading, StudioLink } from "../../studio/StudioPresentation";
import tide from "../../studio/art/tide.svg";

export function TaxiCopGame() {
  return (
    <article className="studio-page studio-games studio-detail">
      <Link className="studio-back" to="/dashboard/games">← Games</Link>
      <StudioHeading title="Taxi Cop" label="Action noir / Game concept" intro="A sci-fi action concept that brings noir, absurdity, and a strange future ride together." />
      <StudioLink to="/dashboard/literature/taxi-cop">Explore the novel</StudioLink>
    </article>
  );
}

export default function Games() {
  return (
    <div className="studio-page studio-games">
      <StudioHeading title="Games" label="Crossworld Creative / Interactive worlds" intro="Explore an island world or follow a game concept back to the writing desk." />
      <section className="game-stage" aria-labelledby="game-archipelago">
        <img src={tide} width="900" height="460" alt="" />
        <div>
          <p className="studio-kicker">Available / Tabletop companion</p>
          <h2 id="game-archipelago">Sanguine<br />Archipelago</h2>
          <StudioLink href="https://archipelago.crossworldcreative.com">Open Archipelago</StudioLink>
          <StudioLink to="/dashboard/projects/archipelago">Project details</StudioLink>
        </div>
      </section>
      <section className="game-concept">
        <p className="studio-kicker">Concept / Action noir</p>
        <h2>Taxi Cop</h2>
        <p>Science fiction, noir, and an unusual fare.</p>
        <StudioLink to="taxi-cop">Explore the concept</StudioLink>
      </section>
    </div>
  );
}
