import { useEffect, useState } from "react";

interface TimerBarProps {
  deadline: number | null;
  isMyTurn: boolean;
}

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

  const pct = Math.min(100, (remaining / 30) * 100);
  const color = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-emerald-900 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`}
               style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-sm font-bold min-w-[2ch] ${isMyTurn && remaining <= 5 ? "text-red-400 animate-pulse" : "text-emerald-200"}`}>
          {remaining}
        </span>
      </div>
    </div>
  );
}
