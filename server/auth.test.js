// Pure/isolated unit tests for auth.js — no HTTP, no real database. The
// integration-level signup/login/ownership behavior is covered separately
// in routes.test.js, against the real app and real (Turso) database.
import { test } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import jwt from "jsonwebtoken";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  isValidEmail,
  isValidPassword,
  claimOrphanedProblemsIfFirstUser,
} from "./auth.js";

test("hashPassword never stores the plaintext password", async () => {
  const hash = await hashPassword("correct-horse-battery-staple");
  assert.notEqual(hash, "correct-horse-battery-staple");
  assert.ok(hash.startsWith("$2"), "should be a bcrypt hash");
});

test("verifyPassword accepts the correct password against its own hash", async () => {
  const hash = await hashPassword("correct-horse-battery-staple");
  assert.equal(await verifyPassword("correct-horse-battery-staple", hash), true);
});

test("verifyPassword rejects an incorrect password", async () => {
  const hash = await hashPassword("correct-horse-battery-staple");
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("hashing the same password twice produces different hashes (salted)", async () => {
  const [h1, h2] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
  assert.notEqual(h1, h2);
});

test("signToken + verifyToken round-trips the user id", () => {
  const token = signToken(42);
  assert.equal(verifyToken(token), 42);
});

test("verifyToken returns null for a missing token", () => {
  assert.equal(verifyToken(undefined), null);
  assert.equal(verifyToken(""), null);
});

test("verifyToken returns null for a garbage/tampered token", () => {
  const token = signToken(1);
  const tampered = token.slice(0, -3) + "xyz";
  assert.equal(verifyToken(tampered), null);
});

test("verifyToken returns null for a token signed with a different secret", () => {
  const foreignToken = jwt.sign({ sub: 1 }, "a-completely-different-secret");
  assert.equal(verifyToken(foreignToken), null);
});

test("isValidEmail accepts a normal address and rejects obvious non-emails", () => {
  assert.equal(isValidEmail("person@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail(undefined), false);
});

test("isValidPassword enforces the minimum length", () => {
  assert.equal(isValidPassword("short"), false);
  assert.equal(isValidPassword("exactly8"), true);
  assert.equal(isValidPassword(undefined), false);
});

test("claimOrphanedProblemsIfFirstUser claims orphaned rows only when this is the very first account", async () => {
  const calls = [];
  const fakePrismaFirstUser = {
    user: { count: async () => 1 },
    problem: {
      updateMany: async (args) => {
        calls.push(args);
        return { count: 3 };
      },
    },
  };
  const claimed = await claimOrphanedProblemsIfFirstUser(fakePrismaFirstUser, 99);
  assert.equal(claimed, 3);
  assert.deepEqual(calls, [{ where: { userId: null }, data: { userId: 99 } }]);
});

test("claimOrphanedProblemsIfFirstUser does nothing when this is not the first account", async () => {
  let updateManyCalled = false;
  const fakePrismaNotFirst = {
    user: { count: async () => 5 },
    problem: { updateMany: async () => { updateManyCalled = true; return { count: 0 }; } },
  };
  const claimed = await claimOrphanedProblemsIfFirstUser(fakePrismaNotFirst, 99);
  assert.equal(claimed, 0);
  assert.equal(updateManyCalled, false, "must not touch Problem rows when this isn't the first account");
});
