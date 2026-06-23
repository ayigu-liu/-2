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

function GlassButton({
  onClick,
  color,
  label,
  glow,
}: {
  onClick: () => void;
  color: "emerald" | "amber" | "red" | "blue" | "purple" | "orange" | "yellow";
  label: string;
  glow?: boolean;
}) {
  const colorMap: Record<string, { border: string; bg: string; text: string; hover: string; shadow: string }> = {
    emerald: { border: "border-emerald-400/40", bg: "bg-emerald-500/20", text: "text-emerald-200", hover: "hover:bg-emerald-500/35 hover:border-emerald-400/70", shadow: "shadow-emerald-500/10" },
    amber: { border: "border-amber-400/40", bg: "bg-amber-500/20", text: "text-amber-200", hover: "hover:bg-amber-500/35 hover:border-amber-400/70", shadow: "shadow-amber-500/10" },
    red: { border: "border-red-400/40", bg: "bg-red-500/20", text: "text-red-200", hover: "hover:bg-red-500/35 hover:border-red-400/70", shadow: "shadow-red-500/10" },
    blue: { border: "border-blue-400/40", bg: "bg-blue-500/20", text: "text-blue-200", hover: "hover:bg-blue-500/35 hover:border-blue-400/70", shadow: "shadow-blue-500/10" },
    purple: { border: "border-purple-400/40", bg: "bg-purple-500/20", text: "text-purple-200", hover: "hover:bg-purple-500/35 hover:border-purple-400/70", shadow: "shadow-purple-500/10" },
    orange: { border: "border-orange-400/40", bg: "bg-orange-500/20", text: "text-orange-200", hover: "hover:bg-orange-500/35 hover:border-orange-400/70", shadow: "shadow-orange-500/10" },
    yellow: { border: "border-yellow-400/40", bg: "bg-yellow-500/20", text: "text-yellow-200", hover: "hover:bg-yellow-500/35 hover:border-yellow-400/70", shadow: "shadow-yellow-500/10" },
  };
  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border ${c.border} ${c.bg} px-5 py-2.5 font-bold ${c.text} ${c.hover} transition-all duration-150 active:scale-95 min-h-[44px] backdrop-blur-sm shadow-lg ${c.shadow}${glow ? " animate-glow" : ""}`}
    >
      <span className="relative z-10">{label}</span>
    </button>
  );
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
  const [confirmAction, setConfirmAction] = useState<{type: string; callback: () => void} | null>(null);

  if (!isMyTurn) {
    return (
      <div className="glass rounded-xl px-6 py-4 flex items-center justify-center gap-2 w-full">
        <span className="text-sm text-emerald-300/70">等待其他玩家操作</span>
        <span className="flex gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse"
            style={{ animationDelay: "600ms" }}
          />
        </span>
      </div>
    );
  }

  const compareTargets = activePlayers.filter(
    (id) => id !== undefined && id !== null
  );

  return (
    <div className="flex flex-col items-center gap-3 py-3">
          {confirmAction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="glass-strong rounded-2xl p-6 text-center max-w-xs border border-white/10 animate-entrance">
                <div className="text-sm text-emerald-200/80 mb-4">
                  {confirmAction.type === "fold" ? "确定弃牌？" :
                   confirmAction.type === "compare" ? "确定比牌？（需支付当前注额）" :
                   "确定摊牌？"}
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      confirmAction.callback();
                      setConfirmAction(null);
                    }}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-2.5 font-bold text-white hover:from-emerald-400 hover:to-emerald-300 transition-all active:scale-95"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-xl bg-white/5 border border-white/10 px-6 py-2.5 font-bold text-emerald-200 hover:bg-white/10 transition-all active:scale-95"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
      {showRaiseInput ? (
        /* ── Raise amount panel ── */
        <div className="glass-strong rounded-2xl p-5 w-full max-w-md border border-yellow-500/20 animate-entrance">
          <div className="text-xs text-yellow-400/60 uppercase tracking-widest mb-3 text-center">
            加注金额
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {[
              { label: "2x", getAmount: () => Math.max(1, currentBet * 2) },
              { label: "5x", getAmount: () => Math.max(1, currentBet * 5) },
              { label: "10x", getAmount: () => Math.max(1, currentBet * 10) },
              { label: "半池", getAmount: () => Math.max(1, Math.floor(pot / 2)) },
              { label: "底池", getAmount: () => Math.max(1, pot) },
              { label: "全下", getAmount: () => 999999 },
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                onClick={() => {
                  onBet("raise", shortcut.getAmount());
                  setShowRaiseInput(false);
                  setRaiseAmount(null);
                }}
                className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 transition-all duration-150 active:scale-95"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 justify-center">
            <input
              type="number"
              min={1}
              value={raiseAmount ?? ""}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="w-28 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white text-center text-sm placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
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
              disabled={!raiseAmount || raiseAmount <= 0}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 font-bold text-white hover:from-amber-400 hover:to-yellow-400 transition-all duration-150 active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认
            </button>
            <button
              onClick={() => setShowRaiseInput(false)}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-emerald-200 hover:bg-white/10 transition-all duration-150 active:scale-95"
            >
              取消
            </button>
          </div>
        </div>
      ) : showComparePicker ? (
        /* ── Compare picker ── */
        <div className="glass-strong rounded-2xl p-5 w-full max-w-sm border border-orange-500/20 animate-entrance">
          <div className="text-xs text-orange-400/60 uppercase tracking-widest mb-3 text-center">
            选择比牌目标
          </div>
          <div className="grid grid-cols-2 gap-2">
            {compareTargets.map((targetId) => (
              <button
                key={targetId}
                onClick={() => {
                  onCompare(targetId);
                  setShowComparePicker(false);
                }}
                className="flex items-center gap-2 rounded-xl bg-orange-500/15 border border-orange-400/30 px-4 py-3 font-semibold text-orange-200 hover:bg-orange-500/30 hover:border-orange-400/60 transition-all duration-150 active:scale-95"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(playerNames[targetId] || `#${targetId}`).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm truncate">
                  {playerNames[targetId] || `Player ${targetId}`}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowComparePicker(false)}
            className="w-full mt-3 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-emerald-200 hover:bg-white/10 transition-all duration-150 active:scale-95"
          >
            取消
          </button>
        </div>
      ) : (
        /* ── Main action buttons (left & right) ── */
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-end gap-4 px-2">
            {/* Left side: betting actions */}
            <div className="flex flex-wrap gap-2">
              {!seen && (
                <GlassButton onClick={onLookCards} color="blue" label="看牌" />
              )}

              {seen ? (
                <>
                  <GlassButton onClick={() => onBet("call")} color="emerald" label="跟注" />
                  <GlassButton onClick={() => setShowRaiseInput(true)} color="amber" label="加注" />
                </>
              ) : (
                <GlassButton onClick={() => onBet("blind_bet")} color="purple" label="闷牌" glow />
              )}
            </div>

            {/* Right side: game flow actions */}
            <div className="flex flex-wrap gap-2">
              {seen && (
                <GlassButton onClick={() => setConfirmAction({type:"compare", callback:() => setShowComparePicker(true)})} color="orange" label="比牌" />
              )}

              <div className="w-px self-stretch bg-white/5 mx-1 shrink-0" />

              <GlassButton onClick={() => setConfirmAction({type:"fold", callback:() => onBet("fold")})} color="red" label="弃牌" />

              {canShowdown && (
                <GlassButton onClick={() => setConfirmAction({type:"showdown", callback:onShowdown})} color="yellow" label="摊牌" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
