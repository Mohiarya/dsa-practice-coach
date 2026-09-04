import { useState } from "react";
import { api } from "../api";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

// Suggestions only — the pattern field stays free text (see NOTES.md /
// PHASE 7 decision). These just make the common case fast to type without
// forcing every user's data into a fixed taxonomy.
const PATTERN_SUGGESTIONS = [
  "Arrays", "Hashing", "Strings", "Two Pointers", "Sliding Window",
  "Binary Search", "Stack", "Queue", "Linked List", "Trees", "Heap",
  "Graphs", "Dynamic Programming",
];

const EMPTY_FORM = { title: "", url: "", pattern: "", difficulty: "Easy", notes: "" };

function PatternField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const matches = PATTERN_SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  return (
    <div className="autocomplete">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Arrays, Hashing, Sliding Window..."
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className="autocomplete-menu">
          {matches.map((m) => (
            <div key={m} className="autocomplete-option" onMouseDown={() => onChange(m)}>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LogProblemModal({ problem, onClose, onSaved }) {
  const isEdit = Boolean(problem);
  const [form, setForm] = useState(
    isEdit
      ? { title: problem.title, url: problem.url || "", pattern: problem.pattern, difficulty: problem.difficulty, notes: problem.notes || "" }
      : EMPTY_FORM
  );
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
      const saved = isEdit ? await api.updateProblem(problem.id, form) : await api.createProblem(form);
      onSaved(saved, isEdit);
    } catch (err) {
      setError(err.message || "Couldn't save — check the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit problem" : "Log a problem"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ marginBottom: 14 }}>
            Title
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Two Sum"
            />
          </label>

          <div className="field-grid" style={{ marginBottom: 14 }}>
            <label>
              Pattern
              <PatternField value={form.pattern} onChange={(v) => updateField("pattern", v)} />
            </label>

            <label>
              Difficulty
              <select value={form.difficulty} onChange={(e) => updateField("difficulty", e.target.value)}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ marginBottom: 14 }}>
            LeetCode URL (optional)
            <input
              value={form.url}
              onChange={(e) => updateField("url", e.target.value)}
              placeholder="https://leetcode.com/problems/two-sum/"
            />
          </label>

          <label>
            Notes (optional)
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Your approach, what you learned, etc."
            />
          </label>

          {error && <p className="field-error" style={{ marginTop: 14 }}>{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add problem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
