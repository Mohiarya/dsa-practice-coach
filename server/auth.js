// Auth primitives: password hashing, JWT session tokens, and basic input
// validation. Kept deliberately small — no session table, no OAuth, no
// roles/permissions system. This is a personal single-owner learning app,
// not an enterprise product, and the security bar that actually matters
// here is: passwords are never stored in plaintext, and one account can
// never read or write another account's data (enforced in the routes via
// requireAuth + explicit userId filters, not here).

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = "30d"; // "persistent session" per product decision

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set — refusing to sign/verify tokens without it");
  }
  return secret;
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: TOKEN_EXPIRY });
}

/** Returns the userId encoded in a valid token, or null if it's missing/invalid/expired. */
export function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret());
    return payload.sub;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email);
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

/**
 * The app had exactly one real Problem row before accounts existed. Rather
 * than guess at a migration script with invented credentials, ownership is
 * resolved deliberately at runtime: the very first account ever created
 * claims any pre-existing rows with no owner (userId null), once. Every
 * problem/stats route requires auth and filters by userId, so an
 * unclaimed row is invisible to everyone (including the eventual owner)
 * until this runs — it's never exposed, never deleted, just quietly
 * waiting. Safe here specifically because nobody but the app's one real
 * user will ever sign up before this fires (the app isn't deployed/public
 * yet at the time this was written).
 */
export async function claimOrphanedProblemsIfFirstUser(prisma, newUserId) {
  const userCount = await prisma.user.count();
  if (userCount !== 1) return 0; // not the first account — nothing to claim

  const result = await prisma.problem.updateMany({
    where: { userId: null },
    data: { userId: newUserId },
  });
  return result.count;
}
