import { useState } from "react";
import { API_BASE } from "../api";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const EMPTY_FORM = {
  title: "",
  url: "",
  pattern: "",
  difficulty: "Easy",
  notes: "",
};

export default function AddProblemForm({ onAdded }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.pattern.trim()) {
      setError("Title and pattern are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");

      const created = await res.json();
      onAdded(created);
      setForm(EMPTY_FORM);
    } catch {
      setError("Couldn't save the problem — check the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Log a problem</h2>

      <div className="field-grid">
        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Two Sum"
          />
        </label>

        <label>
          LeetCode URL (optional)
          <input
            value={form.url}
            onChange={(e) => updateField("url", e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
          />
        </label>

        <label>
          Pattern
          <input
            value={form.pattern}
            onChange={(e) => updateField("pattern", e.target.value)}
            placeholder="hashing, sliding-window, ..."
          />
        </label>

        <label>
          Difficulty
          <select
            value={form.difficulty}
            onChange={(e) => updateField("difficulty", e.target.value)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Notes (optional)
        <textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Your approach, what you learned, etc."
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={submitting} style={{ marginTop: 14 }}>
        {submitting ? "Saving..." : "Add problem"}
      </button>
    </form>
  );
}
