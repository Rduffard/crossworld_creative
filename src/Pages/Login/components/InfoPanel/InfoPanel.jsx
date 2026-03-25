// src/pages/Login/components/InfoPanel/InfoPanel.jsx
import "./InfoPanel.css";

function InfoPanel() {
  return (
    <aside className="login__info" aria-label="About Crossworld Creative">
      <section className="login__info-section">
        <p className="login__eyebrow">Crossworld Creative • Romain Duffard</p>

        <h2 className="login__info-title">
          A connected system of software and creative work
        </h2>

        <p className="login__info-text login__info-text--lead">
          Built and evolving in real time — from{" "}
          <span className="login__highlight">frontend systems</span> to{" "}
          <span className="login__highlight">backend services</span>,{" "}
          <span className="login__highlight">authentication</span>, and{" "}
          <span className="login__highlight">deployment</span>.
        </p>
      </section>

      <div className="login__divider" />

      <section className="login__info-section">
        <h3 className="login__section-title">Inside this space</h3>

        <div className="login__cards">
          <article className="login__card">
            <h4 className="login__card-title">Crossworld</h4>
            <p className="login__card-text">
              Shared platform and infrastructure connecting multiple apps,
              systems, and future creative tools.
            </p>
          </article>

          <article className="login__card">
            <h4 className="login__card-title">Squash</h4>
            <p className="login__card-text">
              Bug tracking and workflow tooling built as a full-stack project
              with real product direction behind it.
            </p>
          </article>

          <article className="login__card">
            <h4 className="login__card-title">Creative work</h4>
            <p className="login__card-text">
              Music, writing, and worldbuilding projects that live alongside the
              technical side of the platform.
            </p>
          </article>
        </div>
      </section>

      <div className="login__divider" />

      <section className="login__info-section">
        <h3 className="login__section-title">Why it’s here</h3>

        <p className="login__info-text">
          This isn’t a static portfolio. It’s a working ecosystem where ideas
          are designed, built, tested, refined, and expanded over time.
        </p>

        <p className="login__info-text login__info-text--muted">
          You’re seeing real development in progress, not just finished mockups
          or isolated screenshots.
        </p>
      </section>

      <div className="login__divider" />

      <section className="login__info-section">
        <h3 className="login__section-title">Access</h3>

        <p className="login__info-text">
          Guests can explore selected areas of the platform.
        </p>

        <p className="login__info-text">
          Signing in unlocks persistent data, expanded functionality, and
          in-progress systems that aren’t fully exposed publicly yet.
        </p>

        <p className="login__info-text login__info-text--muted">
          Reviewing this as part of an interview or portfolio pass? Full access
          can be provided if needed.
        </p>
      </section>

      <div className="login__divider" />

      <section className="login__info-section">
        <h3 className="login__section-title">Current focus</h3>

        <ul className="login__info-list">
          <li>Shared platform polish and architecture</li>
          <li>Squash features, usability, and workflow depth</li>
          <li>Infrastructure, hosting, and deployment improvements</li>
          <li>Creative releases and connected project expansion</li>
        </ul>
      </section>

      <p className="login__signature">Built as a system, not a collection.</p>
      <p className="login__signature login__signature--muted">
        © 2026 Romain Duffard
      </p>
    </aside>
  );
}

export default InfoPanel;
