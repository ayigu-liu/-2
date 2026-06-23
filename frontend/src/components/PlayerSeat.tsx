import type { PlayerInfo, Card } from "../types";
import CardView from "./CardView";

interface PlayerSeatProps {
  player: PlayerInfo;
  cards?: Card[];
  isCurrentTurn: boolean;
  isMe: boolean;
  showCards: boolean;
  position: "top" | "bottom" | "left" | "right" | "top-left" | "top-right";
}

export default function PlayerSeat({
  player,
  cards,
  isCurrentTurn,
  isMe,
  showCards,
  position,
}: PlayerSeatProps) {
  const positionStyles: Record<string, string> = {
    top: "justify-center",
    bottom: "justify-center",
    left: "items-center",
    right: "items-center",
    "top-left": "justify-start",
    "top-right": "justify-end",
  };

  const isHorizontal = position === "left" || position === "right";

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
        isCurrentTurn ? "ring-2 ring-yellow-400 bg-emerald-700" : "bg-emerald-800/50"
      } ${isMe ? "ring-1 ring-emerald-400" : ""} ${
        player.is_active ? "" : "opacity-50"
      }`}
    >
      {/* Player name and chips */}
      <div className="text-center">
        <div className="flex items-center gap-1">
          {player.is_bot && (
            <span className="text-xs text-blue-300">AI</span>
          )}
          <span className="text-xs sm:text-sm font-medium text-white truncate max-w-20">
            {player.nickname || player.username}
          </span>
          {!player.connected && (
            <span className="text-xs text-red-400">离线</span>
          )}
        </div>
        <div className="text-xs text-yellow-400">
          {player.chips} <span className="text-yellow-500">筹码</span>
        </div>
      </div>

      {/* Cards */}
      {cards && (
        <div
          className={`flex gap-1 ${
            isHorizontal ? "flex-col" : "flex-row"
          }`}
        >
          {player.hand_count > 0 ? (
            <>
              {cards ? (
                cards.map((card, i) => (
                  <CardView
                    key={i}
                    card={card}
                    faceDown={!showCards}
                    small={true}
                  />
                ))
              ) : (
                <>
                  <CardView faceDown={true} small={true} />
                  <CardView faceDown={true} small={true} />
                  <CardView faceDown={true} small={true} />
                </>
              )}
            </>
          ) : (
            <span className="text-xs text-red-300">已弃牌</span>
          )}
        </div>
      )}
    </div>
  );
}
