import { useEffect, useState } from "react";
import "./Dashboard.css";
import DashboardCardGrid from "../../components/DashboardCardGrid/DashboardCardGrid.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getUserDisplayName } from "../../utils/userDisplay.js";

function Dashboard() {
  const { user, loaded } = useAuth();
  const displayName = getUserDisplayName(user);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!loaded) return null;

  return (
    <main
      className={`dashboard-page ${isVisible ? "dashboard-page--visible" : ""}`}
    >
      <header className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h1 className="dashboard-hero__title">
            Welcome{user ? `, ${displayName}` : ""}
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
