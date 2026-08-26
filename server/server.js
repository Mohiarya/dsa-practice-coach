import express from "express";
import cors from "cors";
import "dotenv/config";
import { problemsRouter } from "./routes/problems.js";
import { statsRouter } from "./routes/stats.js";

// CORS: only the deployed frontend (plus local dev ports) may call this
// API from a browser. Requests with no Origin header (curl, server-to-
// server, health checks) are always allowed — CORS is a browser-enforced
// mechanism, not a real access-control boundary on its own.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5180",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/problems", problemsRouter);
app.use("/api/stats", statsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
