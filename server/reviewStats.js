// Pure helpers for computing analytics from the Review history log, joined
// against Problem data where needed. Same reasoning as stats.js/sm2.js:
// no database or HTTP here, so the actual logic is testable in isolation.

import { toDayString } from "./stats.js";
import { QUALITY } from "./sm2.js";

// A review counts as a "successful" recall if it was rated Hard or better
// (i.e. the problem was actually solved this review, however roughly) —
// mirrors the same threshold routes/problems.js already uses to decide
// solved vs stuck (quality < QUALITY.HARD).
function isSuccess(quality) {
  return quality >= QUALITY.HARD;
}

/**
 * Review counts per calendar day, most recent `days` days, oldest first.
 * Days with zero reviews are included as 0 (not omitted) so a calendar/bar
 * view doesn't have to reconstruct the gaps itself.
 */
export function reviewsByDay(reviews, days = 90, today = new Date()) {
  const counts = new Map();
  for (const r of reviews) counts.set(toDayString(r.reviewedAt), (counts.get(toDayString(r.reviewedAt)) || 0) + 1);

  const result = [];
  const cursor = new Date(today);
  for (let i = 0; i < days; i++) {
    const day = toDayString(cursor);
    result.unshift({ date: day, count: counts.get(day) || 0 });
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}

/**
 * How many reviews landed at each rating value. Keyed by the human label
 * (again/hard/good/easy), not the raw 1/3/4/5, since that's what the UI
 * actually wants to render.
 */
export function ratingDistribution(reviews) {
  const dist = { again: 0, hard: 0, good: 0, easy: 0 };
  const labelByValue = { [QUALITY.AGAIN]: "again", [QUALITY.HARD]: "hard", [QUALITY.GOOD]: "good", [QUALITY.EASY]: "easy" };
  for (const r of reviews) {
    const label = labelByValue[r.quality];
    if (label) dist[label]++;
  }
  return dist;
}

/**
 * Groups reviews by a problem-derived key (difficulty or pattern) and
 * reports review volume + success rate for each group. `successRate` is
 * "% of reviews on problems in this group rated Hard or better" — a
 * direct, explainable number, not a hidden formula.
 */
function performanceByKey(reviews, problems, keyFn) {
  const problemById = new Map(problems.map((p) => [p.id, p]));
  const groups = new Map();

  for (const r of reviews) {
    const problem = problemById.get(r.problemId);
    if (!problem) continue; // review of a since-deleted problem
    const key = keyFn(problem);
    if (!groups.has(key)) groups.set(key, { key, totalReviews: 0, successCount: 0 });
    const g = groups.get(key);
    g.totalReviews++;
    if (isSuccess(r.quality)) g.successCount++;
  }

  return [...groups.values()]
    .map((g) => ({
      ...g,
      successRate: Math.round((g.successCount / g.totalReviews) * 100),
    }))
    .sort((a, b) => b.totalReviews - a.totalReviews);
}

export function performanceByDifficulty(reviews, problems) {
  return performanceByKey(reviews, problems, (p) => p.difficulty);
}

export function performanceByPattern(reviews, problems) {
  return performanceByKey(reviews, problems, (p) => p.pattern);
}

/**
 * Problems with at least `minAgain` "Again" ratings in their review
 * history, most-failed first — a genuinely useful "what keeps beating me"
 * signal, only surfaced once there's enough history to mean something.
 */
export function frequentlyFailedProblems(reviews, problems, minAgain = 2) {
  const problemById = new Map(problems.map((p) => [p.id, p]));
  const againCounts = new Map();

  for (const r of reviews) {
    if (r.quality !== QUALITY.AGAIN) continue;
    againCounts.set(r.problemId, (againCounts.get(r.problemId) || 0) + 1);
  }

  return [...againCounts.entries()]
    .filter(([, count]) => count >= minAgain)
    .map(([problemId, againCount]) => ({ problem: problemById.get(problemId), againCount }))
    .filter((entry) => entry.problem)
    .sort((a, b) => b.againCount - a.againCount);
}

/**
 * Problems reviewed at least twice with zero "Again" ratings anywhere in
 * their history — the honest opposite of frequentlyFailedProblems.
 */
export function strongestRetentionProblems(reviews, problems) {
  const problemById = new Map(problems.map((p) => [p.id, p]));
  const byProblem = new Map();

  for (const r of reviews) {
    if (!byProblem.has(r.problemId)) byProblem.set(r.problemId, []);
    byProblem.get(r.problemId).push(r.quality);
  }

  return [...byProblem.entries()]
    .filter(([, qualities]) => qualities.length >= 2 && qualities.every((q) => q >= QUALITY.HARD))
    .map(([problemId, qualities]) => ({ problem: problemById.get(problemId), reviewCount: qualities.length }))
    .filter((entry) => entry.problem)
    .sort((a, b) => b.reviewCount - a.reviewCount);
}

/**
 * The pattern with the most review activity — "what you've practiced
 * most," not a value judgment.
 */
export function mostReviewedPattern(reviews, problems) {
  const byPattern = performanceByPattern(reviews, problems);
  return byPattern.length > 0 ? byPattern[0] : null;
}

/**
 * "Mastery" per pattern: % of that pattern's reviews rated Hard or
 * better. Only computed for patterns that have at least one review —
 * patterns with zero reviews are omitted here rather than reported as 0%,
 * since 0% implies failure, not "not yet attempted."
 */
export function patternMastery(reviews, problems) {
  return performanceByPattern(reviews, problems).map((g) => ({
    pattern: g.key,
    masteryPercent: g.successRate,
    reviewCount: g.totalReviews,
  }));
}
