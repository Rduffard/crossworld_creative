import "./MusicCard.css";

function MusicCard({ title, description, href, status = "Coming Soon" }) {
  return (
    <a
      className="music-card"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${title}: ${description}`}
    >
      <div className="music-card__top">
        <h2 className="music-card__title">{title}</h2>
        <span className="music-card__pill">{status}</span>
      </div>

      <p className="music-card__description">{description}</p>

      <div className="music-card__footer">
        <span className="music-card__cta">Visit →</span>
      </div>
    </a>
  );
}

export default MusicCard;
