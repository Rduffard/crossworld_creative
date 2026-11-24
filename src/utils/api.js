// src/utils/api.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const STORAGE_KEY = "cw_auth";

function getToken() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

async function request(
  path,
  { method = "GET", body, auth = false, headers: extraHeaders, signal, cache } = {},
) {
  const headers = {
    ...(extraHeaders || {}),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    cache,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const message =
      (data && data.message) ||
      (data && data.error) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export { request as requestJson };

export async function requestPrivateMedia(path, { method = "GET", body, signal } = {}) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers["Content-Type"] = "application/octet-stream";
  const response = await fetch(`${API_BASE}/operations/media${path}`, {
    method, headers, body, signal, cache: "no-store", redirect: "error",
  });
  if (!response.ok) {
    const message = await response.json().catch(() => null);
    throw Object.assign(new Error(message?.message || `Media transfer failed (${response.status}).`), { status: response.status });
  }
  return response;
}

export const api = {
  signup: ({ name, avatar, email, password }) =>
    request("/auth/signup", {
      method: "POST",
      body: { name, avatar, email, password },
      auth: false,
    }),

  signin: ({ email, password }) =>
    request("/auth/signin", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  getMe: () =>
    request("/users/me", {
      method: "GET",
      auth: true,
    }),

  updateMe: ({ name, avatar }) =>
    request("/users/me", {
      method: "PATCH",
      body: { name, avatar },
      auth: true,
    }),

  updateAccount: (account) =>
    request("/auth/users/me", {
      method: "PATCH",
      body: account,
      auth: true,
    }),

  getUserSettings: () =>
    request("/auth/users/me/settings", {
      method: "GET",
      auth: true,
    }),

  updateUserSettings: (settings) =>
    request("/auth/users/me/settings", {
      method: "PATCH",
      body: settings,
      auth: true,
    }),

  updatePassword: (passwords) =>
    request("/auth/users/me/password", {
      method: "PATCH",
      body: passwords,
      auth: true,
    }),
};
