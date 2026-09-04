export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state fade-in">
      {icon && (
        <div className="empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="empty-state-title">{title}</div>
      {message && <p className="empty-state-message">{message}</p>}
      {action}
    </div>
  );
}
