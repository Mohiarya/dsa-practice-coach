import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware.js";
import { COOKIE_NAME, sessionCookieOptions } from "../cookie.js";
import {
  hashPassword,
  verifyPassword,
  signToken,
  isValidEmail,
  isValidPassword,
  claimOrphanedProblemsIfFirstUser,
} from "../auth.js";

export const authRouter = Router();

// Signup/login both do real password work (bcrypt is intentionally slow)
// and are unauthenticated by definition — worth capping per IP the same
// way the hint endpoint already is, so this can't be used to hammer the
// database or brute-force a password.
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts — please wait a few minutes and try again." },
});

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

authRouter.post("/signup", authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null },
  });

  // See auth.js: only ever fires for the very first account, and only
  // once — deliberately, not incidentally.
  await claimOrphanedProblemsIfFirstUser(prisma, user.id);

  res.cookie(COOKIE_NAME, signToken(user.id), sessionCookieOptions());
  res.status(201).json(publicUser(user));
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Same generic error either way — never reveal whether the email exists.
  const invalid = () => res.status(401).json({ error: "Invalid email or password" });

  if (typeof email !== "string" || typeof password !== "string") return invalid();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return invalid();

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return invalid();

  res.cookie(COOKIE_NAME, signToken(user.id), sessionCookieOptions());
  res.json(publicUser(user));
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, sessionCookieOptions());
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    // Token is valid but the account is gone — treat as logged out.
    res.clearCookie(COOKIE_NAME, sessionCookieOptions());
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json(publicUser(user));
});
