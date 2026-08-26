import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { QUALITY_BUTTONS } from "../quality";

export default function DueReview({ onReviewed }) {
  const [dueProblems, setDueProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDue();
  }, []);

  function fetchDue() {
    setLoading(true);
    fetch(`${API_BASE}/problems/due`)
      .then((res) => res.json())
      .then((data) => setDueProblems(data))
      .finally(() => setLoading(false));
  }

  async function submitReview(problemId, quality) {
    await fetch(`${API_BASE}/problems/${problemId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quality }),
    });

    // The reviewed problem now has a future nextReviewDate, so it no longer
    // belongs in this list — remove it locally instead of re-fetching
    // everything from the server.
    setDueProblems((prev) => prev.filter((p) => p.id !== problemId));
    onReviewed();
  }

  if (loading) return <p className="empty-state">Loading due problems...</p>;

  return (
    <section>
      <h2>Due for review today ({dueProblems.length})</h2>
      {dueProblems.length === 0 && <p className="empty-state">Nothing due right now — nice.</p>}
      <ul>
        {dueProblems.map((p) => (
          <li key={p.id} className="card">
            <div className="card-title">{p.title}</div>
            <div className="card-meta">
              {p.difficulty} &middot; {p.pattern}
            </div>
            <div className="review-buttons">
              {QUALITY_BUTTONS.map((q) => (
                <button
                  key={q.value}
                  className="btn-secondary"
                  title={q.hint}
                  onClick={() => submitReview(p.id, q.value)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
