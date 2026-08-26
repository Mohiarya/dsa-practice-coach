import HintBox from "./HintBox";

export default function ProblemList({ problems }) {
  if (problems.length === 0) {
    return <p>No problems logged yet — add one above.</p>;
  }

  return (
    <ul>
      {problems.map((p) => (
        <li key={p.id}>
          <strong>{p.title}</strong> — {p.difficulty} — {p.pattern} — {p.status}
          {p.url && (
            <>
              {" "}
              (<a href={p.url} target="_blank" rel="noreferrer">link</a>)
            </>
          )}
          <div>
            <HintBox problemId={p.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
