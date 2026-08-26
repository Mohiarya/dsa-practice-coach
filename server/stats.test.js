import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateStreak, countByPattern } from "./stats.js";

const TODAY = new Date("2026-01-10T12:00:00Z");
const day = (offset) => new Date(TODAY.getTime() + offset * 86400000);

test("no review dates means zero streak", () => {
  assert.equal(calculateStreak([], TODAY), 0);
});

test("a review today gives a streak of 1", () => {
  assert.equal(calculateStreak([day(0)], TODAY), 1);
});

test("3 consecutive days including today gives a streak of 3", () => {
  const dates = [day(0), day(-1), day(-2)];
  assert.equal(calculateStreak(dates, TODAY), 3);
});

test("a gap breaks the streak", () => {
  // reviewed today and 2 days ago, but not yesterday — streak is just today
  const dates = [day(0), day(-2)];
  assert.equal(calculateStreak(dates, TODAY), 1);
});

test("no review today means streak is 0, even with a recent run", () => {
  const dates = [day(-1), day(-2), day(-3)];
  assert.equal(calculateStreak(dates, TODAY), 0);
});

test("countByPattern groups and sorts by frequency", () => {
  const problems = [
    { pattern: "hashing" },
    { pattern: "sliding-window" },
    { pattern: "hashing" },
    { pattern: "hashing" },
    { pattern: "sliding-window" },
  ];
  assert.deepEqual(countByPattern(problems), [
    { pattern: "hashing", count: 3 },
    { pattern: "sliding-window", count: 2 },
  ]);
});
