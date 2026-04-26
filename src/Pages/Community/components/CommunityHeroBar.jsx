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
      <div className="community-hero-bar__copy">
        <span className="community-eyebrow">{contextLabel || "Across the Crossworld network"}</span>
        <div>
          <h1 className="community-hero-bar__title">Community</h1>
          <p className="community-hero-bar__subtitle">
            Community spaces across the Crossworld network.
          </p>
        </div>
      </div>

      <div className="community-hero-bar__stats" aria-label="Community stats">
        <div className="community-stat-pill">
          <span>Active Spaces</span>
          <strong>{stats.totalSpaces}</strong>
        </div>
        <div className="community-stat-pill">
          <span>Recent Threads</span>
          <strong>{stats.threadsToday}</strong>
        </div>
        <div className="community-stat-pill">
          <span>Members Online</span>
          <strong>{stats.membersOnline}</strong>
        </div>
        <div className="community-stat-pill">
          <span>Joined Spaces</span>
          <strong>{stats.joinedSpaces}</strong>
        </div>
      </div>

      <div className="community-hero-bar__actions">
        <button
          className="community-button community-button--primary"
          onClick={onCreateSpace}
          type="button"
        >
          {isAuthenticated ? "+ Create Space" : "Sign In To Create"}
        </button>
        <Link className="community-button community-button--secondary" to={newThreadHref}>
          + New Thread
        </Link>
        <Link className="community-button community-button--ghost" to={exploreHref}>
          Explore Spaces
        </Link>
      </div>
    </section>
  );
}

export default CommunityHeroBar;
