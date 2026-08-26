import { Router } from "express";
import { prisma } from "../db.js";
import { calculateStreak, countByPattern } from "../stats.js";

export const statsRouter = Router();

statsRouter.get("/", async (req, res) => {
  const problems = await prisma.problem.findMany();

  const total = problems.length;
  const solved = problems.filter((p) => p.status === "solved").length;
  const stuck = problems.filter((p) => p.status === "stuck").length;

  // Only problems that have been through at least one review contribute to
  // the streak — just adding a problem shouldn't count as "practice today."
  const reviewDates = problems.filter((p) => p.repetitions > 0).map((p) => p.updatedAt);

  res.json({
    total,
    solved,
    stuck,
    byPattern: countByPattern(problems),
    streak: calculateStreak(reviewDates),
  });
});
