import { Link } from "react-router-dom";
import "./DashboardCard.css";

function DashboardCard({
  title,
  subtitle,
  description,
  to,
  href,
  external = false,
  variant = "default",
  tone,
  pillText = "Enter",
  ctaText = "Explore →",
  tags = [],
  featured = false,
}) {
  const className = `dashboard-card dashboard-card--${variant} ${
    tone ? `dashboard-card--${tone}` : ""
  } ${featured ? "dashboard-card--featured" : ""}`.trim();

  const content = (
    <>
      <div className="dashboard-card__top">
        <div className="dashboard-card__heading">
          <h2 className="dashboard-card__title">{title}</h2>
          {subtitle ? (
            <p className="dashboard-card__subtitle">{subtitle}</p>
          ) : null}
        </div>

        <span className="dashboard-card__pill">{pillText}</span>
      </div>

      <p className="dashboard-card__description">{description}</p>

      {tags.length > 0 ? (
        <div className="dashboard-card__tags">
          {tags.map((tag) => (
            <span key={tag} className="dashboard-card__tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="dashboard-card__footer">
        <span className="dashboard-card__cta">{ctaText}</span>
      </div>
    </>
  );

  if (external && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        aria-label={`${title}: ${description}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={className} aria-label={`${title}: ${description}`}>
      {content}
    </Link>
  );
}

export default DashboardCard;
