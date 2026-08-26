// Pure helpers for computing progress stats from problem data — no
// database or HTTP here, same reasoning as sm2.js: keep the actual logic
// testable in isolation from where the data comes from.

export function toDayString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Counts consecutive days, ending today, that have at least one date in
 * `reviewDates`. This is the classic "streak" definition (like Duolingo/
 * Anki): miss a single day and the streak resets to whatever unbroken run
 * remains ending today.
 */
export function calculateStreak(reviewDates, today = new Date()) {
  const activeDays = new Set(reviewDates.map(toDayString));

  let streak = 0;
  const cursor = new Date(today);
  while (activeDays.has(toDayString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Groups problems by pattern and counts them, most common pattern first.
 */
export function countByPattern(problems) {
  const counts = {};
  for (const p of problems) {
    counts[p.pattern] = (counts[p.pattern] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);
}
