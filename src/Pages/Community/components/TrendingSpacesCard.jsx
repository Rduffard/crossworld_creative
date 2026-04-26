import { Link } from "react-router-dom";

function formatActivity(value) {
  if (!value) return "No recent activity";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatThreadCount(value) {
  if (typeof value !== "number") return "Thread count unavailable";
  if (value === 1) return "1 thread";
  return `${value} threads`;
}

function TrendingSpacesCard({ isLoading, spaces }) {
  return (
    <section
      className="community-panel community-card"
      id="community-active-spaces"
    >
      <div className="community-card__header">
        <div>
          <span className="community-eyebrow">Active Spaces</span>
          <h2>Places worth opening next.</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="community-space-grid-compact">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="community-space-tile community-space-tile--skeleton"
            />
          ))}
        </div>
      ) : spaces.length ? (
        <div className="community-space-grid-compact">
          {spaces.map((space) => (
            <article key={space._id} className="community-space-tile">
              <div className="community-space-tile__header">
                <div className="community-space-row__icon">
                  {(space.icon || space.name || "C").slice(0, 2).toUpperCase()}
                </div>
                <div className="community-space-tile__identity">
                  <strong>{space.name}</strong>
                  <span>{space.description || "A network space ready for contributors, updates, and discussion."}</span>
                </div>
              </div>

              <div className="community-space-tile__meta">
                <span
                  className={`community-badge ${space.visibility === "private" ? "is-private" : "is-public"}`}
                >
                  {space.visibility}
                </span>
                <span>{space.members?.length || 0} members</span>
                <span>{formatThreadCount(space.threadCount)}</span>
              </div>

              <div className="community-space-tile__footer">
                <span>Updated {formatActivity(space.lastActiveAt || space.updatedAt)}</span>
                <Link
                  className="community-inline-link"
                  to={`/dashboard/community/spaces/${space.slug}`}
                >
                  View Space
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="community-empty-state">
          <h3>No active spaces yet</h3>
          <p>Create the first space and give the community a place to gather.</p>
        </div>
      )}
    </section>
  );
}

export default TrendingSpacesCard;
