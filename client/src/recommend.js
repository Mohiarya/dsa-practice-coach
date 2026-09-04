// Deterministic, rule-based "next problem" recommendation — NOT machine
// learning. Priority order, per product decision:
//   1. Most overdue due review
//   2. Any other due review
//   3. A problem from your weakest reviewed pattern
//   4. An easier problem, if nothing else applies
// Every input here is real data already fetched by the caller (due list,
// full problem list, /stats/history's patternMastery) — nothing invented.
import { daysOverdue } from "./utils";

const DIFFICULTY_RANK = { Easy: 0, Medium: 1, Hard: 2 };

export function recommendNextProblem({ due = [], allProblems = [], patternMastery = [] }, now = new Date()) {
  if (due.length > 0) {
    const next = due[0]; // /problems/due is already sorted by nextReviewDate asc
    const overdue = daysOverdue(next.nextReviewDate, now);
    return {
      problem: next,
      reason: overdue > 0 ? `${overdue} day${overdue === 1 ? "" : "s"} overdue for review` : "Due for review today",
    };
  }

  if (patternMastery.length > 0) {
    const weakest = [...patternMastery].sort((a, b) => a.masteryPercent - b.masteryPercent)[0];
    const candidates = allProblems
      .filter((p) => p.pattern === weakest.pattern)
      .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
    if (candidates.length > 0) {
      return {
        problem: candidates[0],
        reason: `Your weakest reviewed pattern (${weakest.masteryPercent}% success in "${weakest.pattern}")`,
      };
    }
  }

  const unattempted = allProblems
    .filter((p) => p.status === "attempted")
    .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
  if (unattempted.length > 0) {
    return { problem: unattempted[0], reason: "Not yet solved" };
  }

  return null;
}
