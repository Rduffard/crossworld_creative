import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCommunitySpace, getSpaceThreads } from "../../utils/communityApi.js";
import "./Community.css";

function formatRelativeTime(value) {
  if (!value) return "Quiet for now";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function CommunitySpace() {
  const { spaceSlug } = useParams();
  const [state, setState] = useState({
    space: null,
    threads: [],
    pagination: null,
    isLoading: true,
    error: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSpace() {
      setState((current) => ({ ...current, isLoading: true, error: "" }));

      try {
        const space = await getCommunitySpace(spaceSlug);
        const threadResponse = await getSpaceThreads(space._id, {
          sort: "most_active",
          limit: 12,
        });

        if (!isMounted) return;

        setState({
          space,
          threads: threadResponse.threads || [],
          pagination: threadResponse.pagination || null,
          isLoading: false,
          error: "",
        });
      } catch (error) {
        if (!isMounted) return;

        setState((current) => ({
          ...current,
          isLoading: false,
          error: error.message,
        }));
      }
    }

    loadSpace();

    return () => {
      isMounted = false;
    };
  }, [spaceSlug]);

  const stats = useMemo(() => {
    return {
      members: state.space?.members?.length ?? 0,
      threads: state.pagination?.totalItems ?? state.threads.length,
      activity: formatRelativeTime(state.space?.lastActiveAt),
    };
  }, [state]);

  return (
    <main className="community-page community-space-page community-page--visible">
      <nav className="community-space-breadcrumbs">
        <Link to="/dashboard/community">Community</Link>
        <span>/</span>
        <span>{state.space?.name || "Space"}</span>
      </nav>

      <section className="community-space-hero">
        <div className="community-space-hero__copy">
          <span className="community-eyebrow">Network Space</span>
          <div className="community-space-hero__identity">
            <span className="community-space-hero__icon" aria-hidden="true">
              {state.space?.icon || state.space?.name?.slice(0, 1) || "C"}
            </span>
            <div>
              <h1>{state.space?.name || "Loading space..."}</h1>
              <p>
                {state.space?.description ||
                  "A shared network space for sharper questions, better notes, and live collaboration."}
              </p>
            </div>
          </div>
        </div>

        <div className="community-space-hero__meta">
          <span className={`community-badge ${state.space?.visibility === "private" ? "is-private" : "is-public"}`}>
            {state.space?.visibility || "public"}
          </span>
          <span className="community-badge">{state.space?.joinMode || "request"} access</span>
          <div className="community-space-hero__stats">
            <div className="community-stat-card">
              <span>Members</span>
              <strong>{stats.members}</strong>
            </div>
            <div className="community-stat-card">
              <span>Threads</span>
              <strong>{stats.threads}</strong>
            </div>
            <div className="community-stat-card">
              <span>Latest Activity</span>
              <strong>{stats.activity}</strong>
            </div>
          </div>
        </div>
      </section>

      {state.isLoading ? (
        <section className="community-space-thread-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="community-space-thread-card community-space-thread-card--skeleton" />
          ))}
        </section>
      ) : null}

      {state.error ? (
        <section className="community-status community-status--error">
          <strong>Unable to open this space</strong>
          <span>{state.error}</span>
        </section>
      ) : null}

      {!state.isLoading && !state.error ? (
        <section className="community-space-layout">
          <section className="community-space-main">
            <header className="community-section-heading">
              <div>
                <span className="community-eyebrow">Threads</span>
                <h2>Most active conversations right now</h2>
              </div>
            </header>

            {state.threads.length ? (
              <div className="community-space-thread-grid">
                {state.threads.map((thread) => (
                  <article key={thread._id} className="community-space-thread-card">
                    <div className="community-space-thread-card__meta">
                      <span className="community-badge">{thread.replyCount ?? 0} replies</span>
                      {thread.pinned ? <span className="community-badge is-trending">Pinned</span> : null}
                    </div>
                    <h3>{thread.title}</h3>
                    <p>{thread.body || "A thread waiting for the next useful response."}</p>
                    <div className="community-space-thread-card__footer">
                      <span>{thread.author?.name || "Crossworld Member"}</span>
                      <span>{formatRelativeTime(thread.lastActivityAt || thread.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="community-empty-state community-panel">
                <span className="community-eyebrow">No Threads Yet</span>
                <h3>This space is ready for its first signal.</h3>
                <p>The shape is here. The conversation just needs its opening move.</p>
              </div>
            )}
          </section>

          <aside className="community-space-side">
            <section className="community-panel community-right-rail__card">
              <span className="community-eyebrow">Space Overview</span>
              <div className="community-activity-list">
                <article className="community-activity-item">
                  <strong>Visibility</strong>
                  <span>{state.space?.visibility}</span>
                </article>
                <article className="community-activity-item">
                  <strong>Join Mode</strong>
                  <span>{state.space?.joinMode}</span>
                </article>
                <article className="community-activity-item">
                  <strong>Owner</strong>
                  <span>{state.space?.owner?.name || state.space?.owner?.email || "Network team"}</span>
                </article>
              </div>
            </section>

            <section className="community-panel community-right-rail__card">
              <span className="community-eyebrow">Where Next</span>
              <p className="community-muted-copy">
                This view is ready for thread detail, live updates, and membership controls as more
                frontends plug into the same Community API.
              </p>
              <Link className="community-button community-button--secondary" to="/dashboard/community">
                Back To Community Hub
              </Link>
            </section>
          </aside>
        </section>
      ) : null}
    </main>
  );
}

export default CommunitySpace;
