import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import NavBar from "./components/NavBar";
import LogProblemModal from "./components/LogProblemModal";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";

function AuthedApp() {
  const [modalState, setModalState] = useState(null); // null | { problem: null | Problem }
  const [dataVersion, setDataVersion] = useState(0);

  function openCreateModal() {
    setModalState({ problem: null });
  }

  function openEditModal(problem) {
    setModalState({ problem });
  }

  function handleSaved() {
    setModalState(null);
    setDataVersion((v) => v + 1);
  }

  return (
    <div className="app">
      <NavBar onLogProblem={openCreateModal} />

      <main className="app-main">
        <Routes>
          <Route path="/dashboard" element={<Dashboard key={`dashboard-${dataVersion}`} onLogProblem={openCreateModal} />} />
          <Route path="/practice" element={<Practice key={`practice-${dataVersion}`} />} />
          <Route
            path="/progress"
            element={<Progress key={`progress-${dataVersion}`} onEditProblem={openEditModal} />}
          />
          <Route path="/profile" element={<Profile key={`profile-${dataVersion}`} />} />
          {/* An authenticated user has nothing to do on the marketing/auth
              pages — bounce straight into the app instead. */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {modalState && (
        <LogProblemModal
          problem={modalState.problem}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function GuestApp() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {/* No session — every protected route (and anything unknown) sends
          you to log in rather than rendering a broken/empty page. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    // Deliberately bare: we don't yet know whether to show the app shell
    // or the guest pages, so showing neither avoids a flash of the wrong one.
    return <div className="app" />;
  }

  return user ? <AuthedApp /> : <GuestApp />;
}

export default App;
