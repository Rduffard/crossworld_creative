import { Link } from "react-router-dom";

function MembershipCard({ isAuthenticated, memberships, user }) {
  return (
    <section className="community-panel community-card">
      <div className="community-card__header">
        <div>
          <span className="community-eyebrow">Your Spaces</span>
          <h2>{isAuthenticated ? "Spaces you belong to" : "Sign in to keep track of spaces"}</h2>
        </div>
      </div>

      {isAuthenticated ? (
        memberships.length ? (
          <div className="community-membership-list">
            {memberships.map((space) => (
              <Link
                key={space._id}
                className="community-membership-item"
                to={`/dashboard/community/spaces/${space.slug}`}
              >
                <div className="community-membership-item__icon">
                  {(space.icon || space.name || "C").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{space.name}</strong>
                  <span>{space.visibility} space | {space.members?.length || 0} members</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="community-empty-state">
            <h3>Join a space to see it here</h3>
            <p>{user?.name || "You"} can browse active spaces and keep your regular communities pinned in one place.</p>
          </div>
        )
      ) : (
        <div className="community-empty-state">
          <h3>Join a space to see it here</h3>
          <p>Browsing is open, and signing in will start building your personal community list.</p>
        </div>
      )}
    </section>
  );
}

export default MembershipCard;
