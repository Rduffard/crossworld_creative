import "./Dashboard.css";
import DashboardCardGrid from "../../components/DashboardCardGrid/DashboardCardGrid.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function Dashboard() {
  const { user, loaded } = useAuth();

  // optional: avoids greeting flicker
  if (!loaded) return null;

  return (
    <main className="dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h1 className="dashboard-hero__title">
            Welcome{user?.email ? `, ${user.email}` : ""}
          </h1>
          <p className="dashboard-hero__subtitle">
            Reality is just the first draft.
          </p>
        </div>

        <div className="dashboard-hero__meta">
          <div className="dashboard-hero__chip">Crossworld Creative</div>
          <div className="dashboard-hero__chip dashboard-hero__chip--muted">
            Dashboard
          </div>
        </div>
      </header>

      <DashboardCardGrid />
    </main>
  );
}

export default Dashboard;
