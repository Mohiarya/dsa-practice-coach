# DSA Practice Coach

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

## Stack

- **Backend:** Node.js, Express, Prisma (SQLite via a driver adapter)
- **Frontend:** React (Vite)
- **AI:** Google Gemini API

## Running locally

Requires a free Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys).

```bash
# Backend
cd server
npm install
echo "GEMINI_API_KEY=your_key_here" > .env
npx prisma migrate dev
npm run dev   # http://localhost:3001

# Frontend, in a second terminal
cd client
npm install
npm run dev   # http://localhost:5173
```

See [NOTES.md](./NOTES.md) for a file-by-file breakdown of how it works.
