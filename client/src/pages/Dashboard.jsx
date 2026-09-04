import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { recommendNextProblem } from "../recommend";
import EmptyState from "../components/EmptyState";
import { SkeletonStatRow, SkeletonCard } from "../components/Skeleton";
import PatternMastery from "../components/PatternMastery";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard({ onLogProblem }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.dueProblems(), api.listProblems(), api.stats(), api.history(), api.reviewTimeline()])
      .then(([due, problems, stats, history, reviews]) => {
        if (cancelled) return;
        setData({ due, problems, stats, history, reviews });
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Dashboard</p>
            <h1 className="page-title">What should I do today?</h1>
          </div>
        </div>
        <SkeletonCard />
        <div style={{ height: 16 }} />
        <SkeletonStatRow />
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">Couldn't load your dashboard — {error}</div>;
  }

  const { due, problems, stats, history, reviews } = data;

  if (problems.length === 0) {
    return (
      <EmptyState
        icon={<span style={{ fontSize: 20 }}>◇</span>}
        title="Your DSA journey starts here."
        message="Log your first problem and we'll build your personalized review schedule."
        action={
          <button className="btn btn-primary" onClick={onLogProblem}>
            + Log First Problem
          </button>
        }
      />
    );
  }

  const recommendation = recommendNextProblem({
    due,
    allProblems: problems,
    patternMastery: history.patternMastery,
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-title">What should I do today?</h1>
        </div>
      </div>

      <div className="hero-cta">
        <div className="hero-cta-text">
          <p className="page-eyebrow">Today's practice</p>
          <div className="hero-cta-headline">
            {due.length === 0 ? "Nothing due right now" : `${due.length} review${due.length === 1 ? "" : "s"} due`}
          </div>
          <div className="hero-cta-sub">
            {due.length === 0
              ? "You're caught up. Practice ahead on your weakest pattern instead."
              : "Most overdue problems come first."}
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/practice")}>
          Start Today's Practice
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.total}</div>
          <div className="stat-tile-label">Problems logged</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{stats.solved}</div>
          <div className="stat-tile-label">Solved</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value streak-flame">{stats.streak}</div>
          <div className="stat-tile-label">Day streak</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{history.totalReviews}</div>
          <div className="stat-tile-label">Total reviews</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          <div className="panel section">
            <p className="panel-label">Weakest patterns</p>
            {history.patternMastery.length === 0 ? (
              <EmptyState
                title="Not enough review history yet"
                message="Rate a few reviews and pattern mastery will show up here."
              />
            ) : (
              <PatternMastery masteryData={history.patternMastery} allPatterns={stats.byPattern} />
            )}
          </div>

          <div className="panel">
            <p className="panel-label">Recent activity</p>
            {reviews.length === 0 ? (
              <EmptyState title="No reviews yet" message="Your rated reviews will show up here." />
            ) : (
              <div className="activity-list">
                {reviews.slice(0, 6).map((r) => (
                  <div className="activity-row" key={r.id}>
                    <span>{r.problem.title}</span>
                    <span className="activity-time">{timeAgo(r.reviewedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {recommendation && (
            <div className="panel section">
              <p className="panel-label">Recommended next</p>
              <div className="recommendation-card">
                <div>
                  <div className="problem-title">{recommendation.problem.title}</div>
                  <div className="recommendation-reason">{recommendation.reason}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate("/practice")}>
                  Go
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: "var(--space-2)" }}>
                Rule-based recommendation — not machine learning.
              </p>
            </div>
          )}

          <div className="panel">
            <p className="panel-label">Status breakdown</p>
            <div className="signal-list">
              <div className="signal-row">
                <span>Solved</span>
                <span className="badge badge-success">{stats.solved}</span>
              </div>
              <div className="signal-row">
                <span>Stuck</span>
                <span className="badge badge-danger">{stats.stuck}</span>
              </div>
              <div className="signal-row">
                <span>Attempted (not yet reviewed)</span>
                <span className="badge badge-neutral">{stats.total - stats.solved - stats.stuck}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
