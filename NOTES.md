# DSA Practice Coach — my notes on how this actually works

Written for myself, so I can explain any part of this in an interview without
re-reading the code first.

## Big picture

Two separate apps talking over HTTP, plus a database, plus one external AI call:

- `client/` — React app (Vite), runs in the browser on port 5180. Never
  touches the database or Gemini directly — only ever calls my own backend.
- `server/` — Express app, runs on port 3001. The only thing that touches
  the database and the only thing that holds the Gemini API key.
- `server/prisma/dev.db` — a single SQLite file. All data lives here.
- Gemini API — reached from exactly one file (`hint.js`), using an API key
  that only exists in `server/.env` (never committed, never sent to the
  frontend).

The key reason the API key lives on the backend and not the frontend: anything
shipped to a browser can be inspected by the user (view source, dev tools).
Keeping the key server-side means it's never exposed.

## Backend (`server/`)

- **`server.js`** — the entry point. Sets up Express, turns on CORS (so the
  React app, running on a different port, is allowed to call this API),
  parses incoming JSON bodies, and mounts `problemsRouter` at `/api/problems`.
  Also has one standalone route, `/api/health`, just to check the server is
  alive.

- **`db.js`** — creates one shared Prisma client for the whole app. Prisma 7
  requires an explicit "driver adapter" to actually connect to a database
  (a change from older Prisma versions) — I'm using
  `@prisma/adapter-better-sqlite3` here since the database is SQLite.

- **`prisma/schema.prisma`** — defines the `Problem` model: the normal
  fields (title, url, pattern, difficulty, notes, status) plus four fields
  that exist purely for spaced repetition (`easeFactor`, `interval`,
  `repetitions`, `nextReviewDate`). Running `prisma migrate dev` turns this
  schema into real SQL that creates/updates the actual table.

- **`sm2.js`** — the SM-2 spaced-repetition algorithm (same one Anki uses),
  as one pure function: `nextReviewState(currentState, quality, now)`.
  Given how well I recalled a problem (Again/Hard/Good/Easy) and its current
  scheduling state, it returns the new state and when to show it again.
  It's a *pure* function — no database, no `new Date()` called internally
  (that's passed in as `now`, defaulting to the real current time) — which
  is exactly what makes it possible to unit test with predictable answers.

- **`sm2.test.js`** — 5 tests using Node's built-in test runner (`node:test`
  + `node:assert`), not Vitest — a different, zero-dependency tool than the
  one I used on the frontend project. Covers: first success schedules 1 day
  out, second success schedules 6 days out, a failure resets the schedule,
  the ease factor never drops below its floor (1.3), and the date math is
  exactly right.

- **`hint.js`** — the Gemini integration. Has a detailed system instruction
  telling the model to act as a Socratic tutor: ask guiding questions, point
  out overlooked constraints, or suggest a smaller sub-problem — but never
  write code and never state the algorithm/data-structure outright. Because
  an LLM won't perfectly follow instructions 100% of the time, there's a
  second, independent check (`violatesNoCodePolicy`) that scans the actual
  response for code fences. If it finds one, it retries once with a
  stronger instruction; if it still fails, it returns a safe fallback
  message instead of ever showing a possibly-leaked solution.

- **`routes/problems.js`** — all the HTTP endpoints:
  - `POST /` — create a problem.
  - `GET /` — list all problems, newest first.
  - `GET /due` — problems whose `nextReviewDate` has already passed
    (`nextReviewDate <= now`).
  - `PATCH /:id/review` — takes a `quality` rating, loads the problem,
    runs it through `nextReviewState`, and saves the updated scheduling
    state back to the database. Also updates `status` to "solved" or
    "stuck" based on the outcome.
  - `POST /:id/hint` — takes what I'm stuck on, loads the problem's
    context from the database, and calls `getHint()` to get back a
    guarded hint.

## Frontend (`client/`)

- **`api.js`** — one constant, `API_BASE`, so the backend's URL exists in
  exactly one place instead of being copy-pasted into every component.

- **`quality.js`** — the Again/Hard/Good/Easy button labels and their
  numeric values (1/3/4/5). These numbers have to match `QUALITY` in the
  backend's `sm2.js` — the two files are intentionally duplicated rather
  than shared, since the frontend and backend are separate apps with no
  shared package between them.

- **`App.jsx`** — owns the `problems` list as shared state (the only piece
  of state that both the form and the list need), fetches it once on
  mount, and passes a `fetchProblems` function down so other components can
  trigger a refresh after they change something in the database.

- **`components/AddProblemForm.jsx`** — a controlled form (React holds
  every field's value in `useState`, not the browser's default form
  behavior). Validates required fields client-side for instant feedback,
  but the backend validates the same fields independently — client-side
  validation is just for a fast response; the backend is what's actually
  trusted, since a request could come from anywhere, not only this form.
  On success, hands the newly created problem straight to `App.jsx` instead
  of re-fetching the whole list.

- **`components/ProblemList.jsx`** — a "dumb" component: just renders the
  `problems` array it's given as a prop, no state or logic of its own.
  Renders a `HintBox` under every problem.

- **`components/DueReview.jsx`** — fetches `/api/problems/due` on mount and
  renders each due problem with four rating buttons. Clicking one sends a
  `PATCH` to the review endpoint, removes that problem from the local "due"
  list immediately (no need to wait on a re-fetch for that part), and calls
  `onReviewed()` so `App.jsx` refreshes the main list too (so the updated
  `status` shows up there as well).

- **`components/HintBox.jsx`** — collapsed by default (just a button), so
  every problem in the list doesn't show a full form all the time. Once
  opened, submitting sends `stuckPoint` to the backend's hint route and
  displays the returned hint, or an error message if the request failed
  (wrong input, problem not found, or the Gemini call itself failing).

## Known rough edges (things I know about, not surprises)

- No authentication — this is a personal single-user tool, not something
  meant to be exposed publicly as-is.
- The Gemini model name had to be updated once already (from
  `gemini-2.5-flash`, deprecated for new API keys, to `gemini-3.6-flash`)
  — model availability on a fast-moving API isn't permanent, and this could
  need updating again later.
- No styling pass yet — functionally complete, visually plain.
