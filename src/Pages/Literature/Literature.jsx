import { Link, useParams } from "react-router-dom";
import { StudioHeading, StudioLink } from "../../studio/StudioPresentation";

const works = [
  { id: "taxi-cop", title: "Taxi Cop", label: "Novel / In progress", intro: "A sci-fi noir story of grief and multiversal desperation set in the city of Bastion." },
  { id: "persona-non-grata", title: "Persona Non Grata", label: "Fiction / Planned", intro: "An original writing project exploring identity and conflict." },
];

export function LiteratureDetail() {
  const { workId } = useParams();
  const work = works.find(({ id }) => id === workId);
  return (
    <article className="studio-page studio-literature studio-detail">
      <Link className="studio-back" to="/dashboard/literature">← Literature</Link>
      {work ? (
        <>
          <StudioHeading {...work} />
          <p>Reading excerpts are unavailable.</p>
          {work.id === "taxi-cop" && <StudioLink to="/dashboard/games/taxi-cop">Explore the game concept</StudioLink>}
        </>
      ) : <h1>Work unavailable</h1>}
    </article>
  );
}

export default function Literature() {
  return (
    <div className="studio-page studio-literature">
      <StudioHeading title="Literature" label="Crossworld Creative / Written worlds" intro="Novels and long-form fiction from the studio’s writing desk." />
      <div className="literary-spread">
        {works.map((work) => (
          <article key={work.id}>
            <p className="studio-kicker">{work.label}</p>
            <h2>{work.title}</h2>
            <p>{work.intro}</p>
            <StudioLink to={work.id}>About {work.title}</StudioLink>
          </article>
        ))}
      </div>
    </div>
  );
}
