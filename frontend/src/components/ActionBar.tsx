import { useState } from "react";
interface ActionBarProps {
  isMyTurn: boolean;
  seen: boolean;
  canShowdown: boolean;
  activePlayers: number[];
  pot: number;
  currentBet: number;
  onLookCards: () => void;
  onBet: (action: string, amount?: number) => void;
  onCompare: (targetId: number) => void;
  onShowdown: () => void;
  playerNames: Record<number, string>;
}

export default function ActionBar({
  isMyTurn,
  seen,
  canShowdown,
  activePlayers,
  pot,
  currentBet,
  onLookCards,
  onBet,
  onCompare,
  onShowdown,
  playerNames,
}: ActionBarProps) {
  const [showComparePicker, setShowComparePicker] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState<number | null>(null);
  const [showRaiseInput, setShowRaiseInput] = useState(false);

  if (!isMyTurn) {
    return (
      <div className="flex justify-center py-3 text-sm text-emerald-300">
        等待其他玩家操作...
      </div>
    );
  }

  const compareTargets = activePlayers.filter(
    (id) => id !== undefined && id !== null
  );
  return (
    <div className="flex flex-col items-center gap-3 py-3">
      {showRaiseInput ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              { label: "1/2 底池", getAmount: () => Math.max(1, Math.floor(pot / 2)) },
              { label: "底池", getAmount: () => Math.max(1, pot) },
              { label: "2x 底池", getAmount: () => Math.max(1, pot * 2) },
              { label: "All-in", getAmount: () => 999999 },
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                onClick={() => {
                  onBet("raise", shortcut.getAmount());
                  setShowRaiseInput(false);
                  setRaiseAmount(null);
                }}
                className="rounded-lg bg-yellow-600/40 border border-yellow-500/30 px-3 py-1.5 text-xs font-bold text-yellow-200 hover:bg-yellow-600/60 hover:border-yellow-400/50 transition-all"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={raiseAmount ?? ""}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="w-24 rounded-lg border border-emerald-500/50 bg-emerald-800/60 px-3 py-2 text-white text-center text-sm focus:outline-none focus:border-yellow-500/50"
              placeholder="自定义"
            />
            <button
              onClick={() => {
                if (raiseAmount && raiseAmount > 0) {
                  onBet("raise", raiseAmount);
                  setShowRaiseInput(false);
                  setRaiseAmount(null);
                }
              }}
              className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 font-bold text-white hover:from-red-400 hover:to-red-500 transition-all active:scale-95"
            >
              确认
            </button>
            <button
              onClick={() => setShowRaiseInput(false)}
              className="rounded-lg bg-emerald-700/60 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-600/60 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      ) : showComparePicker ? (
        <div className="flex flex-wrap justify-center gap-2">
          <span className="text-sm text-emerald-200 w-full text-center">选择比牌目标：</span>
          {compareTargets.map((targetId) => (
            <button
              key={targetId}
              onClick={() => {
                onCompare(targetId);
                setShowComparePicker(false);
              }}
              className="rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-400"
            >
              {playerNames[targetId] || `Player ${targetId}`}
            </button>
          ))}
          <button
            onClick={() => setShowComparePicker(false)}
            className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {!seen && (
            <button
              onClick={onLookCards}
              className="rounded bg-blue-500 px-4 py-2 sm:px-6 sm:py-3 font-bold text-white hover:bg-blue-400 min-h-[44px]"
            >
              看牌
            </button>
          )}
          {seen ? (
            <>
              <button
                onClick={() => onBet("call")}
                className="rounded bg-emerald-500 px-4 py-2 sm:px-6 sm:py-3 font-bold text-white hover:bg-emerald-400 min-h-[44px]"
              >
                跟注
              </button>
              <button
                onClick={() => setShowRaiseInput(true)}
                className="rounded bg-yellow-500 px-4 py-2 sm:px-6 sm:py-3 font-bold text-emerald-900 hover:bg-yellow-400 min-h-[44px]"
              >
                加注
              </button>
              <button
                onClick={() => setShowComparePicker(true)}
                className="rounded bg-orange-500 px-4 py-2 sm:px-6 sm:py-3 font-bold text-white hover:bg-orange-400 min-h-[44px]"
              >
                比牌
              </button>
            </>
          ) : (
            <button
              onClick={() => onBet("blind_bet")}
              className="rounded bg-emerald-500 px-4 py-2 sm:px-6 sm:py-3 font-bold text-white hover:bg-emerald-400 min-h-[44px]"
            >
              闷牌
            </button>
          )}
          <button
            onClick={() => onBet("fold")}
            className="rounded bg-red-600 px-4 py-2 sm:px-6 sm:py-3 font-bold text-white hover:bg-red-500 min-h-[44px]"
          >
            弃牌
          </button>
          {canShowdown && (
            <button
              onClick={onShowdown}
              className="rounded bg-purple-500 px-4 py-2 sm:px-6 sm:py-3 font-bold text-white hover:bg-purple-400 min-h-[44px]"
            >
              开牌
            </button>
          )}
        </div>
      )}
    </div>
  );
}
