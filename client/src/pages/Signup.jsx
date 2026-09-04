import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(email, password, name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Couldn't create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell fade-in">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">DC</span>
          DSA Practice Coach
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Your problems, reviews, and progress — saved to your own account.</p>

        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mohi" />
          </label>
          <label className="auth-field">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="auth-field">
            Password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </label>

          {error && <p className="field-error" style={{ marginBottom: 14 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
