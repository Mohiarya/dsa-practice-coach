import { QUALITY_BUTTONS } from "../quality";

const VARIANT = { 1: "again", 3: "hard", 4: "good", 5: "easy" };

export default function ReviewButtons({ onRate, disabled }) {
  return (
    <div className="review-buttons">
      {QUALITY_BUTTONS.map((q) => (
        <button
          key={q.value}
          className={`review-btn review-btn-${VARIANT[q.value]}`}
          onClick={() => onRate(q.value)}
          disabled={disabled}
        >
          <span className="review-btn-label">{q.label}</span>
          <span className="review-btn-hint">{q.hint}</span>
        </button>
      ))}
    </div>
  );
}
