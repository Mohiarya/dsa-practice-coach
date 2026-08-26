import { useState } from "react";
import { API_BASE } from "../api";

export default function HintBox({ problemId }) {
  const [open, setOpen] = useState(false);
  const [stuckPoint, setStuckPoint] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestHint(e) {
    e.preventDefault();
    if (!stuckPoint.trim()) return;

    setLoading(true);
    setError("");
    setHint("");

    try {
      const res = await fetch(`${API_BASE}/problems/${problemId}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stuckPoint }),
      });

      const data = await res.json();

      if (!res.ok) {
        // The backend distinguishes "you sent something wrong" (400/404)
        // from "the AI call itself failed" (502) — surface either as an
        // error message rather than a silent failure.
        throw new Error(data.error || "Something went wrong");
      }

      setHint(data.hint);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="hint-box">
        <button className="btn-secondary" onClick={() => setOpen(true)}>
          Get a hint
        </button>
      </div>
    );
  }

  return (
    <div className="hint-box">
      <form className="hint-form" onSubmit={requestHint}>
        <textarea
          value={stuckPoint}
          onChange={(e) => setStuckPoint(e.target.value)}
          placeholder="What have you tried? Where are you stuck?"
        />
        <button type="submit" className="btn-secondary" disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? "Thinking..." : "Ask for a hint"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {hint && (
        <p className="hint-result">
          <strong>Hint:</strong> {hint}
        </p>
      )}
    </div>
  );
}
