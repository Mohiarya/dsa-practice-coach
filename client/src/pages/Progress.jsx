import { useEffect, useState } from "react";
import { api } from "../api";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import PatternMastery from "../components/PatternMastery";
import ReviewHeatmap from "../components/ReviewHeatmap";
import RatingDistribution from "../components/RatingDistribution";
import ProblemCard from "../components/ProblemCard";
import ConfirmDialog from "../components/ConfirmDialog";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const QUALITY_LABEL = { 1: "Again", 3: "Hard", 4: "Good", 5: "Easy" };

export default function Progress({ onEditProblem }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function loadAll() {
    return Promise.all([api.listProblems(), api.stats(), api.history(), api.reviewTimeline()]).then(
      ([p, s, h, r]) => {
        setProblems(p);
        setStats(s);
        setHistory(h);
        setReviews(r);
      }
    );
  }

  useEffect(() => {
    loadAll()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteProblem(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Progress</p>
            <h1 className="page-title">Your DSA mastery</h1>
          </div>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (problems.length === 0) {
    return (
      <EmptyState
        title="Nothing to show yet"
        message="Log and review a few problems, and this page fills in with real mastery and activity data."
      />
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Progress</p>
          <h1 className="page-title">Your DSA mastery</h1>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <span className="section-title">DSA Mastery</span>
          <span className="section-sub">% of reviews rated Hard or better, by pattern</span>
        </div>
        <div className="panel">
          <PatternMastery masteryData={history.patternMastery} allPatterns={stats.byPattern} />
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="section">
          <div className="section-header">
            <span className="section-title">Review Activity</span>
          </div>
          <div className="panel">
            <ReviewHeatmap days={history.reviewsByDay} />
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <span className="section-title">Rating Distribution</span>
          </div>
          <div className="panel">
            <RatingDistribution distribution={history.ratingDistribution} />
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="section">
          <div className="section-header">
            <span className="section-title">Performance by difficulty</span>
          </div>
          <div className="panel">
            {history.performanceByDifficulty.length === 0 ? (
              <EmptyState title="No reviews yet" message="Difficulty breakdown appears once you've rated some reviews." />
            ) : (
              <div className="signal-list">
                {history.performanceByDifficulty.map((d) => (
                  <div className="signal-row" key={d.key}>
                    <span>{d.key}</span>
                    <span>
                      <span className="mono" style={{ marginRight: 10, color: "var(--text-tertiary)" }}>
                        {d.totalReviews} review{d.totalReviews === 1 ? "" : "s"}
                      </span>
                      <span className="badge badge-accent">{d.successRate}% success</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <span className="section-title">Performance by pattern</span>
          </div>
          <div className="panel">
            {history.performanceByPattern.length === 0 ? (
              <EmptyState title="No reviews yet" message="Pattern breakdown appears once you've rated some reviews." />
            ) : (
              <div className="signal-list">
                {history.performanceByPattern.map((d) => (
                  <div className="signal-row" key={d.key}>
                    <span>{d.key}</span>
                    <span>
                      <span className="mono" style={{ marginRight: 10, color: "var(--text-tertiary)" }}>
                        {d.totalReviews} review{d.totalReviews === 1 ? "" : "s"}
                      </span>
                      <span className="badge badge-accent">{d.successRate}% success</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section-header">
          <span className="section-title">Learning Signals</span>
        </div>
        <div className="dashboard-grid">
          <div className="panel">
            <p className="panel-label">Most reviewed pattern</p>
            {history.mostReviewedPattern ? (
              <p style={{ fontSize: 14 }}>
                <strong>{history.mostReviewedPattern.key}</strong> — {history.mostReviewedPattern.totalReviews}{" "}
                review{history.mostReviewedPattern.totalReviews === 1 ? "" : "s"},{" "}
                {history.mostReviewedPattern.successRate}% success
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Not enough review history yet.</p>
            )}

            <p className="panel-label" style={{ marginTop: "var(--space-4)" }}>Problems frequently marked Again</p>
            {history.frequentlyFailed.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>None yet — nothing has failed repeatedly.</p>
            ) : (
              <div className="signal-list">
                {history.frequentlyFailed.slice(0, 5).map((f) => (
                  <div className="signal-row" key={f.problem.id}>
                    <span>{f.problem.title}</span>
                    <span className="badge badge-danger">{f.againCount}× Again</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <p className="panel-label">Strongest retention</p>
            {history.strongestRetention.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                Review a problem twice with no "Again" ratings to see it here.
              </p>
            ) : (
              <div className="signal-list">
                {history.strongestRetention.slice(0, 5).map((s) => (
                  <div className="signal-row" key={s.problem.id}>
                    <span>{s.problem.title}</span>
                    <span className="badge badge-success">{s.reviewCount} reviews, 0 Again</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-title">Review Timeline</span>
          <span className="section-sub">{reviews.length} total</span>
        </div>
        <div className="panel">
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" message="Every rated review will appear here, newest first." />
          ) : (
            <div>
              {reviews.slice(0, 25).map((r) => (
                <div className="timeline-row" key={r.id}>
                  <span>{r.problem.title}</span>
                  <span className="badge badge-neutral">{QUALITY_LABEL[r.quality] || r.quality}</span>
                  <span className="mono" style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                    {formatDate(r.reviewedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-title">All Problems</span>
          <span className="section-sub">{problems.length} logged</span>
        </div>
        <div className="grid">
          {problems.map((p) => (
            <ProblemCard
              key={p.id}
              problem={p}
              onEdit={onEditProblem}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      </section>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this problem?"
          message={`"${deleteTarget.title}" and its full review history will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
