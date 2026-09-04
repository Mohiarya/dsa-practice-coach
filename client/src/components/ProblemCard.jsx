const STATUS_VARIANT = { solved: "badge-success", stuck: "badge-danger", attempted: "badge-neutral" };

export default function ProblemCard({ problem, onEdit, onDelete }) {
  return (
    <div className="card problem-card">
      <div className="problem-card-main">
        <div className="problem-title">{problem.title}</div>
        <div className="problem-meta">
          <span className={`badge difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
          <span className="pattern-tag">{problem.pattern}</span>
          <span className={`badge ${STATUS_VARIANT[problem.status] || "badge-neutral"}`}>{problem.status}</span>
          {problem.url && (
            <a href={problem.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              LeetCode ↗
            </a>
          )}
        </div>
      </div>

      <div className="problem-actions">
        {onEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(problem)}>
            Edit
          </button>
        )}
        {onDelete && (
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(problem)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
