import { useEffect, useState } from "react";
import { API_BASE } from "../api";

export default function Stats({ refreshTrigger }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/stats`)
      .then((res) => res.json())
      .then(setStats);
  }, [refreshTrigger]);

  if (!stats) return null;

  return (
    <section className="stats-grid">
      <div className="stat-tile">
        <div className="stat-number">{stats.total}</div>
        <div className="stat-label">Logged</div>
      </div>
      <div className="stat-tile">
        <div className="stat-number">{stats.solved}</div>
        <div className="stat-label">Solved</div>
      </div>
      <div className="stat-tile">
        <div className="stat-number">{stats.streak}</div>
        <div className="stat-label">Day streak</div>
      </div>
      {stats.byPattern.length > 0 && (
        <div className="stat-patterns">
          {stats.byPattern.map((p) => (
            <span key={p.pattern} className="status-badge">
              {p.pattern} &times;{p.count}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
