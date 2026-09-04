import { describe, it, expect } from "vitest";
import { daysOverdue, describeReviewState } from "./utils";

const NOW = new Date("2026-01-10T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const daysAhead = (n) => new Date(NOW.getTime() + n * 86400000);

describe("daysOverdue", () => {
  it("is positive when the review date is in the past", () => {
    expect(daysOverdue(daysAgo(3), NOW)).toBe(3);
  });

  it("is zero when the review date is today", () => {
    expect(daysOverdue(NOW, NOW)).toBe(0);
  });

  it("is negative when the review date is in the future", () => {
    expect(daysOverdue(daysAhead(2), NOW)).toBe(-2);
  });
});

describe("describeReviewState", () => {
  it("calls out a never-reviewed problem as new, ignoring due date math", () => {
    const problem = { repetitions: 0, nextReviewDate: daysAgo(10) };
    expect(describeReviewState(problem, NOW)).toBe("New problem — first review");
  });

  it("describes an overdue review with the correct day count and pluralization", () => {
    const problem = { repetitions: 2, nextReviewDate: daysAgo(1) };
    expect(describeReviewState(problem, NOW)).toBe("Review 2 · 1 day overdue");

    const problem2 = { repetitions: 2, nextReviewDate: daysAgo(5) };
    expect(describeReviewState(problem2, NOW)).toBe("Review 2 · 5 days overdue");
  });

  it("describes a review due exactly today as 'due today', not '0 days overdue'", () => {
    const problem = { repetitions: 1, nextReviewDate: NOW };
    expect(describeReviewState(problem, NOW)).toBe("Review 1 · due today");
  });
});
