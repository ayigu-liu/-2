import { useEffect, useState } from "react";

interface TimerBarProps {
  deadline: number | null;
  isMyTurn: boolean;
}

const SIZE = 44;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerBar({ deadline, isMyTurn }: TimerBarProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    function update() {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    }
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || remaining <= 0) return null;

  const total = 30;
  const pct = Math.min(1, remaining / total);
  const offset = CIRCUMFERENCE * (1 - pct);
  const urgent = remaining <= 5;

  const arcColor = urgent
    ? "#f87171"
    : pct > 0.5
      ? "#34d399"
      : "#eab308";

  return (
    <div className="flex items-center gap-2">
      <svg width={SIZE} height={SIZE} className="-rotate-90 drop-shadow-sm">
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{ filter: urgent ? "drop-shadow(0 0 4px rgba(248,113,113,0.6))" : undefined }}
        />
      </svg>
      <span
        className={`text-sm font-bold tabular-nums min-w-[2ch] ${
          urgent && isMyTurn
            ? "text-red-400 animate-pulse"
            : "text-emerald-200/80"
        }`}
      >
        {remaining}
      </span>
    </div>
  );
}
