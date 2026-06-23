interface PotDisplayProps {
  pot: number;
  currentBet: number;
  currentTurnPlayerName?: string;
}

export default function PotDisplay({
  pot,
  currentBet,
  currentTurnPlayerName,
}: PotDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-full bg-yellow-700/60 px-6 py-2 text-center">
        <div className="text-xs text-yellow-300">底池</div>
        <div className="text-lg sm:text-xl font-bold text-yellow-400">
          {pot}
        </div>
      </div>
      {currentBet > 0 && (
        <div className="text-xs text-emerald-300">
          当前注: {currentBet}
        </div>
      )}
      {currentTurnPlayerName && (
        <div className="animate-pulse text-xs font-semibold text-yellow-300">
          {currentTurnPlayerName} 操作中...
        </div>
      )}
    </div>
  );
}
