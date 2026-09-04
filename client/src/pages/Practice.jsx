import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { recommendNextProblem } from "../recommend";
import { describeReviewState } from "../utils";
import CoachPanel from "../components/CoachPanel";
import ReviewButtons from "../components/ReviewButtons";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";

export default function Practice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState([]);
  const [practiceAheadCandidate, setPracticeAheadCandidate] = useState(null);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [lastResult, setLastResult] = useState(null); // { updated, quality }
  const [rating, setRating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.dueProblems(), api.listProblems(), api.history()])
      .then(([due, problems, history]) => {
        if (cancelled) return;
        setQueue(due);
        setSessionTotal(due.length);
        if (due.length === 0) {
          const rec = recommendNextProblem({ due: [], allProblems: problems, patternMastery: history.patternMastery });
          setPracticeAheadCandidate(rec);
        }
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  async function handleRate(quality) {
    const current = queue[0];
    setRating(true);
    try {
      const updated = await api.submitReview(current.id, quality);
      setLastResult({ updated, quality });
    } catch (err) {
      setError(err.message);
    } finally {
      setRating(false);
    }
  }

  function continueSession() {
    setQueue((prev) => prev.slice(1));
    setLastResult(null);
  }

  function startPracticeAhead() {
    setQueue([practiceAheadCandidate.problem]);
    setSessionTotal(1);
    setPracticeAheadCandidate(null);
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Practice</p>
            <h1 className="page-title">Focused session</h1>
          </div>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  // Session complete (queue empty, nothing left to rate).
  if (queue.length === 0 && !lastResult) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Practice</p>
            <h1 className="page-title">Focused session</h1>
          </div>
        </div>
        <EmptyState
          icon={<span style={{ fontSize: 20 }}>✓</span>}
          title={sessionTotal > 0 ? "Session complete" : "Nothing due right now"}
          message={
            sessionTotal > 0
              ? "You've cleared every review that was due today. Nice work."
              : "No reviews are scheduled today."
          }
          action={
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/dashboard")}>
                Back to dashboard
              </button>
              {practiceAheadCandidate && (
                <button className="btn btn-secondary btn-sm" onClick={startPracticeAhead}>
                  Practice ahead: {practiceAheadCandidate.problem.title}
                </button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  // Just rated the last item in the queue — show confirmation, then let
  // them explicitly end the session (queue is empty underneath this).
  if (lastResult && queue.length === 1) {
    return <ReviewConfirmation result={lastResult} onContinue={continueSession} isLast />;
  }

  if (lastResult) {
    return <ReviewConfirmation result={lastResult} onContinue={continueSession} />;
  }

  const current = queue[0];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Practice</p>
          <h1 className="page-title">Focused session</h1>
        </div>
      </div>

      {sessionTotal > 1 && (
        <div className="practice-progress">
          <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {sessionTotal - queue.length + 1} / {sessionTotal}
          </span>
          <div className="practice-progress-track">
            <div
              className="practice-progress-fill"
              style={{ width: `${((sessionTotal - queue.length) / sessionTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="practice-layout">
        <div className="panel">
          <p className="panel-label">Problem</p>
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>{current.title}</h2>
          <div className="problem-meta" style={{ marginBottom: 8 }}>
            <span className={`badge difficulty-${current.difficulty}`}>{current.difficulty}</span>
            <span className="pattern-tag">{current.pattern}</span>
            {current.url && (
              <a href={current.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                Open on LeetCode ↗
              </a>
            )}
          </div>

          <div className="due-reason">{describeReviewState(current)}</div>

          {current.notes && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <p className="panel-label">Your notes</p>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{current.notes}</p>
            </div>
          )}

          <div className="sm2-explain">
            <div className="sm2-explain-row">
              <span className="label">Ease factor</span>
              <span className="value">{current.easeFactor.toFixed(2)}</span>
            </div>
            <div className="sm2-explain-row">
              <span className="label">Current interval</span>
              <span className="value">{current.interval} day{current.interval === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <CoachPanel problemId={current.id} />
        </div>
      </div>

      {/* Review is deliberately its own section below Problem | Coach, not
          embedded in the problem panel — solve, consult the coach if
          stuck, THEN rate, matching the intended practice → coach →
          self-rate order rather than encouraging a rating before you've
          used the coach. */}
      <div className="panel" style={{ marginTop: "var(--space-4)" }}>
        <p className="panel-label">Review</p>
        <ReviewButtons onRate={handleRate} disabled={rating} />
        <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 10 }}>
          Again resets your schedule. Hard, Good, and Easy each push the next review further out — Easy the most.
        </p>
      </div>
    </div>
  );
}

function ReviewConfirmation({ result, onContinue, isLast }) {
  const { updated, quality } = result;
  const wasSuccess = quality >= 3; // QUALITY.HARD
  return (
    <div className="fade-in">
      <div className="panel review-confirmation">
        <div className={`badge ${wasSuccess ? "badge-success" : "badge-danger"}`} style={{ marginBottom: 12 }}>
          {wasSuccess ? "Recorded" : "Recorded — marked stuck"}
        </div>
        <h2 style={{ fontSize: 19, marginBottom: 6 }}>{updated.title}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Scheduled for review in {updated.interval} day{updated.interval === 1 ? "" : "s"} (
          {new Date(updated.nextReviewDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}).
        </p>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onContinue}>
          {isLast ? "Finish session" : "Next problem"}
        </button>
      </div>
    </div>
  );
}
