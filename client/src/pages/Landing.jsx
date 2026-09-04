import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-shell fade-in">
      <span className="brand-mark" aria-hidden="true" style={{ width: 40, height: 40, fontSize: 16 }}>
        DC
      </span>
      <h1 className="landing-headline">Your personal system for mastering DSA</h1>
      <p className="landing-sub">
        Deliberate practice, Socratic coaching, and spaced repetition — one coherent loop:
        practice, get coached, rate your recall, and let the schedule bring problems back
        exactly when you're about to forget them.
      </p>
      <div className="landing-actions">
        <Link to="/signup" className="btn btn-primary btn-lg">Sign Up</Link>
        <Link to="/login" className="btn btn-ghost btn-lg">Log In</Link>
      </div>
    </div>
  );
}
