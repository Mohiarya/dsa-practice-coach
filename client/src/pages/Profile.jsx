import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { SkeletonCard } from "../components/Skeleton";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    Promise.all([api.stats(), api.history()])
      .then(([s, h]) => {
        setStats(s);
        setHistory(h);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate("/login");
  }

  const displayName = user?.name || user?.email?.split("@")[0];

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Profile</p>
            <h1 className="page-title">Welcome back{displayName ? `, ${displayName}` : ""} 👋</h1>
          </div>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  const sortedPatterns = [...history.patternMastery].sort((a, b) => b.masteryPercent - a.masteryPercent);
  const strongest = sortedPatterns[0];
  const weakest = sortedPatterns[sortedPatterns.length - 1];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Profile</p>
          <h1 className="page-title">Welcome back{displayName ? `, ${displayName}` : ""} 👋</h1>
        </div>
      </div>

      <div className="profile-header">
        <div className="profile-avatar">{(displayName || "?").charAt(0).toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{displayName}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user?.email}</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.total}</div>
          <div className="stat-tile-label">Problems logged</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{history.totalReviews}</div>
          <div className="stat-tile-label">Reviews completed</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value streak-flame">{stats.streak}</div>
          <div className="stat-tile-label">Current streak</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.solved}</div>
          <div className="stat-tile-label">Solved</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <p className="panel-label">Strongest pattern</p>
          {strongest ? (
            <p style={{ fontSize: 14 }}>
              <strong>{strongest.pattern}</strong> — {strongest.masteryPercent}% success ({strongest.reviewCount} reviews)
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Not enough review history yet.</p>
          )}

          <p className="panel-label" style={{ marginTop: "var(--space-4)" }}>Weakest pattern</p>
          {weakest && weakest !== strongest ? (
            <p style={{ fontSize: 14 }}>
              <strong>{weakest.pattern}</strong> — {weakest.masteryPercent}% success ({weakest.reviewCount} reviews)
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {sortedPatterns.length <= 1 ? "Review problems in more than one pattern to see this." : ""}
            </p>
          )}
        </div>

        <div className="panel">
          <p className="panel-label">Account</p>
          <div className="signal-list">
            <div className="signal-row">
              <span>Email</span>
              <span className="mono" style={{ fontSize: 12.5 }}>{user?.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: "var(--space-4)" }} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
