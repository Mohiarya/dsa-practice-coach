// Mirrors the QUALITY values in server/sm2.js. The frontend and backend are
// two separate apps (no shared package between them yet), so this small
// constant is intentionally duplicated rather than imported — the numbers
// must match what the backend's SM-2 algorithm expects.
export const QUALITY_BUTTONS = [
  { label: "Again", value: 1, hint: "Couldn't solve it" },
  { label: "Hard", value: 3, hint: "Solved with a hint" },
  { label: "Good", value: 4, hint: "Solved with some effort" },
  { label: "Easy", value: 5, hint: "Solved smoothly" },
];
