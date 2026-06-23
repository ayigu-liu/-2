import type { PlayerInfo, Card } from "../types";
import CardView from "./CardView";

interface PlayerSeatProps {
  player?: PlayerInfo;
  cards?: Card[];
  isCurrentTurn: boolean;
  isMe: boolean;
  showCards: boolean;
  size?: "normal" | "small" | "micro";
  style?: React.CSSProperties;
  onCompare?: (targetId: number) => void;
  lastBet?: number;
}

/** Shared glass-background classes for an occupied seat */
const GLASS_BG = "bg-black/30 backdrop-blur-sm border border-white/10";
const GLASS_STRONG =
  "bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md";
const TURN_GLOW = "ring-2 ring-yellow-400/70 shadow-lg shadow-yellow-500/25";
const ME_GLOW = "ring-1 ring-emerald-400/60";

export default function PlayerSeat({
  player,
  cards,
  isCurrentTurn,
  isMe,
  showCards,
  size = "micro",
  style,
  onCompare,
  lastBet,
}: PlayerSeatProps) {
  const isEliminated = player && !player.is_active;
  const isEmpty = !player;

  /* ── Empty seat ── */
  if (isEmpty) {
    return (
      <div
        style={style}
        className="absolute flex flex-col items-center gap-1 opacity-30"
      >
        <div className="h-9 w-9 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/30 text-base leading-none font-light">+</span>
        </div>
        {size !== "micro" && (
          <div className="text-[9px] text-white/25 tracking-wide">空闲</div>
        )}
      </div>
    );
  }

  const avatarChar = (player.nickname || player.username).charAt(0).toUpperCase();

  /* ── Micro: dot + name only ── */
  if (size === "micro") {
    return (
      <div
        style={style}
        className={`absolute flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all ${GLASS_BG} ${
          isCurrentTurn ? TURN_GLOW : isMe ? ME_GLOW : ""
        } ${isEliminated ? "opacity-25" : ""}`}
      >
          {/* Bet badge */}
          {lastBet !== undefined && lastBet > 0 && (
            <span className="absolute -top-2 right-0 text-[9px] font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-1.5 py-0.5 leading-none animate-fly-bet z-20">
              +{lastBet}
            </span>
          )}
        {/* Dot indicator for active */}
        <div className="flex items-center gap-1">
          {player.is_active ? (
            <span
              className={`inline-block rounded-full transition-colors ${
                isCurrentTurn
                  ? "h-2 w-2 bg-yellow-400 animate-pulse"
                  : "h-1.5 w-1.5 bg-emerald-400"
              }`}
            />
          ) : (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400/60" />
          )}
          <span
            className={`text-xs font-medium leading-tight truncate max-w-14 ${
              isEliminated ? "text-white/30" : "text-white/80"
            } ${isCurrentTurn ? "text-yellow-300" : ""}`}
          >
            {player.nickname || player.username}
          </span>
        </div>

        {/* Folded / Eliminated status */}
        {!player.is_active && player.hand_count === 0 && (
          <span className="text-[8px] text-red-400/70 leading-none -mt-0.5">
            已弃牌
          </span>
        )}
        {isEliminated && (
          <span className="text-[8px] text-red-400/50 leading-none -mt-0.5">
            已出局
          </span>
        )}
      </div>
    );
  }

  /* ── Normal / Small seat ── */
  const isSmall = size === "small";
  const showStatusBadge =
    !player.is_active || player.hand_count === 0 || isEliminated;
  const isThinking = isCurrentTurn && player.is_active;

  return (
    <div
      style={style}
      className={`absolute flex flex-col items-center gap-1 ${
        isSmall ? "px-1.5 py-1" : "px-2 py-1.5"
      } rounded-xl transition-all duration-300 ${GLASS_STRONG} ${
        isCurrentTurn
          ? TURN_GLOW
          : isMe
            ? ME_GLOW
            : "border border-white/[0.06]"
      } ${isEliminated ? "opacity-30" : ""}`}
    >
          {/* Bet badge */}
          {lastBet !== undefined && lastBet > 0 && (
            <span className="absolute -top-1 -right-1 text-[9px] font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-1.5 py-0.5 leading-none animate-fly-bet z-20">
              +{lastBet}
            </span>
          )}
      {/* Ghost overlay for eliminated */}
      {isEliminated && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10 pointer-events-none">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white/20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      )}

      {/* Avatar + name row */}
      <div className="flex items-center gap-1.5 relative z-[1]">
        <div
          className={`flex items-center justify-center rounded-full font-bold shadow-lg ${
            isSmall ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
          } ${
            isMe
              ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-emerald-900 shadow-yellow-500/40"
              : player.is_bot
                ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/30"
                : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/30"
          }`}
        >
          {avatarChar}
        </div>

        <div className="flex flex-col min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-1">
            {player.is_bot && (
              <span className="text-[8px] font-semibold text-blue-300/90 bg-blue-500/15 rounded px-1 py-[1px] leading-none">
                AI
              </span>
            )}
            <span
              className={`font-medium truncate max-w-16 leading-tight ${
                isSmall ? "text-[11px]" : "text-xs"
              } ${isEliminated ? "text-white/40" : "text-white/90"}`}
            >
              {player.nickname || player.username}
            </span>
            {!player.connected && (
              <span className="text-[8px] text-red-400/80 bg-red-500/10 rounded px-1 py-[1px] leading-none">
                离线
              </span>
            )}
          </div>

          {/* Chip count with small chip icon */}
          <div className="flex items-center gap-1">
            <span
              className={`inline-block rounded-full ${
                isSmall ? "h-2 w-2" : "h-2.5 w-2.5"
              } bg-gradient-to-br from-yellow-400 to-amber-500 border border-yellow-300/50`}
            />
            <span
              className={`font-mono font-semibold leading-tight ${
                isSmall ? "text-[9px]" : "text-[10px]"
              } ${isEliminated ? "text-yellow-400/40" : "text-yellow-400"}`}
            >
              {player.chips.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Status badge */}
      {showStatusBadge && (
        <div className="relative z-[1]">
          {isEliminated ? (
            <span className="text-[10px] text-red-400/60 bg-red-500/10 rounded px-1.5 py-[1px]">
              已出局
            </span>
          ) : player.hand_count === 0 ? (
            <span className="text-[10px] text-red-400/70 bg-red-500/10 rounded px-1.5 py-[1px]">
              已弃牌
            </span>
          ) : null}
        </div>
      )}

      {/* Thinking indicator */}
      {isThinking && !isMe && (
        <div className="relative z-[1]">
          <span className="text-[10px] text-emerald-400/80 animate-pulse">
            操作中...
          </span>
        </div>
      )}

      {/* Cards */}
      {isMe && (size === "normal" || size === "small") ? (
        /* My cards — shown larger at bottom */
        <div
          className={`flex gap-1.5 relative z-[1] ${
            player.hand_count > 0 && showCards ? "" : ""
          }`}
        >
          {player.hand_count > 0 ? (
            cards ? (
              cards.map((card, i) => (
                <div
                  key={i}
                  className={
                    showCards
                      ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]"
                      : ""
                  }
                >
                  <CardView
                    card={card}
                    faceDown={!showCards}
                    {...(isSmall ? { micro: true } : { small: true })}
                  />
                </div>
              ))
            ) : (
              <>
                <CardView faceDown {...(isSmall ? { micro: true } : { small: true })} />
                <CardView faceDown {...(isSmall ? { micro: true } : { small: true })} />
                <CardView faceDown {...(isSmall ? { micro: true } : { small: true })} />
              </>
            )
          ) : (
            <span className="text-[10px] text-red-300/80 bg-red-500/10 rounded px-1.5 py-0.5">
              已弃牌
            </span>
          )}
        </div>
      ) : (
        /* Other players — micro cards with subtle rotation */
        <div className="flex gap-0.5 relative z-[1]">
          {player.hand_count > 0 ? (
            cards ? (
              cards.map((card, i) => (
                <div
                  key={i}
                  style={{ transform: `rotate(${i === 0 ? "-4deg" : "4deg"})` }}
                  className={
                    showCards
                      ? "drop-shadow-[0_0_3px_rgba(255,255,255,0.12)]"
                      : ""
                  }
                >
                  <CardView card={card} faceDown={!showCards} micro />
                </div>
              ))
            ) : (
              <>
                <div style={{ transform: "rotate(-4deg)" }}>
                  <CardView faceDown micro />
                </div>
                <div style={{ transform: "rotate(4deg)" }}>
                  <CardView faceDown micro />
                </div>
                <CardView faceDown micro />
              </>
            )
          ) : (
            <span className="text-[8px] text-red-400/70">已弃牌</span>
          )}
        </div>
      )}

      {/* Compare button (opponents when it's my turn) */}
      {!isMe && onCompare && player.is_active && size !== "normal" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare(player.user_id);
          }}
          className="relative z-[1] mt-0.5 rounded-md bg-gradient-to-r from-yellow-500 to-amber-500 px-2 py-[2px] text-[9px] font-bold text-white shadow-lg shadow-yellow-500/30 hover:from-yellow-400 hover:to-amber-400 active:scale-95 transition-all animate-pulse"
        >
          比牌
        </button>
      )}
    </div>
  );
}
