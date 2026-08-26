# DSA Practice Coach

**Live demo:** https://dsa-practice-coach.vercel.app
*(backend is on Render's free tier — the first request after a period of inactivity can take 20-50s to wake up; reloads after that are fast)*

A full-stack app for practicing DSA interview problems with spaced repetition
and AI-guided (never AI-solved) hints.

- Log problems you've attempted, tagged by pattern and difficulty.
- Problems you get wrong come back on a spaced-repetition schedule (SM-2 —
  the same algorithm Anki uses), so shaky problems resurface sooner and
  solid ones drift further apart.
- When stuck, ask for a hint — a Gemini-powered Socratic tutor that nudges
  you toward the idea without writing code or naming the technique outright.
  The no-code rule is enforced by a second check on the model's actual
  output, not just a prompt instruction.
- Tracks progress (streak, solved count, pattern breakdown) and supports
  light/dark theming.

## Stack

- **Backend:** Node.js, Express, Prisma (via a driver adapter)
- **Frontend:** React (Vite)
- **Database:** Turso (hosted libSQL/SQLite)
- **AI:** Google Gemini API
- **Hosting:** Vercel (frontend), Render (backend)

## Running locally

Requires:
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys)
- A free [Turso](https://turso.tech) database (the app talks to Turso even in
  local dev — there's no local-file fallback)

```bash
# Backend
cd server
npm install
cat <<EOF > .env
GEMINI_API_KEY=your_gemini_key
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_token
EOF
npm run dev   # http://localhost:3001

# Frontend, in a second terminal
cd client
npm install
npm run dev   # http://localhost:5173
```

See [NOTES.md](./NOTES.md) for a file-by-file breakdown of how it works.

## Deployment notes

- **Frontend (Vercel):** `client/.env.production` sets `VITE_API_BASE_URL` to
  the deployed backend's URL — this is safe to commit since it's a public URL,
  not a secret, and Vite bakes it into the built JS bundle anyway.
- **Backend (Render):** deployed via the `render.yaml` Blueprint at the repo
  root. Secrets (`GEMINI_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `CLIENT_ORIGIN`) are set in Render's dashboard, never committed.
- **Database (Turso):** Prisma's migration engine only supports local `file:`
  SQLite connections — it can't reach Turso directly. The actual workflow for
  schema changes: run `npx prisma migrate dev` locally as usual (creates a
  migration against a local file), then apply the generated `.sql` file to
  Turso by hand: `turso db shell <db-name> < prisma/migrations/<new>/migration.sql`.
- **CORS** is scoped to the deployed frontend's origin (`CLIENT_ORIGIN` env
  var) plus local dev ports — not open to arbitrary origins.
- **Rate limiting:** the `/hint` endpoint (the one that spends real Gemini API
  quota per call) is limited to 10 requests / 10 minutes per IP, since it has
  no authentication and is now publicly reachable.
