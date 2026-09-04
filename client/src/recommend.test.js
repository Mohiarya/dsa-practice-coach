import { describe, it, expect } from "vitest";
import { recommendNextProblem } from "./recommend";

const NOW = new Date("2026-01-10T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);

describe("recommendNextProblem", () => {
  it("picks the most overdue due review first, with a day-count reason", () => {
    const due = [
      { id: 1, nextReviewDate: daysAgo(5) },
      { id: 2, nextReviewDate: daysAgo(1) },
    ];
    const result = recommendNextProblem({ due, allProblems: [], patternMastery: [] }, NOW);
    expect(result.problem.id).toBe(1);
    expect(result.reason).toBe("5 days overdue for review");
  });

  it("says 'due today' rather than '0 days overdue' for a same-day due review", () => {
    const due = [{ id: 1, nextReviewDate: NOW }];
    const result = recommendNextProblem({ due, allProblems: [], patternMastery: [] }, NOW);
    expect(result.reason).toBe("Due for review today");
  });

  it("falls back to the weakest reviewed pattern when nothing is due", () => {
    const allProblems = [
      { id: 1, pattern: "arrays", difficulty: "Easy" },
      { id: 2, pattern: "graphs", difficulty: "Medium" },
    ];
    const patternMastery = [
      { pattern: "arrays", masteryPercent: 90 },
      { pattern: "graphs", masteryPercent: 40 },
    ];
    const result = recommendNextProblem({ due: [], allProblems, patternMastery }, NOW);
    expect(result.problem.id).toBe(2);
    expect(result.reason).toContain("graphs");
    expect(result.reason).toContain("40%");
  });

  it("prefers an easier problem within the weakest pattern when there's a choice", () => {
    const allProblems = [
      { id: 1, pattern: "graphs", difficulty: "Hard" },
      { id: 2, pattern: "graphs", difficulty: "Easy" },
    ];
    const patternMastery = [{ pattern: "graphs", masteryPercent: 40 }];
    const result = recommendNextProblem({ due: [], allProblems, patternMastery }, NOW);
    expect(result.problem.id).toBe(2);
  });

  it("falls back to an unattempted problem when there's no review history at all", () => {
    const allProblems = [
      { id: 1, status: "solved", difficulty: "Easy" },
      { id: 2, status: "attempted", difficulty: "Medium" },
    ];
    const result = recommendNextProblem({ due: [], allProblems, patternMastery: [] }, NOW);
    expect(result.problem.id).toBe(2);
    expect(result.reason).toBe("Not yet solved");
  });

  it("returns null when there is truly nothing left to recommend", () => {
    const allProblems = [{ id: 1, status: "solved", difficulty: "Easy" }];
    const result = recommendNextProblem({ due: [], allProblems, patternMastery: [] }, NOW);
    expect(result).toBeNull();
  });
});
