function ShortcutsCard() {
  return (
    <section className="community-panel community-card">
      <div className="community-card__header">
        <div>
          <span className="community-eyebrow">Crossworld Shortcuts</span>
          <h2>Move across the ecosystem.</h2>
        </div>
      </div>

      <div className="community-shortcuts">
        <a className="community-shortcut-button" href="/dashboard">
          Dashboard
        </a>
        <a
          className="community-shortcut-button"
          href="https://archipelago.crossworldcreative.com"
          rel="noreferrer"
          target="_blank"
        >
          Archipelago
        </a>
        <a
          className="community-shortcut-button"
          href="https://squash.crossworldcreative.com"
          rel="noreferrer"
          target="_blank"
        >
          Squash
        </a>
      </div>
    </section>
  );
}

export default ShortcutsCard;
