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
  { method = "GET", body, auth = false, headers: extraHeaders } = {},
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

export const api = {
  // ✅ matches your backend exactly
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
    request("/auth/users/me", {
      method: "GET",
      auth: true,
    }),

  updateMe: ({ name, avatar }) =>
    request("/auth/users/me", {
      method: "PATCH",
      body: { name, avatar },
      auth: true,
    }),
};
