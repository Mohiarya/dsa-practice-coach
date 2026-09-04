import { useState } from "react";
import { api } from "../api";

/**
 * The backend hint call is one-shot and stateless — each request only ever
 * sends the problem's context plus whatever you type in `stuckPoint` right
 * now; Gemini never sees earlier hints in this thread. So this component
 * keeps a local `exchanges` list purely to render the conversation you've
 * had *this session* — it's real data from real calls, not simulated
 * memory. It's lost on refresh/leaving the page, and the coach note below
 * says so, rather than implying persistent conversation history that
 * doesn't exist.
 */
export default function CoachPanel({ problemId }) {
  const [exchanges, setExchanges] = useState([]); // [{ stuckPoint, hint, error }]
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(e) {
    e.preventDefault();
    const stuckPoint = draft.trim();
    if (!stuckPoint || loading) return;

    setDraft("");
    setLoading(true);
    const pending = { stuckPoint, hint: "", error: "" };
    setExchanges((prev) => [...prev, pending]);

    try {
      const { hint } = await api.requestHint(problemId, stuckPoint);
      setExchanges((prev) => prev.map((ex) => (ex === pending ? { ...ex, hint } : ex)));
    } catch (err) {
      setExchanges((prev) => prev.map((ex) => (ex === pending ? { ...ex, error: err.message } : ex)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="coach-panel">
      <div className="coach-header">
        <span className="coach-avatar" aria-hidden="true">C</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Coach</div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>Socratic — nudges, never solves</div>
        </div>
      </div>

      <div className="coach-thread">
        {exchanges.length === 0 && (
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
            Tell me where you're stuck.
          </p>
        )}

        {exchanges.map((ex, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div className="coach-bubble coach-bubble-student">{ex.stuckPoint}</div>
            {ex.error ? (
              <div className="coach-bubble coach-bubble-coach" role="alert" style={{ color: "var(--danger)" }}>
                {ex.error}
              </div>
            ) : ex.hint ? (
              <div className="coach-bubble coach-bubble-coach">{ex.hint}</div>
            ) : (
              <div className="coach-thinking">
                <span className="coach-dot" /><span className="coach-dot" /><span className="coach-dot" />
                Coach is thinking...
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="coach-input-row" onSubmit={ask}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={exchanges.length === 0 ? "What have you tried? Where are you stuck?" : "Still stuck? Say what you tried next..."}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) ask(e);
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !draft.trim()}>
          {loading ? "..." : exchanges.length === 0 ? "Ask for hint" : "Continue"}
        </button>
      </form>
      <p className="coach-note">
        Each hint is independent — the coach sees the problem and what you type here, not earlier hints in this thread.
      </p>
    </div>
  );
}
