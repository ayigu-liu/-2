import { useState, useEffect, useMemo, useRef } from "react";
import CardView from "./CardView";
import PlayerSeat from "./PlayerSeat";
import PotDisplay from "./PotDisplay";
import ChipFly from "./ChipFly";
import ActionBar from "./ActionBar";
import TimerBar from "./TimerBar";
import type { GameRoomState, GameRoomActions } from "../hooks/useGameRoom";
import type { ActionLog } from "../hooks/useGameState";

const SEAT_POSITIONS: Record<number, Array<{ top: string; left: string }>> = {
  2: [
    { top: "85%", left: "50%" },   // 0: me (bottom-center)
    { top: "10%", left: "50%" },   // 1: opponent (top-center)
  ],
  3: [
    { top: "85%", left: "50%" },   // 0: me
    { top: "12%", left: "20%" },   // 1: top-left
    { top: "12%", left: "80%" },   // 2: top-right
  ],
  4: [
    { top: "85%", left: "50%" },   // 0: me
    { top: "30%", left: "8%" },    // 1: left
    { top: "8%",  left: "50%" },   // 2: top-center
    { top: "30%", left: "92%" },   // 3: right
  ],
  5: [
    { top: "85%", left: "50%" },   // 0: me
    { top: "55%", left: "8%" },    // 1: bottom-left
    { top: "15%", left: "15%" },   // 2: top-left
    { top: "15%", left: "85%" },   // 3: top-right
    { top: "55%", left: "92%" },   // 4: bottom-right
  ],
  6: [
    { top: "85%", left: "50%" },   // 0: me (bottom-center)
    { top: "58%", left: "8%" },    // 1: bottom-left
    { top: "30%", left: "12%" },   // 2: mid-left
    { top: "8%",  left: "35%" },   // 3: top-left-of-center
    { top: "8%",  left: "65%" },   // 4: top-right-of-center
    { top: "30%", left: "88%" },   // 5: mid-right
  ],
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
  onPlayAgain?: () => void;
}

interface BetFlyEvent {
  id: number;
  playerId: number;
  amount: number;
  fromTop: string;
  fromLeft: string;
}

export default function TableDesktop({ room, actions, myUserId, onPlayAgain }: TableDesktopProps) {
  const [showSettle, setShowSettle] = useState(false);

  const [betFlies, setBetFlies] = useState<BetFlyEvent[]>([]);
  const flyIdRef = useRef(0);
  useEffect(() => {
    if (room.roundResult) {
      setShowSettle(true);
      const timer = setTimeout(() => setShowSettle(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowSettle(false);
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

  useEffect(() => {
    if (room.lastAction?.amount && room.lastAction.amount > 0) {
      const playerSeat = seatedPlayers.find(
        s => s.player?.user_id === room.lastAction!.player_id
      );
      if (playerSeat) {
        const id = ++flyIdRef.current;
        setBetFlies(prev => [...prev, {
          id,
          playerId: room.lastAction!.player_id,
          amount: room.lastAction!.amount,
          fromTop: playerSeat.pos.top,
          fromLeft: playerSeat.pos.left,
        }]);
      }
    }
  }, [room.lastAction, seatedPlayers]);

  const isReadyPhase = !room.phase && !room.gameOver;
  const isPlaying = room.phase || room.gameOver;
  const isEliminated = myPlayer && !myPlayer.is_active;

  return (
    <div className="hidden md:flex flex-1 flex-col">
      {room.gameOver ? (
        /* ── Game over celebration ── */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="glass-strong rounded-3xl p-10 text-center max-w-lg animate-entrance border border-yellow-500/20">
            <div className="text-6xl mb-4">{room.gameOver.winner_id === myUserId ? "🏆" : "💫"}</div>
            <h2 className={`text-3xl font-black mb-2 ${room.gameOver.winner_id === myUserId ? "text-yellow-400" : "text-emerald-200"}`}>
              {room.gameOver.winner_id === myUserId ? "大赢家！" : "游戏结束"}
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
            <button
              onClick={onPlayAgain}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-8 py-3 text-lg font-bold text-white hover:from-emerald-400 hover:to-emerald-300 active:scale-95 transition-all"
            >
              再来一局
            </button>
          </div>
        </div>
      ) : (
        /* ── Normal game layout (justify-between for top/bottom items) ── */
        <div className="flex-1 flex flex-col justify-between">
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
              <div className="relative w-[45%] aspect-[16/9] max-h-[55%] animate-table-glow">
                {/* 1. 外层围边（桌边凸起边缘） */}
                <div className="absolute -inset-[3%] rounded-[50%] bg-gradient-to-b from-amber-800 via-amber-700 to-yellow-900 shadow-2xl shadow-black/60" />

                {/* 2. 内层围边装饰 */}
                <div className="absolute -inset-[0.5%] rounded-[50%] bg-gradient-to-b from-amber-600/40 to-transparent" />

                {/* 3. 桌面毡布（felt）—— 主面 */}
                <div className="absolute inset-[1.5%] rounded-[50%] bg-gradient-to-br from-emerald-800 via-emerald-900 to-green-950 overflow-hidden">
                  {/* felt 纹理：径向光晕 */}
                  <div className="absolute inset-[5%] rounded-[50%] bg-[radial-gradient(ellipse_at_40%_30%,rgba(5,150,105,0.3)_0%,transparent_70%)]" />
                  <div className="absolute inset-[15%] rounded-[50%] bg-[radial-gradient(ellipse_at_60%_70%,rgba(5,150,105,0.15)_0%,transparent_60%)]" />

                  {/* felt 上的装饰线条（赌桌菱形/弧线） */}
                  <div className="absolute inset-[10%] rounded-[50%] border border-yellow-600/10" />
                  <div className="absolute inset-[18%] rounded-[50%] border border-yellow-600/5" />

                  {/* 中心装饰 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] h-[12%] rounded-full bg-yellow-500/5 border border-yellow-500/10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl opacity-[0.04] select-none">🀄</div>
                </div>

                {/* 4. 桌面阴影内缘 */}
                <div className="absolute inset-[1.5%] rounded-[50%] shadow-inner shadow-black/40 pointer-events-none" />

                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    <div className="flex flex-col items-center gap-2 relative z-10">
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
              const playerLastBet = room.playerBets[player?.user_id ?? -1] ?? 0;

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
                  lastBet={playerLastBet}
                />
              );
            })}

            {/* Chip fly animations */}
            {betFlies.map(fly => (
              <ChipFly
                key={fly.id}
                id={fly.id}
                fromTop={fly.fromTop}
                fromLeft={fly.fromLeft}
                amount={fly.amount}
                onComplete={(id) => setBetFlies(prev => prev.filter(f => f.id !== id))}
              />
            ))}

            {isReadyPhase && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="glass-strong rounded-2xl p-6 max-w-md w-[80%] pointer-events-auto">
                  <div className="text-center mb-4">
                    <div className="text-sm text-emerald-300/70">等待玩家加入</div>
                    <div className="text-lg font-bold text-emerald-100">{room.players.length} / {totalSeats}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {room.players.map((p) => (
                      <div key={p.user_id} className={`rounded-xl p-3 text-center transition-all ${p.ready ? "bg-emerald-600/30 border border-emerald-400/30" : "bg-white/5 border border-white/10"}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${p.ready ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white" : "bg-white/10 text-white/50"}`}>
                          {(p.nickname || p.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="text-[10px] font-medium truncate">{p.nickname || p.username}</div>
                        <div className="text-[8px] mt-0.5">{p.ready ? "✅ 已准备" : "⏳ 未准备"}</div>
                      </div>
                    ))}
                  </div>
                  {myPlayer && (
                    <div className="text-center">
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {showSettle && room.roundResult && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative glass-strong rounded-3xl px-12 py-10 text-center shadow-2xl border border-yellow-500/20 animate-entrance max-w-sm">
                  {/* 装饰顶部 */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-[10px] font-bold text-emerald-900 uppercase tracking-widest">
                    本局结果
                  </div>

                  {/* 赢家头像/名称 */}
                  <div className="mt-3 mb-4">
                    <div className="w-14 h-14 rounded-full mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xl shadow-lg shadow-yellow-500/30">
                      🏆
                    </div>
                    <div className="text-sm text-emerald-300/60 mb-1">赢家</div>
                    <div className="text-xl font-black text-yellow-400">
                      {playerNames[room.roundResult.winner_id] || `#${room.roundResult.winner_id}`}
                    </div>
                  </div>

                  {/* 分隔线 */}
                  <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent mb-4" />

                  {/* 详情 */}
                  <div className="flex justify-center gap-6 text-sm mb-2">
                    <div className="text-center">
                      <div className="text-[10px] text-emerald-400/60">牌型</div>
                      <div className="font-bold text-emerald-200">{room.roundResult.hand_type}</div>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <div className="text-[10px] text-emerald-400/60">赢得</div>
                      <div className="font-black text-yellow-400 text-lg">+{room.roundResult.pot}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {room.phase === "showdown" && room.showdownPlayers.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative glass-strong rounded-3xl p-6 text-center shadow-2xl border border-yellow-500/20 animate-entrance min-w-[280px]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-[10px] font-bold text-emerald-900 uppercase tracking-widest">
                    摊牌
                  </div>
                  <div className="mt-3 space-y-3">
                    {room.showdownPlayers.map((sp, idx) => (
                      <div key={sp.id} className="flex items-center gap-4 bg-white/[0.03] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-emerald-900" : "bg-white/10 text-white/70"
                          }`}>
                            {(playerNames[sp.id] || `#${sp.id}`).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate">{playerNames[sp.id] || `#${sp.id}`}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {sp.cards.map((c, i) => (
                            <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.08}s` }}>
                              <CardView card={c} micro />
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded">{sp.hand_type}</span>
                      </div>
                    ))}
                  </div>
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

          {isPlaying && myPlayer?.hand_count ? (
            <div className="shrink-0 flex justify-center items-end gap-2 pb-2">
              <div className="relative flex justify-center gap-2 bg-gradient-to-t from-black/20 to-transparent rounded-t-2xl px-6 pt-2 pb-1">
                {room.seen
                  ? room.myCards.map((card, i) => (
                      <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.1}s`, transform: `rotate(${i === 0 ? "-3deg" : i === 2 ? "3deg" : "0deg"})` }}>
                        <CardView card={card} />
                      </div>
                    ))
                  : room.myCards.map((_, i) => (
                      <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.1}s`, transform: `rotate(${i === 0 ? "-3deg" : i === 2 ? "3deg" : "0deg"})` }}>
                        <CardView faceDown />
                      </div>
                    ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
