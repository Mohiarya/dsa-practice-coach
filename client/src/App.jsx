import { useEffect, useState } from "react";
import { API_BASE } from "./api";

function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <div>
      <h1>DSA Practice Coach</h1>
      <p>Backend status: {status}</p>
    </div>
  );
}

export default App;
