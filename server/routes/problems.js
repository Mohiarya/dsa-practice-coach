import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db.js";
import { nextReviewState, QUALITY } from "../sm2.js";
import { getHint } from "../hint.js";

export const problemsRouter = Router();

const VALID_QUALITIES = Object.values(QUALITY);

// Each hint request costs a real Gemini API call against our quota — this
// limit predates auth and stays exactly as tight now that auth exists too;
// a logged-in account is not a reason to relax it.
const hintLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many hint requests — please wait a few minutes and try again." },
});

// Every route below runs after requireAuth (mounted in app.js), so
// req.userId is always a real, verified id from the session cookie —
// never a value the client supplied. Every query is scoped to it.
// findFirst({ id, userId }) is used (not findUnique({ id }) + a separate
// ownership check) so a problem belonging to someone else looks
// identical to a nonexistent one: a plain 404, nothing to distinguish.

// Create a new problem entry, owned by the authenticated user
problemsRouter.post("/", async (req, res) => {
  const { title, url, pattern, difficulty, notes, status } = req.body;

  if (!title || !pattern || !difficulty) {
    return res.status(400).json({ error: "title, pattern, and difficulty are required" });
  }

  const problem = await prisma.problem.create({
    data: { title, url, pattern, difficulty, notes, status, userId: req.userId },
  });

  res.status(201).json(problem);
});

// List the authenticated user's problems, most recently created first
problemsRouter.get("/", async (req, res) => {
  const problems = await prisma.problem.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(problems);
});

// This user's problems whose next scheduled review is today or earlier
problemsRouter.get("/due", async (req, res) => {
  const dueProblems = await prisma.problem.findMany({
    where: { userId: req.userId, nextReviewDate: { lte: new Date() } },
    orderBy: { nextReviewDate: "asc" },
  });
  res.json(dueProblems);
});

// Record a review: how well did you recall this problem just now?
problemsRouter.patch("/:id/review", async (req, res) => {
  const id = Number(req.params.id);
  const { quality } = req.body;

  if (!VALID_QUALITIES.includes(quality)) {
    return res.status(400).json({ error: `quality must be one of: ${VALID_QUALITIES.join(", ")}` });
  }

  const problem = await prisma.problem.findFirst({ where: { id, userId: req.userId } });
  if (!problem) {
    return res.status(404).json({ error: "problem not found" });
  }

  const nextState = nextReviewState(problem, quality);

  // Update the problem's current SM-2 state AND append a Review history
  // record together, atomically — either both happen or neither does, so
  // the history log can never drift out of sync with the live schedule.
  const [updated] = await prisma.$transaction([
    prisma.problem.update({
      where: { id },
      data: {
        easeFactor: nextState.easeFactor,
        interval: nextState.interval,
        repetitions: nextState.repetitions,
        nextReviewDate: nextState.nextReviewDate,
        status: quality < QUALITY.HARD ? "stuck" : "solved",
      },
    }),
    prisma.review.create({
      data: { problemId: id, quality },
    }),
  ]);

  res.json(updated);
});

// Update a problem's editable fields. Deliberately excludes status and the
// SM-2 scheduling fields — those are only ever mutated by the review flow
// above, never by a direct edit, so editing can't silently corrupt the
// spaced-repetition schedule.
problemsRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, url, pattern, difficulty, notes } = req.body;

  if (!title || !pattern || !difficulty) {
    return res.status(400).json({ error: "title, pattern, and difficulty are required" });
  }

  const existing = await prisma.problem.findFirst({ where: { id, userId: req.userId } });
  if (!existing) {
    return res.status(404).json({ error: "problem not found" });
  }

  const updated = await prisma.problem.update({
    where: { id },
    data: { title, url, pattern, difficulty, notes },
  });

  res.json(updated);
});

// Delete a problem and its review history. Reviews are deleted explicitly
// in the same transaction rather than relying on the database's ON DELETE
// CASCADE, since the libSQL driver adapter doesn't enable SQLite foreign
// key enforcement by default — this way deletion is correct regardless.
problemsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  const existing = await prisma.problem.findFirst({ where: { id, userId: req.userId } });
  if (!existing) {
    return res.status(404).json({ error: "problem not found" });
  }

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { problemId: id } }),
    prisma.problem.delete({ where: { id } }),
  ]);

  res.status(204).end();
});

// Ask for a Socratic hint on a problem the student is stuck on
problemsRouter.post("/:id/hint", hintLimiter, async (req, res) => {
  const id = Number(req.params.id);
  const { stuckPoint } = req.body;

  if (!stuckPoint) {
    return res.status(400).json({ error: "stuckPoint is required — describe what you've tried / where you're stuck" });
  }

  const problem = await prisma.problem.findFirst({ where: { id, userId: req.userId } });
  if (!problem) {
    return res.status(404).json({ error: "problem not found" });
  }

  try {
    const hint = await getHint({
      title: problem.title,
      pattern: problem.pattern,
      difficulty: problem.difficulty,
      notes: problem.notes,
      stuckPoint,
    });
    res.json({ hint });
  } catch (err) {
    console.error("Hint generation failed:", err);
    res.status(502).json({ error: "Hint generation failed — try again in a moment" });
  }
});
