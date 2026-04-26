import { Link } from "react-router-dom";

function QuickActionsCard({ isAuthenticated, joinSpaceHref, newThreadHref, onCreateSpace }) {
  return (
    <section className="community-panel community-card">
      <div className="community-card__header">
        <div>
          <span className="community-eyebrow">Quick Actions</span>
          <h2>Take the next step.</h2>
        </div>
        <p className="community-muted-copy">Open a space, start a discussion, or jump into one already moving.</p>
      </div>

      <div className="community-action-grid">
        <button
          className="community-action-button community-action-button--primary"
          onClick={onCreateSpace}
          type="button"
        >
          <strong>Create a Space</strong>
          <span>{isAuthenticated ? "Launch a new space for your team, story, or experiment." : "Sign in to open a new space."}</span>
        </button>

        <Link className="community-action-button" to={newThreadHref}>
          <strong>Start Thread</strong>
          <span>Open a new discussion in a space that is already active.</span>
        </Link>

        <Link className="community-action-button" to={joinSpaceHref}>
          <strong>Browse Spaces</strong>
          <span>See which communities are active and where the conversation is moving.</span>
        </Link>

        <Link className="community-action-button" to="/dashboard/projects">
          <strong>Open Dashboard</strong>
          <span>Jump back into the wider Crossworld workspace when you need context.</span>
        </Link>
      </div>
    </section>
  );
}

export default QuickActionsCard;
