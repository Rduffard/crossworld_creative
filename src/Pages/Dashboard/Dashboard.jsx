import "./Dashboard.css";

function Dashboard({ onLogout }) {
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="dashboard-logout" onClick={onLogout}>
          Log Out
        </button>
      </header>

      <section className="dashboard-content">
        <p>Here’s where your Crossworld Creative stuff will live.</p>
        {/* Later: cards for projects, music, D&D, Taxi Cop, etc. */}
      </section>
    </main>
  );
}

export default Dashboard;
