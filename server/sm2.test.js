import { test } from "node:test";
import assert from "node:assert/strict";
import { nextReviewState, QUALITY } from "./sm2.js";

const FIXED_NOW = new Date("2026-01-01T00:00:00Z");
const FRESH_PROBLEM = { repetitions: 0, easeFactor: 2.5, interval: 0 };

test("first successful review schedules a review 1 day later", () => {
  const result = nextReviewState(FRESH_PROBLEM, QUALITY.GOOD, FIXED_NOW);
  assert.equal(result.interval, 1);
  assert.equal(result.repetitions, 1);
});

test("second successful review schedules 6 days later", () => {
  const afterFirst = { repetitions: 1, easeFactor: 2.5, interval: 1 };
  const result = nextReviewState(afterFirst, QUALITY.GOOD, FIXED_NOW);
  assert.equal(result.interval, 6);
  assert.equal(result.repetitions, 2);
});

test("failing a review resets repetitions and interval, but keeps ease factor from dropping to zero", () => {
  const wellKnown = { repetitions: 5, easeFactor: 2.8, interval: 40 };
  const result = nextReviewState(wellKnown, QUALITY.AGAIN, FIXED_NOW);
  assert.equal(result.repetitions, 0);
  assert.equal(result.interval, 1);
  assert.ok(result.easeFactor < 2.8, "ease factor should decrease after a failure");
});

test("ease factor never drops below 1.3 even after repeated failures", () => {
  let state = { repetitions: 0, easeFactor: 1.3, interval: 0 };
  for (let i = 0; i < 5; i++) {
    state = nextReviewState(state, QUALITY.AGAIN, FIXED_NOW);
  }
  assert.equal(state.easeFactor, 1.3);
});

test("nextReviewDate is computed correctly from the interval", () => {
  const result = nextReviewState(FRESH_PROBLEM, QUALITY.GOOD, FIXED_NOW);
  assert.equal(result.nextReviewDate.toISOString(), "2026-01-02T00:00:00.000Z");
});
