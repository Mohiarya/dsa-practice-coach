import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db.js";
import { nextReviewState, QUALITY } from "../sm2.js";
import { getHint } from "../hint.js";

export const problemsRouter = Router();

const VALID_QUALITIES = Object.values(QUALITY);

// Each hint request costs a real Gemini API call against our quota, and
// this route has no auth — a public deployment needs some limit on how
// often one visitor can hit it. 10 requests / 10 minutes per IP is
// generous for genuine use, tight enough to stop scripted abuse.
const hintLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many hint requests — please wait a few minutes and try again." },
});

// Create a new problem entry
problemsRouter.post("/", async (req, res) => {
  const { title, url, pattern, difficulty, notes, status } = req.body;

  if (!title || !pattern || !difficulty) {
    return res.status(400).json({ error: "title, pattern, and difficulty are required" });
  }

  const problem = await prisma.problem.create({
    data: { title, url, pattern, difficulty, notes, status },
  });

  res.status(201).json(problem);
});

// List all problems, most recently created first
problemsRouter.get("/", async (req, res) => {
  const problems = await prisma.problem.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(problems);
});

// Problems whose next scheduled review is today or earlier
problemsRouter.get("/due", async (req, res) => {
  const dueProblems = await prisma.problem.findMany({
    where: { nextReviewDate: { lte: new Date() } },
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

  const problem = await prisma.problem.findUnique({ where: { id } });
  if (!problem) {
    return res.status(404).json({ error: "problem not found" });
  }

  const nextState = nextReviewState(problem, quality);

  const updated = await prisma.problem.update({
    where: { id },
    data: {
      easeFactor: nextState.easeFactor,
      interval: nextState.interval,
      repetitions: nextState.repetitions,
      nextReviewDate: nextState.nextReviewDate,
      status: quality < QUALITY.HARD ? "stuck" : "solved",
    },
  });

  res.json(updated);
});

// Ask for a Socratic hint on a problem the student is stuck on
problemsRouter.post("/:id/hint", hintLimiter, async (req, res) => {
  const id = Number(req.params.id);
  const { stuckPoint } = req.body;

  if (!stuckPoint) {
    return res.status(400).json({ error: "stuckPoint is required — describe what you've tried / where you're stuck" });
  }

  const problem = await prisma.problem.findUnique({ where: { id } });
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
