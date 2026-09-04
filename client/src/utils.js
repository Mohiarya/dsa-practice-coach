// Small pure helpers shared across pages. `now` is an optional parameter
// (defaulting to the real current time) rather than each function calling
// `Date.now()` internally — the same reasoning as server/sm2.js: it's what
// makes these testable with a fixed clock instead of a moving target.

export function daysOverdue(nextReviewDate, now = new Date()) {
  return Math.floor((now.getTime() - new Date(nextReviewDate).getTime()) / 86400000);
}

export function describeReviewState(problem, now = new Date()) {
  if (problem.repetitions === 0) return "New problem — first review";
  const overdue = daysOverdue(problem.nextReviewDate, now);
  return `Review ${problem.repetitions} · ${overdue > 0 ? `${overdue} day${overdue === 1 ? "" : "s"} overdue` : "due today"}`;
}
