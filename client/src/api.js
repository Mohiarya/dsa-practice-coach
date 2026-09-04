// VITE_API_BASE_URL is set at build time (see .env.production / Vercel env
// vars). Falls back to localhost so local `npm run dev` needs no setup.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    // The session lives in an httpOnly cookie, not something this code
    // ever reads or sends itself — "include" is what makes the browser
    // attach/store it on requests to the (cross-origin, in production)
    // API at all.
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  listProblems: () => request("/problems"),
  createProblem: (data) => request("/problems", { method: "POST", body: JSON.stringify(data) }),
  updateProblem: (id, data) => request(`/problems/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProblem: (id) => request(`/problems/${id}`, { method: "DELETE" }),

  dueProblems: () => request("/problems/due"),
  submitReview: (id, quality) =>
    request(`/problems/${id}/review`, { method: "PATCH", body: JSON.stringify({ quality }) }),
  requestHint: (id, stuckPoint) =>
    request(`/problems/${id}/hint`, { method: "POST", body: JSON.stringify({ stuckPoint }) }),

  stats: () => request("/stats"),
  history: () => request("/stats/history"),
  reviewTimeline: () => request("/stats/reviews"),
};
