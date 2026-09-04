import EmptyState from "./EmptyState";

// days: [{ date: "YYYY-MM-DD", count }], oldest first, from /stats/history.
// Rendered as a GitHub-style contribution grid, columns = weeks, rows = Sun-Sat.
export default function ReviewHeatmap({ days }) {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <EmptyState
        title="No review activity yet"
        message="Once you start rating reviews, your activity will show up here as a calendar of practice days."
      />
    );
  }

  const max = Math.max(...days.map((d) => d.count), 1);
  const levelFor = (count) => {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };

  // Pad the front so the first column starts on Sunday, matching the 7-row grid.
  const firstDow = new Date(days[0].date + "T00:00:00").getDay();
  const padded = [...Array(firstDow).fill(null), ...days];

  return (
    <div>
      <div className="heatmap">
        {padded.map((d, i) => (
          <div
            key={i}
            className="heatmap-cell"
            data-level={d ? levelFor(d.count) : undefined}
            style={d ? undefined : { background: "transparent" }}
            title={d ? `${d.date}: ${d.count} review${d.count === 1 ? "" : "s"}` : undefined}
          />
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: "var(--space-2)" }}>
        {total} review{total === 1 ? "" : "s"} over the last {days.length} days
      </p>
    </div>
  );
}
