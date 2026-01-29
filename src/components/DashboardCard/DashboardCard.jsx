import { Link } from "react-router-dom";
import "./DashboardCard.css";

function DashboardCard({ title, description, to, variant = "default", tone }) {
  return (
    <Link
      to={to}
      className={`dashboard-card dashboard-card--${variant} ${
        tone ? `dashboard-card--${tone}` : ""
      }`}
      aria-label={`${title}: ${description}`}
    >
      <div className="dashboard-card__top">
        <h2 className="dashboard-card__title">{title}</h2>
        <span className="dashboard-card__pill">Enter</span>
      </div>

      <p className="dashboard-card__description">{description}</p>

      <div className="dashboard-card__footer">
        <span className="dashboard-card__cta">Explore →</span>
      </div>
    </Link>
  );
}

export default DashboardCard;
