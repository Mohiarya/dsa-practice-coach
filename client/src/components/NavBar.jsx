import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export default function NavBar({ onLogProblem }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to="/dashboard" className="brand">
          <span className="brand-mark" aria-hidden="true">DC</span>
          <span className="nav-label">DSA Practice Coach</span>
        </NavLink>

        <nav className="main-nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink to="/practice" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-label">Practice</span>
          </NavLink>
          <NavLink to="/progress" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-label">Progress</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-label">Profile</span>
          </NavLink>
        </nav>

        <div className="nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={onLogProblem}>
            + Log Problem
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
