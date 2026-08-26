/**
 * SM-2 spaced-repetition algorithm (the same one Anki is based on).
 * After every review, it decides how many days to wait before the next
 * review, based on how well you remembered it this time.
 */

// A simplified 5-point recall quality scale (the original SM-2 paper uses
// 0-5; we only expose the four values that make sense for "did I solve
// this DSA problem", matching how Anki simplifies it into rating buttons).
export const QUALITY = {
  AGAIN: 1, // couldn't solve it, had to look up the full solution
  HARD: 3, // solved it, but only with a hint
  GOOD: 4, // solved it with some effort, no hint
  EASY: 5, // solved it smoothly
};

const MIN_EASE_FACTOR = 1.3;

/**
 * Pure function: given a problem's current spaced-repetition state and how
 * well you just recalled it, returns the new state (including when to show
 * it again). Takes `now` as a parameter (instead of calling `new Date()`
 * internally) so the function is deterministic and easy to unit test.
 */
export function nextReviewState({ repetitions, easeFactor, interval }, quality, now = new Date()) {
  let nextRepetitions = repetitions;
  let nextInterval = interval;

  if (quality < QUALITY.HARD) {
    // Failed recall: start the spacing over, but keep the ease factor —
    // repeated total failures are what drives ease down, not one miss.
    nextRepetitions = 0;
    nextInterval = 1;
  } else {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }
    nextRepetitions = repetitions + 1;
  }

  // The original SM-2 ease-factor update formula: better recall pushes the
  // ease factor up (longer future gaps), worse recall pushes it down, but
  // it's clamped so a problem never gets scheduled "too infrequently" to
  // ever be seen again.
  let nextEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEaseFactor < MIN_EASE_FACTOR) nextEaseFactor = MIN_EASE_FACTOR;

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return {
    repetitions: nextRepetitions,
    easeFactor: Math.round(nextEaseFactor * 100) / 100,
    interval: nextInterval,
    nextReviewDate,
  };
}
