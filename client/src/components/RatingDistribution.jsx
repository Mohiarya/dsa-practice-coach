import EmptyState from "./EmptyState";

const BARS = [
  { key: "again", label: "Again", color: "var(--danger)" },
  { key: "hard", label: "Hard", color: "var(--warning)" },
  { key: "good", label: "Good", color: "var(--accent)" },
  { key: "easy", label: "Easy", color: "var(--success)" },
];

// distribution: { again, hard, good, easy } counts, from /stats/history.
export default function RatingDistribution({ distribution }) {
  const total = BARS.reduce((sum, b) => sum + (distribution[b.key] || 0), 0);
  if (total === 0) {
    return <EmptyState title="No ratings yet" message="Rate a review to see how your ratings break down." />;
  }

  const max = Math.max(...BARS.map((b) => distribution[b.key] || 0), 1);

  return (
    <div>
      <div className="rating-bars">
        {BARS.map((b) => {
          const count = distribution[b.key] || 0;
          return (
            <div className="rating-bar-col" key={b.key}>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{count}</span>
              <div
                className="rating-bar"
                style={{ height: `${(count / max) * 100}%`, background: b.color }}
              />
              <span className="rating-bar-label">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
