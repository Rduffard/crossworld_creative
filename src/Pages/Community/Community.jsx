import { startTransition, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createCommunityContext,
  createCommunitySpace,
  getCommunitySpaces,
  getSpaceThreads,
} from "../../utils/communityApi.js";
import CommunityHeroBar from "./components/CommunityHeroBar.jsx";
import QuickActionsCard from "./components/QuickActionsCard.jsx";
import MembershipCard from "./components/MembershipCard.jsx";
import RecentThreadsCard from "./components/RecentThreadsCard.jsx";
import TrendingSpacesCard from "./components/TrendingSpacesCard.jsx";
import StatsRail from "./components/StatsRail.jsx";
import ShortcutsCard from "./components/ShortcutsCard.jsx";
import CreateSpaceModal from "./components/CreateSpaceModal.jsx";
import "./Community.css";

function getTimestamp(value) {
  return new Date(value || 0).getTime();
}

function isSpaceMemberOfUser(space, userId) {
  if (!space || !userId) return false;

  const ownerId = typeof space.owner === "string" ? space.owner : space.owner?._id;
  const memberIds = (space.members || []).map((member) =>
    typeof member === "string" ? member : member?._id,
  );

  return ownerId === userId || memberIds.includes(userId);
}

function Community() {
  const { isAuthenticated, loaded, user } = useAuth();
  const communityContext = useMemo(() => createCommunityContext(), []);
  const [isVisible, setIsVisible] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [status, setStatus] = useState({
    isLoading: true,
    isSubmitting: false,
    error: "",
  });
  const [communityState, setCommunityState] = useState({
    spaces: [],
    onlineCount: 18,
    recentActivity: [],
    recentThreads: [],
    threadCounts: {},
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    let isMounted = true;

    async function loadCommunity() {
      setStatus((current) => ({ ...current, isLoading: true, error: "" }));

      try {
        const spaces = await getCommunitySpaces({ appKey: communityContext.appKey });
        const activeSpaces = [...spaces].sort(
          (left, right) =>
            getTimestamp(right.lastActiveAt || right.updatedAt) -
            getTimestamp(left.lastActiveAt || left.updatedAt),
        );

        const threadBuckets = await Promise.all(
          activeSpaces.slice(0, 6).map(async (space) => {
            const response = await getSpaceThreads(space._id, {
              appKey: communityContext.appKey,
              sort: "most_active",
              limit: 4,
            }).catch(() => ({ threads: [], pagination: null }));

            return {
              spaceId: space._id,
              total: response?.pagination?.totalItems ?? (response.threads || []).length,
              threads: (response.threads || []).map((thread) => ({
                ...thread,
                spaceName: thread.spaceName || space.name,
                spaceSlug: thread.spaceSlug || space.slug,
                spaceId: thread.spaceId || space._id,
              })),
            };
          }),
        );

        const recentThreads = threadBuckets
          .flatMap((bucket) => bucket.threads)
          .sort(
            (left, right) =>
              getTimestamp(right.lastActivityAt || right.createdAt) -
              getTimestamp(left.lastActivityAt || left.createdAt),
          )
          .slice(0, 8);

        const threadCounts = Object.fromEntries(
          threadBuckets.map((bucket) => [bucket.spaceId, bucket.total]),
        );

        if (!isMounted) return;

        setCommunityState((current) => ({
          ...current,
          spaces,
          recentActivity: activeSpaces.slice(0, 5),
          recentThreads,
          threadCounts,
        }));
        setStatus((current) => ({ ...current, isLoading: false, error: "" }));
      } catch (error) {
        if (!isMounted) return;

        setStatus((current) => ({
          ...current,
          isLoading: false,
          error: error.message,
        }));
      }
    }

    loadCommunity();

    return () => {
      isMounted = false;
    };
  }, [communityContext.appKey, loaded]);

  const memberships = useMemo(() => {
    if (!user?._id) return [];

    return communityState.spaces
      .filter((space) => isSpaceMemberOfUser(space, user._id))
      .sort(
        (left, right) =>
          getTimestamp(right.lastActiveAt || right.updatedAt) -
          getTimestamp(left.lastActiveAt || left.updatedAt),
      )
      .slice(0, 5);
  }, [communityState.spaces, user?._id]);

  const activeSpaces = useMemo(
    () =>
      [...communityState.spaces]
        .sort(
          (left, right) =>
            getTimestamp(right.lastActiveAt || right.updatedAt) -
              getTimestamp(left.lastActiveAt || left.updatedAt) ||
            (right.members?.length || 0) - (left.members?.length || 0),
        )
        .slice(0, 6)
        .map((space) => ({
          ...space,
          threadCount: communityState.threadCounts[space._id],
        })),
    [communityState.spaces, communityState.threadCounts],
  );

  const stats = useMemo(() => {
    const activeThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const activeSpaceCount = communityState.spaces.filter(
      (space) => getTimestamp(space.lastActiveAt || space.updatedAt) >= activeThreshold,
    ).length;

    return {
      totalSpaces: activeSpaceCount || communityState.spaces.length,
      threadsToday: communityState.recentThreads.length,
      membersOnline: communityState.onlineCount,
      joinedSpaces: memberships.length,
    };
  }, [communityState, memberships.length]);

  const publicSpaces = useMemo(
    () => communityState.spaces.filter((space) => space.visibility === "public"),
    [communityState.spaces],
  );

  const primaryThreadSpace = memberships[0] || activeSpaces[0] || communityState.spaces[0] || null;
  const joinableSpace = publicSpaces[0] || activeSpaces[0] || null;

  const latestActivity = useMemo(() => {
    const threadEvents = communityState.recentThreads.slice(0, 4).map((thread) => ({
      id: `thread-${thread._id}`,
      title: thread.title,
      detail: `${thread.spaceName} | ${thread.replyCount ?? 0} replies`,
      timestamp: thread.lastActivityAt || thread.createdAt,
      href: thread.spaceSlug ? `/dashboard/community/spaces/${thread.spaceSlug}` : "/dashboard/community",
      type: "Thread",
    }));

    const spaceEvents = communityState.recentActivity.slice(0, 3).map((space) => ({
      id: `space-${space._id}`,
      title: space.name,
      detail: "Space updated",
      timestamp: space.lastActiveAt || space.updatedAt || space.createdAt,
      href: `/dashboard/community/spaces/${space.slug}`,
      type: "Space",
    }));

    return [...threadEvents, ...spaceEvents]
      .sort((left, right) => getTimestamp(right.timestamp) - getTimestamp(left.timestamp))
      .slice(0, 6);
  }, [communityState.recentActivity, communityState.recentThreads]);

  async function handleCreateSpace(payload) {
    if (!isAuthenticated) {
      setIsCreateOpen(false);
      return;
    }

    setStatus((current) => ({ ...current, isSubmitting: true, error: "" }));

    try {
      const createdSpace = await createCommunitySpace({
        ...payload,
        appKey: communityContext.appKey ?? payload.appKey,
      });

      setCommunityState((current) => ({
        ...current,
        spaces: [createdSpace, ...current.spaces],
        recentActivity: [createdSpace, ...current.recentActivity].slice(0, 5),
      }));
      setStatus((current) => ({ ...current, isSubmitting: false, error: "" }));
      setIsCreateOpen(false);
    } catch (error) {
      setStatus((current) => ({
        ...current,
        isSubmitting: false,
        error: error.message,
      }));
    }
  }

  function handleCreateSpaceClick() {
    startTransition(() => {
      setIsCreateOpen(true);
    });
  }

  if (!loaded) return null;

  return (
    <main className={`community-page ${isVisible ? "community-page--visible" : ""}`}>
      <div className="community-home">
        <CommunityHeroBar
          exploreHref="/dashboard/community#community-active-spaces"
          contextLabel={
            communityContext.scope === "network" ? "Across the Crossworld network" : "App community"
          }
          isAuthenticated={isAuthenticated}
          newThreadHref={
            primaryThreadSpace ? `/dashboard/community/spaces/${primaryThreadSpace.slug}` : "/dashboard/community"
          }
          onCreateSpace={handleCreateSpaceClick}
          stats={stats}
        />

        {status.error ? (
          <section className="community-status community-status--error">
            <strong>Community signal disrupted</strong>
            <span>{status.error}</span>
          </section>
        ) : null}

        <section className="community-dashboard">
          <div className="community-dashboard__main">
            <RecentThreadsCard isLoading={status.isLoading} threads={communityState.recentThreads} />
            <TrendingSpacesCard isLoading={status.isLoading} spaces={activeSpaces} />
          </div>

          <div className="community-dashboard__rail">
            <QuickActionsCard
              isAuthenticated={isAuthenticated}
              joinSpaceHref={
                joinableSpace
                  ? `/dashboard/community/spaces/${joinableSpace.slug}`
                  : "/dashboard/community#community-active-spaces"
              }
              newThreadHref={
                primaryThreadSpace ? `/dashboard/community/spaces/${primaryThreadSpace.slug}` : "/dashboard/community"
              }
              onCreateSpace={handleCreateSpaceClick}
            />
            <MembershipCard
              isAuthenticated={isAuthenticated}
              memberships={memberships}
              user={user}
            />
            <StatsRail activities={latestActivity} />
            <ShortcutsCard />
          </div>
        </section>
      </div>

      <CreateSpaceModal
        isOpen={isCreateOpen}
        isSubmitting={status.isSubmitting}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSpace}
      />
    </main>
  );
}

export default Community;
