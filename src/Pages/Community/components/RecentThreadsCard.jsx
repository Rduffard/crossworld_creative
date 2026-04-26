import { Link } from "react-router-dom";

function formatRelativeTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  if (diff < hour) return "Just now";
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function RecentThreadsCard({ isLoading, threads }) {
  return (
    <section className="community-panel community-card">
      <div className="community-card__header">
        <div>
          <span className="community-eyebrow">Recent Threads</span>
          <h2>Discussions moving across the network.</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="community-feed-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="community-feed-item community-feed-item--skeleton" />
          ))}
        </div>
      ) : threads.length ? (
        <div className="community-feed-list">
          {threads.map((thread) => (
            <Link
              key={thread._id}
              className="community-feed-item"
              to={`/dashboard/community/spaces/${thread.spaceSlug}`}
            >
              <div className="community-feed-item__main">
                <strong>{thread.title}</strong>
                <span>{thread.spaceName}</span>
              </div>
              <div className="community-feed-item__meta">
                <span>{thread.author?.name || thread.author?.email || "Crossworld member"}</span>
                <span>{thread.replyCount ?? 0} replies</span>
                <span>Last activity {formatRelativeTime(thread.lastActivityAt || thread.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="community-empty-state">
          <h3>No threads yet. Start the first discussion.</h3>
          <p>The first good thread turns a quiet space into a community worth returning to.</p>
        </div>
      )}
    </section>
  );
}

export default RecentThreadsCard;
