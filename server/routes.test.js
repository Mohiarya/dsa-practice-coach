// Integration tests against the real Express app + real database (Turso,
// same as production — this project has no separate test database). Every
// test creates its own throwaway user(s)/problem(s) and deletes them again,
// so nothing is left behind regardless of pass/fail. Emails/titles are
// `__test__`-prefixed so any leftover rows are easy to spot and never
// collide with real data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import "dotenv/config";
import { app } from "./app.js";
import { prisma } from "./db.js";
import { QUALITY } from "./sm2.js";

const server = createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const BASE = `http://localhost:${server.address().port}/api`;

// claimOrphanedProblemsIfFirstUser (see auth.js) hands any pre-existing
// userId-less problem to the very first account ever created. The real
// production database currently has exactly one such row (the app's one
// real user's own problem) — it must NEVER be claimed by a test account.
// Guaranteeing a user already exists before any test signs up makes that
// impossible: idempotent (unique email), so safe to re-run.
try {
  await prisma.user.create({
    data: { email: "__test_buffer__@example.com", passwordHash: "x", name: "buffer" },
  });
} catch {
  // already exists from a previous run — fine, that's the point
}

async function signupUser(email) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "correct-horse-battery-staple" }),
  });
  const setCookie = res.headers.get("set-cookie");
  const user = await res.json();
  return { status: res.status, cookie: setCookie ? setCookie.split(";")[0] : null, user };
}

function authed(cookie, options = {}) {
  return {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers, Cookie: cookie },
  };
}

const testUsers = [];
let userA, cookieA, userB, cookieB;

test.before(async () => {
  const a = await signupUser("__test_user_a__@example.com");
  const b = await signupUser("__test_user_b__@example.com");
  userA = a.user;
  cookieA = a.cookie;
  userB = b.user;
  cookieB = b.cookie;
  testUsers.push(userA.id, userB.id);
});

async function createTestProblem(cookie, overrides = {}) {
  const res = await fetch(
    `${BASE}/problems`,
    authed(cookie, {
      method: "POST",
      body: JSON.stringify({
        title: "__test__ integration problem",
        pattern: "__test-pattern__",
        difficulty: "Easy",
        ...overrides,
      }),
    })
  );
  return res.json();
}

async function deleteTestProblem(cookie, id) {
  await fetch(`${BASE}/problems/${id}`, authed(cookie, { method: "DELETE" }));
}

// ---------------------------------------------------------------------
// Auth: signup / login / logout / session
// ---------------------------------------------------------------------

test("signup rejects an invalid email", async () => {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "correct-horse-battery-staple" }),
  });
  assert.equal(res.status, 400);
});

test("signup rejects a too-short password", async () => {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "__test_shortpw__@example.com", password: "short" }),
  });
  assert.equal(res.status, 400);
});

test("signup rejects a duplicate email", async () => {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userA.email, password: "correct-horse-battery-staple" }),
  });
  assert.equal(res.status, 409);
});

test("signup never returns a password hash to the client", async () => {
  const { user } = await signupUser("__test_no_hash_leak__@example.com");
  assert.equal(user.passwordHash, undefined);
  testUsers.push(user.id);
});

test("login with correct credentials succeeds and sets a session cookie", async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userA.email, password: "correct-horse-battery-staple" }),
  });
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("set-cookie"), "login must set a session cookie");
});

test("login with wrong password fails with a generic message", async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userA.email, password: "totally-wrong-password" }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "Invalid email or password");
});

test("login with a nonexistent email fails with the SAME generic message (no user enumeration)", async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "__test_nobody_here__@example.com", password: "whatever12345" }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "Invalid email or password");
});

test("GET /auth/me returns the current user when authenticated", async () => {
  const res = await fetch(`${BASE}/auth/me`, authed(cookieA));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.email, userA.email);
});

test("GET /auth/me returns 401 with no session cookie", async () => {
  const res = await fetch(`${BASE}/auth/me`);
  assert.equal(res.status, 401);
});

test("logout clears the session — a subsequent /auth/me is unauthenticated", async () => {
  const { cookie } = await signupUser("__test_logout_flow__@example.com");
  const meBefore = await fetch(`${BASE}/auth/me`, authed(cookie));
  assert.equal(meBefore.status, 200);

  const logoutRes = await fetch(`${BASE}/auth/logout`, authed(cookie, { method: "POST" }));
  assert.equal(logoutRes.status, 204);

  // The client discards the cookie on logout; simulate that by not
  // resending it — this is what "logged out" actually means client-side.
  const meAfter = await fetch(`${BASE}/auth/me`);
  assert.equal(meAfter.status, 401);
});

// ---------------------------------------------------------------------
// Protected routes require auth at all
// ---------------------------------------------------------------------

test("GET /problems with no session returns 401", async () => {
  const res = await fetch(`${BASE}/problems`);
  assert.equal(res.status, 401);
});

test("GET /stats with no session returns 401", async () => {
  const res = await fetch(`${BASE}/stats`);
  assert.equal(res.status, 401);
});

// ---------------------------------------------------------------------
// Ownership: a user only ever sees/touches their own data
// ---------------------------------------------------------------------

test("a newly created problem is scoped to the authenticated user", async () => {
  const problem = await createTestProblem(cookieA);
  try {
    assert.equal(problem.userId, userA.id);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("GET /problems only ever returns the authenticated user's own problems", async () => {
  const problemA = await createTestProblem(cookieA);
  const problemB = await createTestProblem(cookieB);
  try {
    const listA = await fetch(`${BASE}/problems`, authed(cookieA)).then((r) => r.json());
    const listB = await fetch(`${BASE}/problems`, authed(cookieB)).then((r) => r.json());
    assert.ok(listA.some((p) => p.id === problemA.id));
    assert.ok(!listA.some((p) => p.id === problemB.id), "user A must not see user B's problem");
    assert.ok(listB.some((p) => p.id === problemB.id));
    assert.ok(!listB.some((p) => p.id === problemA.id), "user B must not see user A's problem");
  } finally {
    await deleteTestProblem(cookieA, problemA.id);
    await deleteTestProblem(cookieB, problemB.id);
  }
});

test("user B cannot GET user A's problem by guessing its id (via /due, indirectly) or edit it", async () => {
  const problemA = await createTestProblem(cookieA);
  try {
    const putRes = await fetch(
      `${BASE}/problems/${problemA.id}`,
      authed(cookieB, {
        method: "PUT",
        body: JSON.stringify({ title: "hijacked", pattern: "x", difficulty: "Easy" }),
      })
    );
    assert.equal(putRes.status, 404, "editing someone else's problem must 404, not succeed or 403");

    const stillOwnedByA = await prisma.problem.findUnique({ where: { id: problemA.id } });
    assert.equal(stillOwnedByA.title, "__test__ integration problem", "user B's PUT must not have changed anything");
  } finally {
    await deleteTestProblem(cookieA, problemA.id);
  }
});

test("user B cannot delete user A's problem", async () => {
  const problemA = await createTestProblem(cookieA);
  try {
    const delRes = await fetch(`${BASE}/problems/${problemA.id}`, authed(cookieB, { method: "DELETE" }));
    assert.equal(delRes.status, 404);

    const stillThere = await prisma.problem.findUnique({ where: { id: problemA.id } });
    assert.ok(stillThere, "user A's problem must still exist after user B's failed delete attempt");
  } finally {
    await deleteTestProblem(cookieA, problemA.id);
  }
});

test("user B cannot submit a review against user A's problem", async () => {
  const problemA = await createTestProblem(cookieA);
  try {
    const res = await fetch(
      `${BASE}/problems/${problemA.id}/review`,
      authed(cookieB, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) })
    );
    assert.equal(res.status, 404);

    const reviews = await prisma.review.findMany({ where: { problemId: problemA.id } });
    assert.equal(reviews.length, 0, "user B's forbidden review attempt must not have created a Review row");
  } finally {
    await deleteTestProblem(cookieA, problemA.id);
  }
});

test("user B cannot request a hint on user A's problem", async () => {
  const problemA = await createTestProblem(cookieA);
  try {
    const res = await fetch(
      `${BASE}/problems/${problemA.id}/hint`,
      authed(cookieB, { method: "POST", body: JSON.stringify({ stuckPoint: "trying to peek" }) })
    );
    assert.equal(res.status, 404);
  } finally {
    await deleteTestProblem(cookieA, problemA.id);
  }
});

test("GET /stats and /stats/history are scoped per user — B's activity never inflates A's numbers", async () => {
  const problemA = await createTestProblem(cookieA);
  const problemB = await createTestProblem(cookieB, { pattern: "__test-pattern-B__" });
  try {
    await fetch(`${BASE}/problems/${problemA.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) }));
    await fetch(`${BASE}/problems/${problemB.id}/review`, authed(cookieB, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) }));
    await fetch(`${BASE}/problems/${problemB.id}/review`, authed(cookieB, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.EASY }) }));

    const statsA = await fetch(`${BASE}/stats`, authed(cookieA)).then((r) => r.json());
    const historyA = await fetch(`${BASE}/stats/history`, authed(cookieA)).then((r) => r.json());
    const reviewsA = await fetch(`${BASE}/stats/reviews`, authed(cookieA)).then((r) => r.json());

    assert.equal(statsA.total, 1, "user A's total must only count their own problem");
    assert.equal(historyA.totalReviews, 1, "user A's history must only count their own review");
    assert.ok(!reviewsA.some((r) => r.problemId === problemB.id), "user A's timeline must never include user B's review");
    assert.ok(!historyA.performanceByPattern.some((p) => p.key === "__test-pattern-B__"));
  } finally {
    await deleteTestProblem(cookieA, problemA.id);
    await deleteTestProblem(cookieB, problemB.id);
  }
});

// ---------------------------------------------------------------------
// Existing problem/review/SM-2/analytics behavior, now under auth
// ---------------------------------------------------------------------

test("PATCH /:id/review creates a Review row alongside updating Problem state", async () => {
  const problem = await createTestProblem(cookieA);
  try {
    const res = await fetch(
      `${BASE}/problems/${problem.id}/review`,
      authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) })
    );
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.repetitions, 1);
    assert.equal(updated.status, "solved");

    const reviews = await prisma.review.findMany({ where: { problemId: problem.id } });
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].quality, QUALITY.GOOD);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("two reviews on the same problem create two Review rows, both preserved", async () => {
  const problem = await createTestProblem(cookieA);
  try {
    await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.AGAIN }) }));
    await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.EASY }) }));

    const reviews = await prisma.review.findMany({ where: { problemId: problem.id }, orderBy: { id: "asc" } });
    assert.equal(reviews.length, 2);
    assert.deepEqual(reviews.map((r) => r.quality), [QUALITY.AGAIN, QUALITY.EASY]);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("PUT /:id edits editable fields but leaves SM-2 state and status untouched", async () => {
  const problem = await createTestProblem(cookieA);
  try {
    await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) }));

    const res = await fetch(
      `${BASE}/problems/${problem.id}`,
      authed(cookieA, {
        method: "PUT",
        body: JSON.stringify({
          title: "__test__ renamed",
          pattern: "__test-pattern-2__",
          difficulty: "Hard",
          url: "https://example.com",
          notes: "edited",
        }),
      })
    );
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.title, "__test__ renamed");
    assert.equal(updated.pattern, "__test-pattern-2__");
    assert.equal(updated.difficulty, "Hard");
    // SM-2 state from the earlier review must survive the edit untouched.
    assert.equal(updated.repetitions, 1);
    assert.equal(updated.status, "solved");
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("PUT /:id rejects a missing required field, same validation as create", async () => {
  const problem = await createTestProblem(cookieA);
  try {
    const res = await fetch(
      `${BASE}/problems/${problem.id}`,
      authed(cookieA, { method: "PUT", body: JSON.stringify({ title: "", pattern: "x", difficulty: "Easy" }) })
    );
    assert.equal(res.status, 400);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("PUT /:id on a nonexistent problem returns 404", async () => {
  const res = await fetch(
    `${BASE}/problems/999999999`,
    authed(cookieA, { method: "PUT", body: JSON.stringify({ title: "x", pattern: "x", difficulty: "Easy" }) })
  );
  assert.equal(res.status, 404);
});

test("DELETE /:id removes the problem and cascades to its Review history", async () => {
  const problem = await createTestProblem(cookieA);
  await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) }));

  const res = await fetch(`${BASE}/problems/${problem.id}`, authed(cookieA, { method: "DELETE" }));
  assert.equal(res.status, 204);

  const stillThere = await prisma.problem.findUnique({ where: { id: problem.id } });
  assert.equal(stillThere, null);

  const orphanedReviews = await prisma.review.findMany({ where: { problemId: problem.id } });
  assert.equal(orphanedReviews.length, 0, "reviews for a deleted problem must not survive it");
});

test("DELETE /:id on a nonexistent problem returns 404", async () => {
  const res = await fetch(`${BASE}/problems/999999999`, authed(cookieA, { method: "DELETE" }));
  assert.equal(res.status, 404);
});

test("GET /stats/history reflects real review data for a freshly created problem", async () => {
  const problem = await createTestProblem(cookieA, { pattern: "__test-history-pattern__" });
  try {
    await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.EASY }) }));

    const res = await fetch(`${BASE}/stats/history`, authed(cookieA));
    assert.equal(res.status, 200);
    const history = await res.json();

    assert.ok(history.totalReviews >= 1);
    const ourPattern = history.performanceByPattern.find((p) => p.key === "__test-history-pattern__");
    assert.ok(ourPattern, "our test pattern should appear in performanceByPattern");
    assert.equal(ourPattern.totalReviews, 1);
    assert.equal(ourPattern.successRate, 100);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("GET /stats/reviews returns the review timeline with problem context", async () => {
  const problem = await createTestProblem(cookieA);
  try {
    await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.HARD }) }));

    const res = await fetch(`${BASE}/stats/reviews`, authed(cookieA));
    assert.equal(res.status, 200);
    const reviews = await res.json();
    const ours = reviews.find((r) => r.problemId === problem.id);
    assert.ok(ours, "our review should be in the timeline");
    assert.equal(ours.problem.id, problem.id);
    assert.equal(ours.quality, QUALITY.HARD);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test("GET /stats streak is computed from Review rows, not just problem existence", async () => {
  const before = await fetch(`${BASE}/stats`, authed(cookieA)).then((r) => r.json());
  const problem = await createTestProblem(cookieA);
  try {
    await fetch(`${BASE}/problems/${problem.id}/review`, authed(cookieA, { method: "PATCH", body: JSON.stringify({ quality: QUALITY.GOOD }) }));
    const after = await fetch(`${BASE}/stats`, authed(cookieA)).then((r) => r.json());
    // A review just happened today, so streak must be at least 1 and can
    // only have grown (never shrunk) relative to before this review.
    assert.ok(after.streak >= 1);
    assert.ok(after.streak >= before.streak);
  } finally {
    await deleteTestProblem(cookieA, problem.id);
  }
});

test.after(async () => {
  // Belt-and-braces cleanup in case any test above threw before its own
  // finally ran — never leave __test__-prefixed rows in the real database.
  const leftoverProblems = await prisma.problem.findMany({ where: { title: { startsWith: "__test__" } } });
  for (const p of leftoverProblems) {
    await prisma.review.deleteMany({ where: { problemId: p.id } });
    await prisma.problem.delete({ where: { id: p.id } });
  }

  const leftoverUsers = await prisma.user.findMany({ where: { email: { startsWith: "__test" } } });
  for (const u of leftoverUsers) {
    await prisma.problem.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }

  server.close();
  await prisma.$disconnect();
});
