import { Router } from "express";
import { prisma } from "../db.js";
import { calculateStreak, countByPattern } from "../stats.js";
import {
  reviewsByDay,
  ratingDistribution,
  performanceByDifficulty,
  performanceByPattern,
  frequentlyFailedProblems,
  strongestRetentionProblems,
  mostReviewedPattern,
  patternMastery,
} from "../reviewStats.js";

export const statsRouter = Router();

// Review has no userId column of its own — ownership is transitive
// through the Problem it belongs to (see schema.prisma). This relation
// filter is how every review query below stays scoped to the
// authenticated user without denormalizing userId onto Review itself.
const ownedByUser = (userId) => ({ problem: { userId } });

statsRouter.get("/", async (req, res) => {
  const [problems, reviews] = await Promise.all([
    prisma.problem.findMany({ where: { userId: req.userId } }),
    prisma.review.findMany({ where: ownedByUser(req.userId), select: { reviewedAt: true } }),
  ]);

  const total = problems.length;
  const solved = problems.filter((p) => p.status === "solved").length;
  const stuck = problems.filter((p) => p.status === "stuck").length;

  res.json({
    total,
    solved,
    stuck,
    byPattern: countByPattern(problems),
    // Streak is computed from actual Review timestamps (every review that
    // ever happened), not a proxy — previously this used each problem's
    // updatedAt, which only reflects its MOST RECENT review and could
    // silently drop earlier review-days once a problem was reviewed again
    // later. The Review history table fixes that for good.
    streak: calculateStreak(reviews.map((r) => r.reviewedAt)),
  });
});

// Historical analytics derived from the Review log — everything here is
// only meaningful once real review history exists, so each field is
// computed straight from actual rows, nothing hardcoded or estimated.
statsRouter.get("/history", async (req, res) => {
  const [problems, reviews] = await Promise.all([
    prisma.problem.findMany({ where: { userId: req.userId } }),
    prisma.review.findMany({ where: ownedByUser(req.userId), orderBy: { reviewedAt: "asc" } }),
  ]);

  res.json({
    totalReviews: reviews.length,
    reviewsByDay: reviewsByDay(reviews, 90),
    ratingDistribution: ratingDistribution(reviews),
    performanceByDifficulty: performanceByDifficulty(reviews, problems),
    performanceByPattern: performanceByPattern(reviews, problems),
    patternMastery: patternMastery(reviews, problems),
    frequentlyFailed: frequentlyFailedProblems(reviews, problems),
    strongestRetention: strongestRetentionProblems(reviews, problems),
    mostReviewedPattern: mostReviewedPattern(reviews, problems),
  });
});

// Full review timeline: every review ever recorded, newest first, with
// enough problem context to render a real history list (not just IDs).
statsRouter.get("/reviews", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: ownedByUser(req.userId),
    orderBy: { reviewedAt: "desc" },
    include: { problem: { select: { id: true, title: true, pattern: true, difficulty: true, nextReviewDate: true } } },
  });
  res.json(reviews);
});
