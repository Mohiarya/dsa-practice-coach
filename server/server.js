import express from "express";
import cors from "cors";
import "dotenv/config";
import { problemsRouter } from "./routes/problems.js";
import { statsRouter } from "./routes/stats.js";

const app = express();
app.use(cors());
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
