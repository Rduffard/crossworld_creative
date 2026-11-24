import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { getUserDisplayName } from "../../utils/userDisplay.js";
import { StudioLink } from "../../studio/StudioPresentation.jsx";
import threshold from "../../studio/art/threshold.svg";
import tide from "../../studio/art/tide.svg";

function Dashboard() {
  const { loaded, user } = useAuth();
  return (
    <div className="studio-page studio-home">
      <header className="studio-threshold">
        <img className="studio-threshold__art" src={threshold} width="1000" height="650" alt="" fetchPriority="high" />
        <div className="studio-threshold__copy">
          <p className="studio-kicker">Crossworld Creative / Independent studio</p>
          <h1>Reality is just<br />the <em>first draft.</em></h1>
          <p className="studio-intro">An independent creative studio building game worlds, software, music, and fiction.</p>
          <StudioLink to="/dashboard/projects">Explore our work</StudioLink>
        </div>
      </header>
      {loaded && user && (
        <p className="studio-return">Welcome, {getUserDisplayName(user)}. <Link to="/settings">Account settings</Link></p>
      )}
      <section className="studio-dispatch" aria-labelledby="studio-spotlight">
        <img src={tide} width="900" height="460" alt="" loading="lazy" />
        <div>
          <p className="studio-kicker">World spotlight / Live tabletop companion</p>
          <h2 id="studio-spotlight">Sanguine Archipelago</h2>
          <p>Set a course through a fractured island world. The Archipelago companion brings characters and campaigns together.</p>
          <StudioLink to="/dashboard/projects/archipelago">Discover the project</StudioLink>
        </div>
      </section>
      <nav className="studio-index" aria-label="Explore the studio">
        <Link to="/dashboard/games"><strong>Games</strong><span>Worlds and concepts</span><b aria-hidden="true">↗</b></Link>
        <Link to="/dashboard/music"><strong>Music</strong><span>Bands and solo work</span><b aria-hidden="true">↗</b></Link>
        <Link to="/dashboard/literature"><strong>Literature</strong><span>Fiction in development</span><b aria-hidden="true">↗</b></Link>
        <Link to="/dashboard/community"><strong>Community</strong><span>Spaces and recent conversations</span><b aria-hidden="true">↗</b></Link>
      </nav>
    </div>
  );
}

export default Dashboard;
