import { useEffect, useState } from "react";
import { API_BASE } from "./api";
import AddProblemForm from "./components/AddProblemForm";
import ProblemList from "./components/ProblemList";
import DueReview from "./components/DueReview";
import Stats from "./components/Stats";

function App() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function fetchProblems() {
    return fetch(`${API_BASE}/problems`)
      .then((res) => res.json())
      .then((data) => setProblems(data));
  }

  function refreshEverything() {
    fetchProblems();
    setRefreshTrigger((n) => n + 1);
  }

  useEffect(() => {
    fetchProblems().finally(() => setLoading(false));
  }, []);

  function handleAdded(newProblem) {
    setProblems((prev) => [newProblem, ...prev]);
    setRefreshTrigger((n) => n + 1);
  }

  return (
    <div className="app">
      <h1>DSA Practice Coach</h1>

      <Stats refreshTrigger={refreshTrigger} />

      <DueReview onReviewed={refreshEverything} />

      <AddProblemForm onAdded={handleAdded} />

      <section>
        <h2>Your problems</h2>
        {loading ? <p className="empty-state">Loading...</p> : <ProblemList problems={problems} />}
      </section>
    </div>
  );
}

export default App;
