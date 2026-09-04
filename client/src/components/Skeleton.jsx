export function SkeletonLine({ width = "100%" }) {
  return <div className="skeleton skeleton-line" style={{ width }} />;
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />;
}

export function SkeletonStatRow({ count = 4 }) {
  return (
    <div className="stat-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-tile">
          <div className="skeleton skeleton-line" style={{ width: "40%", height: 20 }} />
          <div className="skeleton skeleton-line" style={{ width: "70%", marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}
