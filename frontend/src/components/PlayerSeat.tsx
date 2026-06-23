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
}

export default function PlayerSeat({
  player,
  cards,
  isCurrentTurn,
  isMe,
  showCards,
  size = "micro",
  style,
  onCompare,
}: PlayerSeatProps) {
  const isEliminated = player && !player.is_active;
  const isEmpty = !player;

  if (isEmpty) {
    return (
      <div
        style={style}
        className="absolute flex flex-col items-center gap-1 opacity-30"
      >
        <div className="h-10 w-10 rounded-full bg-emerald-700/50 border-2 border-dashed border-emerald-600 flex items-center justify-center">
          <span className="text-emerald-500 text-sm">?</span>
        </div>
        <div className="text-[10px] text-emerald-600">等待中</div>
      </div>
    );
  }

  const avatarChar = (player.nickname || player.username).charAt(0).toUpperCase();

  return (
    <div
      style={style}
      className={`absolute flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
        isCurrentTurn
          ? "ring-2 ring-yellow-400 animate-pulse bg-emerald-700/80"
          : isMe
            ? "ring-1 ring-emerald-400 bg-emerald-800/50"
            : "bg-emerald-800/30"
      } ${isEliminated ? "opacity-40" : ""}`}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-1.5">
        <div
          className={`flex items-center justify-center rounded-full text-xs font-bold ${
            isMe
              ? "h-7 w-7 bg-yellow-500 text-emerald-900"
              : "h-6 w-6 bg-emerald-600 text-white"
          }`}
        >
          {avatarChar}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            {player.is_bot && (
              <span className="text-[9px] text-blue-300">AI</span>
            )}
            <span className="text-xs font-medium text-white truncate max-w-16 leading-tight">
              {player.nickname || player.username}
            </span>
            {!player.connected && (
              <span className="text-[9px] text-red-400">离线</span>
            )}
          </div>
          <div className="text-[10px] text-yellow-400 leading-tight">
            {player.chips}
          </div>
        </div>
      </div>

      {/* Cards or status */}
      {isMe && size === "normal" ? (
        /* My cards — shown large at bottom */
        <div className="flex gap-1.5 mt-1">
          {player.hand_count > 0 ? (
            cards ? (
              cards.map((card, i) => (
                <CardView key={i} card={card} faceDown={!showCards} small />
              ))
            ) : (
              <>
                <CardView faceDown small />
                <CardView faceDown small />
                <CardView faceDown small />
              </>
            )
          ) : (
            <span className="text-xs text-red-300">已弃牌</span>
          )}
        </div>
      ) : (
        /* Other players — micro cards or status */
        <div className="flex gap-0.5">
          {player.hand_count > 0 ? (
            cards ? (
              cards.map((card, i) => (
                <CardView key={i} card={card} faceDown={!showCards} micro />
              ))
            ) : (
              <>
                <CardView faceDown micro />
                <CardView faceDown micro />
                <CardView faceDown micro />
              </>
            )
          ) : (
            <span className="text-[9px] text-red-300">已弃牌</span>
          )}
        </div>
      )}

      {/* Compare button (opponents when it's my turn) */}
      {!isMe && onCompare && player.is_active && size !== "normal" && (
        <button
          onClick={(e) => { e.stopPropagation(); onCompare(player.user_id); }}
          className="mt-0.5 rounded bg-yellow-600 px-1.5 py-0.5 text-[9px] text-white hover:bg-yellow-500"
        >
          比牌
        </button>
      )}
    </div>
  );
}
