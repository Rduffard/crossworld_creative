import gathering from "../../../studio/art/gathering.svg";
import { Link } from "react-router-dom";

function CommunityHeroBar({
  contextLabel,
  exploreHref,
  isAuthenticated,
  newThreadHref,
  onCreateSpace,
  stats,
}) {
  return (
    <section className="community-hero-bar community-panel">
      <img className="community-hero-bar__art" src={gathering} width="800" height="410" alt="" />
      <div className="community-hero-bar__copy">
        <span className="community-eyebrow">{contextLabel || "Across the Crossworld network"}</span>
        <div>
          <h1 className="community-hero-bar__title">Community</h1>
          <p className="community-hero-bar__subtitle">
            Find a space, follow a conversation, or start one of your own.
          </p>
        </div>
      </div>

      <div className="community-hero-bar__stats" aria-label="Community stats">
        <div className="community-stat-pill">
          <span>Spaces</span>
          <strong>{stats.totalSpaces}</strong>
        </div>
        <div className="community-stat-pill">
          <span>Recent Threads</span>
          <strong>{stats.recentThreads}</strong>
        </div>
        <div className="community-stat-pill">
          <span>Joined Spaces</span>
          <strong>{stats.joinedSpaces}</strong>
        </div>
      </div>

      <div className="community-hero-bar__actions">
        {isAuthenticated ? <button
          className="community-button community-button--primary"
          onClick={onCreateSpace}
          type="button"
        >
          + Create Space
        </button> : <Link className="community-button community-button--primary" to="/">Sign in</Link>}
        {isAuthenticated && newThreadHref && <Link className="community-button community-button--secondary" to={newThreadHref}>
          + New Thread
        </Link>}
        <a className="community-button community-button--ghost" href={exploreHref}>
          Explore Spaces
        </a>
      </div>
    </section>
  );
}

export default CommunityHeroBar;
