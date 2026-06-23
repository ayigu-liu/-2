import ChipStack from "./ChipStack";

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
      <div className="rounded-full bg-gradient-to-br from-yellow-700/80 to-yellow-900/80 px-6 py-2 text-center shadow-lg shadow-yellow-900/50">
        <ChipStack amount={pot} size="md" showLabel />
      </div>
      {currentBet > 0 && (
        <div className="text-xs text-emerald-300 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          当前注: {currentBet}
        </div>
      )}
      {currentTurnPlayerName && (
        <div className="text-xs font-semibold text-yellow-300 flex items-center gap-1">
          {currentTurnPlayerName}
          <span className="flex gap-0.5">
            <span className="animate-bounce w-1 h-1 rounded-full bg-yellow-300" style={{ animationDelay: "0ms" }} />
            <span className="animate-bounce w-1 h-1 rounded-full bg-yellow-300" style={{ animationDelay: "200ms" }} />
            <span className="animate-bounce w-1 h-1 rounded-full bg-yellow-300" style={{ animationDelay: "400ms" }} />
          </span>
        </div>
      )}
    </div>
  );
}
