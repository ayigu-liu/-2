import { useState, useEffect, useMemo } from "react";
import CardView from "./CardView";
import PlayerSeat from "./PlayerSeat";
import PotDisplay from "./PotDisplay";
import ActionBar from "./ActionBar";
import TimerBar from "./TimerBar";
import type { GameRoomState, GameRoomActions } from "../hooks/useGameRoom";
import type { ActionLog } from "../hooks/useGameState";

const SEAT_POSITIONS: Record<number, Array<{ top: string; left: string }>> = {
  2: [{ top: "85%", left: "50%" }, { top: "15%", left: "50%" }],
  3: [{ top: "85%", left: "50%" }, { top: "35%", left: "18%" }, { top: "35%", left: "82%" }],
  4: [{ top: "85%", left: "50%" }, { top: "42%", left: "12%" }, { top: "15%", left: "50%" }, { top: "42%", left: "88%" }],
  5: [{ top: "85%", left: "50%" }, { top: "62%", left: "12%" }, { top: "28%", left: "20%" }, { top: "28%", left: "80%" }, { top: "62%", left: "88%" }],
  6: [{ top: "85%", left: "50%" }, { top: "65%", left: "10%" }, { top: "42%", left: "16%" }, { top: "20%", left: "38%" }, { top: "20%", left: "62%" }, { top: "42%", left: "84%" }],
};

const ACTION_LABELS: Record<string, string> = {
  call: "跟注",
  raise: "加注",
  fold: "弃牌",
  blind_bet: "闷牌",
  check: "过牌",
};

interface TableDesktopProps {
  room: GameRoomState;
  actions: GameRoomActions;
  myUserId: number;
}

export default function TableDesktop({ room, actions, myUserId }: TableDesktopProps) {
  const [showSettle, setShowSettle] = useState(false);

  useEffect(() => {
    if (room.roundResult) {
      setShowSettle(true);
      const timer = setTimeout(() => setShowSettle(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [room.roundResult]);

  const isMyTurn = room.currentTurn === myUserId;
  const myPlayer = room.players.find((p) => p.user_id === myUserId);
  const playerNames: Record<number, string> = useMemo(() => {
    const m: Record<number, string> = {};
    room.players.forEach((p) => { m[p.user_id] = p.nickname || p.username; });
    return m;
  }, [room.players]);
  const allActiveIds = useMemo(
    () => room.players.filter((p) => p.is_active).map((p) => p.user_id),
    [room.players]
  );
  const totalSeats = room.players.length || 2;
  const seatPositions = SEAT_POSITIONS[Math.min(Math.max(totalSeats, 2), 6)] || SEAT_POSITIONS[6];

  const seatedPlayers = useMemo(() => seatPositions.map((pos, i) => {
    const player = room.seatedPlayers.find((p) => p.seat_index === i);
    return { pos, player, seatIndex: i };
  }), [seatPositions, room.seatedPlayers]);

  const isReadyPhase = !room.phase && !room.gameOver;
  const isPlaying = room.phase || room.gameOver;
  const isEliminated = myPlayer && !myPlayer.is_active;

  // Game over celebration
  if (room.gameOver) {
    const isWinner = room.gameOver.winner_id === myUserId;
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8">
        <div className="glass-strong rounded-3xl p-10 text-center max-w-lg animate-entrance border border-yellow-500/20">
          <div className="text-6xl mb-4">{isWinner ? "🏆" : "💫"}</div>
          <h2 className={`text-3xl font-black mb-2 ${isWinner ? "text-yellow-400" : "text-emerald-200"}`}>
            {isWinner ? "大赢家！" : "游戏结束"}
          </h2>
          <div className="text-sm text-emerald-300/70 mb-6">
            共 {room.gameOver.rounds} 局 · 总底池 {room.gameOver.total_pot}
          </div>
          <div className="flex flex-col gap-2 mb-6">
            {Object.entries(room.gameOver.final_chips).map(([id, chips]) => (
              <div key={id} className="flex justify-between items-center px-4 py-2 rounded-xl bg-white/5">
                <span className="text-sm text-emerald-200">{playerNames[Number(id)] || `#${id}`}</span>
                <span className={`text-sm font-bold ${Number(id) === room.gameOver.winner_id ? "text-yellow-400" : "text-emerald-300"}`}>
                  {chips} 筹码
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-1 flex-col">
      {/* Action history bar */}
      {room.actionHistory.length > 0 && (
        <div className="flex justify-center gap-1.5 px-4 py-1.5 overflow-x-auto">
          <span className="text-[10px] text-emerald-500 leading-6 shrink-0">历史:</span>
          {room.actionHistory.slice(-10).map((log: ActionLog, i: number) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-emerald-300/70 whitespace-nowrap"
            >
              {playerNames[log.player_id]?.slice(0, 4) || `#${log.player_id}`}
              {ACTION_LABELS[log.action] || log.action}
              {log.amount ? ` ${log.amount}` : ""}
            </span>
          ))}
        </div>
      )}

      {/* Spectator message */}
      {isEliminated && (
        <div className="flex justify-center py-1">
          <span className="text-[11px] text-yellow-400/60 bg-yellow-400/5 px-3 py-0.5 rounded-full">
            你已出局，正在观战
          </span>
        </div>
      )}

      {/* Table area */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[65%] aspect-[16/9] animate-table-glow">
            <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-emerald-800 via-emerald-900 to-green-900 border-2 border-yellow-600/40 shadow-xl shadow-black/40" />
            <div className="absolute inset-[8%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,_rgba(5,150,105,0.25)_0%,_transparent_70%)]" />
            <div className="absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-yellow-600/10 to-transparent" />

            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <div className="flex flex-col items-center gap-2">
                  <PotDisplay pot={room.pot} currentBet={room.currentBet}
                    currentTurnPlayerName={room.currentTurn ? playerNames[room.currentTurn] : undefined} />
                  <TimerBar deadline={room.turnDeadline} isMyTurn={isMyTurn} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seats */}
        {seatedPlayers.map(({ pos, player, seatIndex }) => {
          const isMe = seatIndex === 0;
          const isMySeat = player && player.user_id === myUserId;
          const showCards = isMe && (room.phase !== null) && room.seen;
          const myCards = isMySeat ? room.myCards : undefined;

          return (
            <PlayerSeat
              key={seatIndex}
              player={player || undefined}
              cards={myCards}
              isCurrentTurn={player ? room.currentTurn === player.user_id : false}
              isMe={isMe}
              showCards={showCards}
              size={isMe ? "normal" : "micro"}
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                transform: "translate(-50%, -50%)",
                zIndex: isMe ? 10 : 1,
              }}
              onCompare={isMyTurn ? actions.compare : undefined}
            />
          );
        })}

        {/* Ready phase button */}
        {isReadyPhase && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
            <div className="text-sm text-emerald-300/70">{room.players.length} 位玩家已加入</div>
            {myPlayer && (
              <button
                onClick={actions.ready}
                disabled={myPlayer.ready}
                className={`rounded-xl px-8 py-3 text-lg font-bold transition-all duration-200 ${
                  myPlayer.ready
                    ? "bg-emerald-700/50 text-emerald-400 cursor-default"
                    : "bg-gradient-to-r from-yellow-500 to-yellow-400 text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 shadow-lg shadow-yellow-600/25 active:scale-95"
                }`}
              >
                {myPlayer.ready ? "已准备" : "准备开始"}
              </button>
            )}
          </div>
        )}

        {/* Settle overlay */}
        {showSettle && room.roundResult && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative glass-strong rounded-2xl px-10 py-8 text-center shadow-2xl border border-yellow-500/20 animate-entrance">
              <div className="text-xs text-yellow-400/60 uppercase tracking-widest mb-1">本局结果</div>
              <div className="text-2xl text-yellow-400 font-black mb-1">
                赢家: {playerNames[room.roundResult.winner_id] || `#${room.roundResult.winner_id}`}
              </div>
              <div className="text-sm text-emerald-300/70">牌型: {room.roundResult.hand_type}</div>
              <div className="text-3xl font-black text-yellow-400 mt-3">+{room.roundResult.pot}</div>
            </div>
          </div>
        )}

        {/* Showdown overlay */}
        {room.phase === "showdown" && room.showdownPlayers.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative glass-strong rounded-2xl p-6 text-center shadow-2xl border border-yellow-500/20 animate-entrance">
              <div className="text-xs text-yellow-400/60 uppercase tracking-widest mb-3">摊牌</div>
              {room.showdownPlayers.map((sp) => (
                <div key={sp.id} className="flex items-center gap-3 text-sm text-emerald-200 mb-2 last:mb-0">
                  <span className="font-medium min-w-20 truncate text-left">{playerNames[sp.id] || `#${sp.id}`}</span>
                  <div className="flex gap-0.5">
                    {sp.cards.map((c, i) => (
                      <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.08}s` }}>
                        <CardView card={c} micro />
                      </div>
                    ))}
                  </div>
                  <span className="text-yellow-300 text-xs font-bold">{sp.hand_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="shrink-0 px-4 pb-3 pt-1">
        {isPlaying && (
          <ActionBar
            isMyTurn={isMyTurn}
            seen={room.seen}
            canShowdown={allActiveIds.length === 2 && (room.phase === "betting")}
            activePlayers={allActiveIds}
            pot={room.pot}
            currentBet={room.currentBet}
            onLookCards={actions.lookCards}
            onBet={actions.bet}
            onCompare={actions.compare}
            onShowdown={actions.showdown}
            playerNames={playerNames}
          />
        )}
      </div>

      {/* My large cards */}
      {isPlaying && myPlayer?.hand_count ? (
        <div className="shrink-0 flex justify-center gap-2 pb-1">
          {room.seen
            ? room.myCards.map((card, i) => (
                <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CardView card={card} />
                </div>
              ))
            : room.myCards.map((_, i) => (
                <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CardView faceDown />
                </div>
              ))}
        </div>
      ) : null}
    </div>
  );
}
