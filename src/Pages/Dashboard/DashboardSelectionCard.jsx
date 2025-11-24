import { Link } from "react-router-dom";

function DashboardSectionCard({ title, description, to }) {
  return (
    <article className="dashboard-card">
      <h2 className="dashboard-card__title">{title}</h2>
      <p className="dashboard-card__description">{description}</p>
      <Link className="dashboard-card__link" to={to}>
        Open
      </Link>
    </article>
  );
}

export default DashboardSectionCard;
