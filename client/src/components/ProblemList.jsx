import HintBox from "./HintBox";

export default function ProblemList({ problems }) {
  if (problems.length === 0) {
    return <p className="empty-state">No problems logged yet — add one above.</p>;
  }

  return (
    <ul>
      {problems.map((p) => (
        <li key={p.id} className="card">
          <div className="card-title">{p.title}</div>
          <div className="card-meta">
            {p.difficulty} &middot; {p.pattern} &middot;{" "}
            <span className="status-badge">{p.status}</span>
            {p.url && (
              <>
                {" "}
                &middot; <a href={p.url} target="_blank" rel="noreferrer">LeetCode link</a>
              </>
            )}
          </div>
          <HintBox problemId={p.id} />
        </li>
      ))}
    </ul>
  );
}
