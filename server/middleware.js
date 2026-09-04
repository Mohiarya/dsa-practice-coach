import { verifyToken } from "./auth.js";
import { COOKIE_NAME } from "./cookie.js";

// Attaches req.userId from the signed session cookie, or rejects the
// request outright. Every problem/stats route uses this — there is no
// "trust a userId the frontend sent" path anywhere in this app.
export function requireAuth(req, res, next) {
  const userId = verifyToken(req.cookies?.[COOKIE_NAME]);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = userId;
  next();
}
