// src/pages/Login/components/InfoPanel/InfoPanel.jsx
import "./InfoPanel.css";

function InfoPanel() {
  return (
    <div className="login__info">
      <h2 className="login__info-title">Access tiers</h2>

      <div className="login__tiers">
        <div className="login__tier">
          <div className="login__tier-head">
            <h3 className="login__tier-title">Guest (Demo)</h3>
            <span className="login__badge">Read-only</span>
          </div>
          <ul className="login__tier-list">
            <li>Explore the UI, routing, and components</li>
            <li>View curated sample projects and data</li>
            <li>No uploads, saving, or paid API calls</li>
          </ul>
        </div>

        <div className="login__tier">
          <div className="login__tier-head">
            <h3 className="login__tier-title">Invite Access</h3>
            <span className="login__badge login__badge--gold">Full</span>
          </div>
          <ul className="login__tier-list">
            <li>Full app functionality + persistent data</li>
            <li>Uploads enabled (limited while in early access)</li>
            <li>Access to in-progress backend features</li>
          </ul>
        </div>

        <div className="login__tier">
          <div className="login__tier-head">
            <h3 className="login__tier-title">Recruiter Pass</h3>
            <span className="login__badge login__badge--outline">Optional</span>
          </div>
          <ul className="login__tier-list">
            <li>Short-term access link (if needed)</li>
            <li>Stable review dataset + rate limits</li>
            <li>Designed to avoid cost spikes</li>
          </ul>
        </div>
      </div>

      <div className="login__divider" />

      <h2 className="login__info-title">Current updates</h2>
      <ul className="login__info-list">
        <li>Crossworld: demo mode + portfolio polish</li>
        <li>Squash: Express backend + storage pipeline</li>
        <li>Sanguine Archipelago: tooling + worldbuilding</li>
        <li>Taxi Cop: audiobook + print release planning</li>
      </ul>

      <div className="login__divider" />

      <p className="login__info-text">
        Invite access is limited while hosting + storage are being finalized.
      </p>
    </div>
  );
}

export default InfoPanel;
