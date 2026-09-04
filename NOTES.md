# DSA Practice Coach — my notes on how this actually works

Written for myself, so I can explain any part of this in an interview without
re-reading the code first.

## Big picture

Two separate apps talking over HTTP, plus a database, plus one external AI call:

- `client/` — React app (Vite), runs in the browser on port 5180.
  `/dashboard`, `/practice`, `/progress`, `/profile` (authenticated) plus
  `/`, `/login`, `/signup` (guest), client-side routing via
  `react-router-dom`. Never touches the database or Gemini directly — only
  ever calls my own backend.
- `server/` — Express app, runs on port 3001. The only thing that touches
  the database and the only thing that holds the Gemini API key.
- Turso (hosted libSQL/SQLite) — all data lives here, in production *and*
  local dev (there's no local-file fallback; `server/dev.db` is a stale
  leftover from before the Turso migration, not actually read at runtime).
- Gemini API — reached from exactly one file (`hint.js`), using an API key
  that only exists in `server/.env` (never committed, never sent to the
  frontend).

The key reason the API key lives on the backend and not the frontend: anything
shipped to a browser can be inspected by the user (view source, dev tools).
Keeping the key server-side means it's never exposed.

## The core loop

Practice → Coach → Self-rate → Review → Improve. Concretely: `/practice`
works through today's due problems one at a time; for each, you can ask the
Coach for a Socratic hint, then submit a rating (Again/Hard/Good/Easy); that
rating both updates the problem's SM-2 schedule *and* appends a row to the
`Review` history table, which is what makes `/progress`'s analytics real
instead of guessed.

## Auth

Email + password, a signed httpOnly session cookie, nothing fancier — see
`auth.js`. `requireAuth` middleware (`middleware.js`) puts a verified
`req.userId` on every request under `/api/problems` and `/api/stats`; every
query in those routers filters by it, and single-resource lookups
(`PUT`/`DELETE`/`review`/`hint` by id) use `findFirst({ id, userId })` so a
problem belonging to someone else 404s exactly like a nonexistent one —
there's no separate "check ownership" step to forget. `Review` has no
`userId` of its own; ownership is transitive through the `Problem` it
belongs to (`routes/stats.js`'s `ownedByUser` relation filter). The
frontend never sends a user id anywhere — the server only ever trusts the
id it decodes from the cookie itself.

The app had exactly one real `Problem` row before accounts existed.
`claimOrphanedProblemsIfFirstUser` (in `auth.js`, called from the signup
route) hands any pre-existing ownerless row to the very first account ever
created, once. Until that happens the row is simply invisible to everyone
(every route requires auth and filters by userId) — never exposed, never
deleted.

## Backend (`server/`)

- **`app.js`** — builds the actual Express app: CORS (`credentials: true`,
  so the session cookie can actually be sent/stored cross-origin), cookie
  parsing, mounts `authRouter` at `/api/auth` (public) and
  `problemsRouter`/`statsRouter` at `/api/problems`/`/api/stats` (both
  behind `requireAuth`), plus a standalone `/api/health`. Kept separate
  from `server.js` specifically so integration tests can import `app` and
  hit real routes on an ephemeral port without also starting the real
  listener.
- **`auth.js`** — password hashing (bcrypt), session tokens (JWT, 30-day
  expiry — "persistent session"), basic email/password validation, and the
  orphan-claiming logic described above.
- **`cookie.js`** — the session cookie's shared config: `httpOnly` always;
  `secure`/`sameSite: "none"` only when `NODE_ENV=production` (needed for
  a cross-site Vercel↔Render cookie), `sameSite: "lax"` locally (different
  ports on `localhost` count as same-site, so this works over plain http).
- **`middleware.js`** — `requireAuth`: verifies the cookie, sets
  `req.userId`, or 401s. Nothing under `/api/problems` or `/api/stats` is
  reachable without it.
- **`routes/auth.js`** — `POST /signup`, `POST /login` (same generic
  "Invalid email or password" either way — no user enumeration), `POST
  /logout`, `GET /me` (what the frontend calls on load to check for a
  persistent session). Rate-limited the same way `/hint` already was.
- **`server.js`** — the actual entry point: just imports `app` and calls
  `.listen()`.
- **`db.js`** — one shared Prisma client for the whole app, using
  `@prisma/adapter-libsql` pointed at Turso (`TURSO_DATABASE_URL` +
  `TURSO_AUTH_TOKEN`). Prisma 7 requires this explicit "driver adapter" to
  connect to anything.

- **`prisma/schema.prisma`** — three models:
  - `User` — email (unique), a bcrypt `passwordHash`, optional name.
  - `Problem` — title, url, pattern, difficulty, notes, status, the four
    SM-2 fields (`easeFactor`, `interval`, `repetitions`,
    `nextReviewDate` — *current* scheduling state only), and a nullable
    `userId`. Nullable specifically for the pre-accounts row — see "Auth"
    above; every real problem going forward always has one, set from
    `req.userId`, never from anything the client sends.
  - `Review` — `problemId`, `quality`, `reviewedAt`. An append-only
    historical log, one row per submitted rating. This is what everything
    on `/progress` is actually computed from.
  Prisma's migration engine only supports local `file:` SQLite (see
  `prisma7.config.ts`), so schema changes are authored against a local
  file, then the generated SQL is applied to the real Turso database
  separately (I did this directly via the app's own Prisma client rather
  than the `turso` CLI, to avoid needing a separate CLI login).

- **`sm2.js`** — the SM-2 spaced-repetition algorithm (same one Anki uses),
  as one pure function: `nextReviewState(currentState, quality, now)`.
  Given how well I recalled a problem (Again=1/Hard=3/Good=4/Easy=5, note
  the gap at 2 — a deliberate simplification) and its current scheduling
  state, it returns the new state and when to show it again. Untouched
  since it was first built — the redesign builds around it, never rewrites
  it.

- **`stats.js`** — `calculateStreak` (consecutive days with ≥1 real review,
  resets on a missed day) and `countByPattern`. `calculateStreak` now gets
  fed actual `Review.reviewedAt` timestamps instead of a
  `Problem.updatedAt` proxy — the old proxy only reflected each problem's
  *most recent* review and could silently drop earlier review-days once a
  problem was reviewed again later. The `Review` table fixed that.

- **`reviewStats.js`** — analytics computed from the `Review` log joined
  against `Problem` data: reviews per day, rating distribution,
  success-rate by difficulty/pattern (pattern mastery is literally this:
  % of a pattern's reviews rated Hard or better), frequently-failed
  problems, strongest-retention problems, most-reviewed pattern. All pure
  functions, all unit tested, nothing hardcoded — a pattern with zero
  reviews is reported as "not yet reviewed," never as a fabricated 0%.

- **`hint.js`** — the Gemini integration, one-shot and stateless (no
  conversation history stored anywhere). Has a detailed system instruction
  telling the model to act as a Socratic tutor: ask guiding questions,
  point out overlooked constraints, or suggest a smaller sub-problem — but
  never write code and never state the algorithm/data-structure outright.
  Because an LLM won't perfectly follow instructions 100% of the time,
  there's a second, independent check (`violatesNoCodePolicy`) that scans
  the actual response for code fences. If it finds one, it retries once
  with a stronger instruction; if it still fails, it returns a safe
  fallback message instead of ever showing a possibly-leaked solution.

- **`routes/problems.js`** — all the problem/review HTTP endpoints:
  - `POST /` — create a problem.
  - `GET /` — list all problems, newest first.
  - `GET /due` — problems whose `nextReviewDate` has already passed.
  - `PATCH /:id/review` — takes a `quality` rating, runs `nextReviewState`,
    and in one `$transaction` both updates the problem's live SM-2 state
    *and* creates a `Review` row. Either both happen or neither does.
  - `PUT /:id` — edits title/url/pattern/difficulty/notes. Deliberately
    can't touch status or the SM-2 fields — those are only ever mutated by
    the review flow, so an edit can never corrupt the schedule.
  - `DELETE /:id` — deletes a problem and its review history together, in
    a transaction. Reviews are deleted *explicitly* rather than relying on
    the schema's `onDelete: Cascade`, since the libSQL adapter doesn't
    turn on SQLite foreign-key enforcement by default — the FK constraint
    documents intent, but the app doesn't depend on the database enforcing
    it.

- **`routes/stats.js`** — `GET /` (totals, streak, pattern counts — same
  shape as before), `GET /history` (everything from `reviewStats.js`),
  `GET /reviews` (the full review timeline with problem context, for the
  Progress page's history list).

- **Tests**: `sm2.test.js`, `stats.test.js`, `reviewStats.test.js`,
  `auth.test.js` are pure unit tests (`node:test`; `auth.test.js` mocks
  Prisma for the orphan-claim logic rather than touching the database).
  `routes.test.js` is a real integration suite — it spins up `app` on an
  ephemeral port and hits real HTTP routes against the real (Turso)
  database: signup/login/logout, ownership isolation (two throwaway
  accounts, cross-checking that neither can read/edit/delete/review/hint
  the other's problem or see it in their stats), plus the original
  review→history/edit/delete/analytics coverage, all now authenticated.
  Before any test signs up, the suite guarantees a buffer `User` row
  already exists (idempotent, fixed email) — specifically so a test
  account is never "the first account ever" and can never trigger
  `claimOrphanedProblemsIfFirstUser` against the one real pre-existing
  problem. Every test creates its own throwaway user(s)/problem(s) and
  deletes them in a `finally`, plus an `after()` hook that sweeps up
  anything `__test`-prefixed just in case.

## Frontend (`client/`)

- **`api.js`** — a small `api` object wrapping every backend call
  (`signup`, `login`, `logout`, `me`, `listProblems`, `createProblem`,
  `updateProblem`, `deleteProblem`, `dueProblems`, `submitReview`,
  `requestHint`, `stats`, `history`, `reviewTimeline`) instead of ad-hoc
  `fetch` calls scattered through components. Every call sends
  `credentials: "include"` — the session lives in an httpOnly cookie the
  code here never reads directly, only relies on the browser attaching.
- **`AuthContext.jsx`** — `user`/`loading` state plus `login`/`signup`/
  `logout`. On mount, calls `GET /api/auth/me` to find out whether the
  cookie (if any) still identifies a logged-in user — this one call is
  the entire "persistent session" mechanism. `App.jsx` renders the guest
  pages (`Landing`/`Login`/`Signup`) or the real app based on `user` being
  null or not; nothing else in the app checks auth state itself.
- **`quality.js`** — the Again/Hard/Good/Easy button labels and their
  numeric values (1/3/4/5), intentionally duplicated from the backend's
  `QUALITY` rather than shared (separate apps, no shared package).
- **`recommend.js`** — `recommendNextProblem()`: a deterministic, explicitly
  rule-based "what next" engine (most-overdue due review → any due review →
  weakest reviewed pattern → an unattempted problem). Not machine learning,
  and the UI says so.
- **`utils.js`** — small pure helpers used by more than one page
  (`daysOverdue`, `describeReviewState` — turning raw SM-2 fields into
  "Review 3 · 2 days overdue" style text).
- **`App.jsx`** — branches on `useAuth().user`: signed out renders
  `Landing`/`Login`/`Signup` with no nav at all; signed in renders
  `NavBar`, the four routed pages, and owns the single `LogProblemModal`
  instance (shared between the navbar's "+ Log Problem" and Progress's
  per-card "Edit" — a `dataVersion` counter forces the current page to
  refetch after either).
- **`pages/Landing.jsx`/`Login.jsx`/`Signup.jsx`** — the guest-only pages,
  same design system, no app nav (their own small header instead).
- **`pages/Profile.jsx`** — welcome header, real stat tiles, strongest/
  weakest reviewed pattern (from `/stats/history`'s `patternMastery` —
  honestly says "not enough review history yet" rather than showing a
  fabricated pattern when there's too little data), account email, log out.
- **`pages/Dashboard.jsx`** — "what should I do today": due count + CTA,
  stat tiles, weakest patterns, recent activity (from real `Review` rows),
  the recommended-next card, and a dedicated zero-problem first-run empty
  state ("Your DSA journey starts here").
- **`pages/Practice.jsx`** — the focused session: works through the due
  queue one problem at a time (Problem | Coach side by side, Review as its
  own section below — solve, consult the coach if stuck, *then* rate,
  matching the intended order). Falls back to a "practice ahead" option on
  the recommended problem when nothing is due.
- **`pages/Progress.jsx`** — DSA Mastery bars, a review-activity heatmap,
  rating distribution, performance by difficulty/pattern, learning
  signals, the full review timeline, and the "All Problems" management
  list (edit/delete live here).
- **`components/CoachPanel.jsx`** — the Gemini hint UI. Keeps a local
  `exchanges` list to render the conversation *this session*, but the
  backend call itself is still one-shot per the note above — the panel
  says so explicitly rather than implying persistent memory that doesn't
  exist.

## Known rough edges (things I know about, not surprises)

- Auth is deliberately minimal: email/password + a stateless JWT cookie,
  no email verification, no password reset flow, no roles/permissions.
  Logging out clears the cookie client-side; it doesn't revoke the token
  server-side (there's no session table), so a captured token would stay
  valid until its 30-day expiry regardless. Fine for a personal tool at
  this scale — a real "session table + revocation" upgrade would be the
  first thing to add if this ever needed to be more than that.
- The Gemini model name had to be updated once already (from
  `gemini-2.5-flash`, deprecated for new API keys, to `gemini-3.6-flash`)
  — model availability on a fast-moving API isn't permanent, and this could
  need updating again later. It also occasionally returns a transient 503
  ("high demand") — the UI surfaces that as a real error rather than
  retrying silently or masking it.
- `pattern` is still free text, not a fixed taxonomy — the Log Problem
  form offers autocomplete suggestions, but nothing forces a value, so
  analytics group by literal string match (inconsistent capitalization
  would count as different patterns).
- No frontend test framework existed before the redesign; a lightweight
  Vitest setup now covers the deterministic pieces (`recommend.js`,
  `utils.js`) without pulling in a component-testing stack.
