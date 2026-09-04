import EmptyState from "./EmptyState";

// masteryData: [{ pattern, masteryPercent, reviewCount }] — only patterns
// with at least one review (see server/reviewStats.js). allPatterns: [{
// pattern, count }] — every pattern that has a logged problem, reviewed or
// not. Patterns with problems but zero reviews render as "not yet
// reviewed" instead of a fabricated 0% bar.
export default function PatternMastery({ masteryData, allPatterns }) {
  if (!allPatterns || allPatterns.length === 0) {
    return (
      <EmptyState
        title="No patterns yet"
        message="Log a problem with a pattern tag to start building your mastery breakdown."
      />
    );
  }

  const byPattern = new Map(masteryData.map((m) => [m.pattern, m]));
  const rows = allPatterns
    .map((p) => byPattern.get(p.pattern) || { pattern: p.pattern, masteryPercent: null, reviewCount: 0 })
    .sort((a, b) => (b.masteryPercent ?? -1) - (a.masteryPercent ?? -1));

  return (
    <div>
      {rows.map((r) => (
        <div className="mastery-row" key={r.pattern}>
          <span className="mastery-label" title={r.pattern}>{r.pattern}</span>
          <div className="mastery-track">
            {r.masteryPercent !== null && (
              <div className="mastery-fill" style={{ width: `${r.masteryPercent}%` }} />
            )}
          </div>
          <span className="mastery-value">
            {r.masteryPercent !== null ? `${r.masteryPercent}%` : "—"}
          </span>
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: "var(--space-2)" }}>
        % of reviews rated Hard or better for that pattern. "—" means not yet reviewed.
      </p>
    </div>
  );
}
