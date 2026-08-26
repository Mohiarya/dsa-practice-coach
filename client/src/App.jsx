import { useEffect, useState } from "react";
import { API_BASE } from "./api";
import AddProblemForm from "./components/AddProblemForm";
import ProblemList from "./components/ProblemList";
import DueReview from "./components/DueReview";

function App() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  function fetchProblems() {
    return fetch(`${API_BASE}/problems`)
      .then((res) => res.json())
      .then((data) => setProblems(data));
  }

  useEffect(() => {
    fetchProblems().finally(() => setLoading(false));
  }, []);

  function handleAdded(newProblem) {
    setProblems((prev) => [newProblem, ...prev]);
  }

  return (
    <div>
      <h1>DSA Practice Coach</h1>

      <DueReview onReviewed={fetchProblems} />

      <AddProblemForm onAdded={handleAdded} />

      <h2>Your problems</h2>
      {loading ? <p>Loading...</p> : <ProblemList problems={problems} />}
    </div>
  );
}

export default App;
