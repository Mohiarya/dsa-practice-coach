import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { problemsRouter } from "./routes/problems.js";
import { statsRouter } from "./routes/stats.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware.js";

// The Express app, separate from server.js's .listen() call — this is
// what lets integration tests import and exercise real routes against an
// ephemeral port, without duplicating the CORS/route-mounting setup.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5180",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

export const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    // The session lives in an httpOnly cookie, not a header the frontend
    // sets itself — cross-origin fetches need both this and
    // `credentials: "include"` on the client side for the cookie to be
    // sent/stored at all.
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

// Every problem/stats route requires a valid session — nothing under
// these two mounts is reachable without it, and every handler further
// scopes its query to req.userId (see routes/problems.js, routes/stats.js).
app.use("/api/problems", requireAuth, problemsRouter);
app.use("/api/stats", requireAuth, statsRouter);
