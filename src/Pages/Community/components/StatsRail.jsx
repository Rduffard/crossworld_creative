import { Link } from "react-router-dom";

function formatActivityTime(value) {
  if (!value) return "Just now";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatsRail({ activities }) {
  return (
    <section className="community-panel community-card">
      <div className="community-card__header">
        <div>
          <span className="community-eyebrow">Latest Activity</span>
          <h2>What changed most recently.</h2>
        </div>
      </div>

      {activities.length ? (
        <div className="community-activity-list">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              className="community-activity-item"
              to={activity.href}
            >
              <strong>{activity.title}</strong>
              <span>{activity.type} | {activity.detail}</span>
              <span>{formatActivityTime(activity.timestamp)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="community-empty-state">
          <h3>No activity yet</h3>
          <p>New threads, spaces, and comment activity will show up here as the network picks up.</p>
        </div>
      )}
    </section>
  );
}

export default StatsRail;
