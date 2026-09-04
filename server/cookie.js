// Shared cookie config for the session token, used by both routes/auth.js
// (to set/clear it) and middleware.js (implicitly, via the name).
export const COOKIE_NAME = "token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Cross-site cookies (Vercel frontend, Render backend — different
// registrable domains) require SameSite=None + Secure to be sent at all.
// Locally, frontend and backend are different ports on localhost, which
// browsers treat as same-site — Lax works there and doesn't need HTTPS.
const isProduction = process.env.NODE_ENV === "production";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: THIRTY_DAYS_MS,
    path: "/",
  };
}
