import { requestJson } from "./api.js";

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id ?? value.id ?? null;
}

function initialsFromName(name) {
  if (!name) return "CW";

  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeAuthor(author) {
  const name = author?.name ?? author?.username ?? author?.email ?? "Community member";

  return {
    _id: normalizeId(author),
    id: normalizeId(author),
    name,
    email: author?.email ?? "",
    avatar: author?.avatar ?? "",
    initials: initialsFromName(name),
  };
}

function normalizeSpace(space, overrides = {}) {
  return {
    _id: space?._id ?? space?.id ?? "",
    id: space?._id ?? space?.id ?? "",
    name: space?.name ?? "Untitled Space",
    slug: space?.slug ?? "",
    description: space?.description ?? "",
    icon: space?.icon ?? "",
    visibility: space?.visibility ?? "public",
    joinMode: space?.joinMode ?? "request",
    appKey: space?.appKey ?? "global",
    owner: space?.owner ?? null,
    members: Array.isArray(space?.members) ? space.members : [],
    memberRequests: Array.isArray(space?.memberRequests) ? space.memberRequests : [],
    createdAt: space?.createdAt ?? null,
    updatedAt: space?.updatedAt ?? null,
    lastActiveAt: space?.lastActiveAt ?? space?.updatedAt ?? space?.createdAt ?? null,
    threadCount: overrides.threadCount ?? space?.threadCount,
  };
}

function normalizeThread(thread, overrides = {}) {
  const rawSpace =
    thread?.spaceId && typeof thread.spaceId === "object" ? thread.spaceId : overrides.space ?? null;

  return {
    _id: thread?._id ?? thread?.id ?? "",
    id: thread?._id ?? thread?.id ?? "",
    title: thread?.title ?? "Untitled Thread",
    body: thread?.body ?? "",
    createdAt: thread?.createdAt ?? null,
    updatedAt: thread?.updatedAt ?? null,
    lastActivityAt: thread?.lastActivityAt ?? thread?.updatedAt ?? thread?.createdAt ?? null,
    pinned: Boolean(thread?.pinned ?? thread?.isPinned),
    locked: Boolean(thread?.locked ?? thread?.isLocked),
    replyCount: thread?.replyCount ?? overrides.replyCount ?? 0,
    author: normalizeAuthor(thread?.author),
    spaceId: normalizeId(rawSpace) ?? normalizeId(thread?.spaceId) ?? overrides.spaceId ?? "",
    spaceSlug: rawSpace?.slug ?? overrides.spaceSlug ?? "",
    spaceName: rawSpace?.name ?? overrides.spaceName ?? "",
    space: rawSpace ? normalizeSpace(rawSpace) : overrides.space ?? null,
  };
}

function normalizeComment(comment) {
  return {
    _id: comment?._id ?? comment?.id ?? "",
    id: comment?._id ?? comment?.id ?? "",
    body: comment?.body ?? "",
    createdAt: comment?.createdAt ?? null,
    updatedAt: comment?.updatedAt ?? null,
    threadId: normalizeId(comment?.threadId) ?? "",
    author: normalizeAuthor(comment?.author),
  };
}

function matchesAppContext(space, appKey) {
  if (!appKey) return true;

  const normalized = String(appKey).toLowerCase();
  const spaceKey = String(space?.appKey ?? "global").toLowerCase();

  return (
    spaceKey === normalized ||
    spaceKey === "global" ||
    spaceKey === "crossworld"
  );
}

export async function getCommunitySpaces({ appKey = null, search = "" } = {}) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const spaces = await requestJson(`/community/spaces${query}`, {
    method: "GET",
    auth: true,
  });

  return (spaces ?? [])
    .map((space) => normalizeSpace(space))
    .filter((space) => matchesAppContext(space, appKey));
}

export async function getCommunitySpace(spaceSlug) {
  const space = await requestJson(`/community/spaces/${encodeURIComponent(spaceSlug)}`, {
    method: "GET",
    auth: true,
  });

  return normalizeSpace(space);
}

export async function getSpaceThreads(
  spaceId,
  { appKey = null, sort = "most_active", search = "", page = 1, limit = 10 } = {},
) {
  const params = new URLSearchParams({
    sort,
    search,
    page: String(page),
    limit: String(limit),
  });

  const response = await requestJson(`/community/spaces/${spaceId}/threads?${params.toString()}`, {
    method: "GET",
    auth: true,
  });

  const normalizedSpace = response?.space ? normalizeSpace(response.space) : null;

  if (appKey && normalizedSpace && !matchesAppContext(normalizedSpace, appKey)) {
    return {
      space: normalizedSpace,
      threads: [],
      pagination: response?.pagination ?? null,
      filters: response?.filters ?? { sort, search, page, limit },
    };
  }

  return {
    space: normalizedSpace,
    threads: (response?.threads ?? []).map((thread) =>
      normalizeThread(thread, {
        space: normalizedSpace,
        spaceId: normalizedSpace?._id ?? spaceId,
        spaceSlug: normalizedSpace?.slug ?? "",
        spaceName: normalizedSpace?.name ?? "",
      }),
    ),
    pagination: response?.pagination ?? null,
    filters: response?.filters ?? { sort, search, page, limit },
  };
}

export async function createCommunitySpace(data) {
  const response = await requestJson("/community/spaces", {
    method: "POST",
    body: data,
    auth: true,
  });

  return normalizeSpace(response);
}

export async function createThread(spaceId, data) {
  const response = await requestJson(`/community/spaces/${spaceId}/threads`, {
    method: "POST",
    body: data,
    auth: true,
  });

  return normalizeThread(response, { spaceId });
}

export async function getThreadComments(threadId) {
  const response = await requestJson(`/community/threads/${threadId}/comments`, {
    method: "GET",
    auth: true,
  });

  return {
    comments: (response?.comments ?? response ?? []).map((comment) => normalizeComment(comment)),
    pagination: response?.pagination ?? null,
  };
}

export async function createComment(threadId, data) {
  const response = await requestJson(`/community/threads/${threadId}/comments`, {
    method: "POST",
    body: data,
    auth: true,
  });

  return normalizeComment(response);
}

export function createCommunityContext(appKey = null) {
  return {
    appKey,
    scope: appKey ? "app" : "network",
  };
}
