import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reviewsByDay,
  ratingDistribution,
  performanceByDifficulty,
  performanceByPattern,
  frequentlyFailedProblems,
  strongestRetentionProblems,
  mostReviewedPattern,
  patternMastery,
} from "./reviewStats.js";

const TODAY = new Date("2026-01-10T12:00:00Z");
const day = (offset) => new Date(TODAY.getTime() + offset * 86400000);

const PROBLEMS = [
  { id: 1, pattern: "hashing", difficulty: "Easy" },
  { id: 2, pattern: "sliding-window", difficulty: "Medium" },
];

test("reviewsByDay includes zero-count days, not just days with activity", () => {
  const reviews = [{ reviewedAt: day(0) }, { reviewedAt: day(0) }, { reviewedAt: day(-2) }];
  const result = reviewsByDay(reviews, 3, TODAY);
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((r) => r.count),
    [1, 0, 2] // day(-2), day(-1), day(0)
  );
});

test("ratingDistribution buckets by human label, not raw numeric value", () => {
  const reviews = [{ quality: 1 }, { quality: 4 }, { quality: 4 }, { quality: 5 }, { quality: 3 }];
  assert.deepEqual(ratingDistribution(reviews), { again: 1, hard: 1, good: 2, easy: 1 });
});

test("performanceByDifficulty computes an explainable success rate per group", () => {
  const reviews = [
    { problemId: 1, quality: 4 }, // Easy, success
    { problemId: 1, quality: 1 }, // Easy, fail
    { problemId: 2, quality: 5 }, // Medium, success
  ];
  const result = performanceByDifficulty(reviews, PROBLEMS);
  const easy = result.find((r) => r.key === "Easy");
  const medium = result.find((r) => r.key === "Medium");
  assert.equal(easy.totalReviews, 2);
  assert.equal(easy.successRate, 50);
  assert.equal(medium.successRate, 100);
});

test("performanceByPattern ignores reviews for problems that no longer exist", () => {
  const reviews = [{ problemId: 999, quality: 4 }, { problemId: 1, quality: 4 }];
  const result = performanceByPattern(reviews, PROBLEMS);
  assert.equal(result.length, 1);
  assert.equal(result[0].key, "hashing");
});

test("frequentlyFailedProblems only surfaces problems past the minimum Again count", () => {
  const reviews = [
    { problemId: 1, quality: 1 },
    { problemId: 1, quality: 1 },
    { problemId: 2, quality: 1 },
  ];
  const result = frequentlyFailedProblems(reviews, PROBLEMS, 2);
  assert.equal(result.length, 1);
  assert.equal(result[0].problem.id, 1);
  assert.equal(result[0].againCount, 2);
});

test("strongestRetentionProblems requires 2+ reviews with zero Again ratings", () => {
  const reviews = [
    { problemId: 1, quality: 4 },
    { problemId: 1, quality: 5 },
    { problemId: 2, quality: 4 },
    { problemId: 2, quality: 1 },
  ];
  const result = strongestRetentionProblems(reviews, PROBLEMS);
  assert.equal(result.length, 1);
  assert.equal(result[0].problem.id, 1);
});

test("mostReviewedPattern picks the highest-volume pattern", () => {
  const reviews = [{ problemId: 1, quality: 4 }, { problemId: 1, quality: 4 }, { problemId: 2, quality: 4 }];
  assert.equal(mostReviewedPattern(reviews, PROBLEMS).key, "hashing");
});

test("mostReviewedPattern returns null when there is no review history", () => {
  assert.equal(mostReviewedPattern([], PROBLEMS), null);
});

test("patternMastery omits patterns with zero reviews rather than reporting 0%", () => {
  const reviews = [{ problemId: 1, quality: 4 }];
  const result = patternMastery(reviews, PROBLEMS);
  assert.equal(result.length, 1);
  assert.equal(result[0].pattern, "hashing");
  assert.equal(result[0].masteryPercent, 100);
});
