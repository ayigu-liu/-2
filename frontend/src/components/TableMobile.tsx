import { useMemo, useState, useEffect, useRef } from "react";
import CardView from "./CardView";
import PlayerSeat from "./PlayerSeat";
import PotDisplay from "./PotDisplay";
import ActionBar from "./ActionBar";
import TimerBar from "./TimerBar";
import ChipStack from "./ChipStack";
import ChipFly from "./ChipFly";
import type { GameRoomState, GameRoomActions } from "../hooks/useGameRoom";

interface BetFlyEvent {
  id: number;
  playerId: number;
  amount: number;
}

interface TableMobileProps {
  room: GameRoomState;
  actions: GameRoomActions;
  myUserId: number;
  onPlayAgain?: () => void;
}

export default function TableMobile({ room, actions, myUserId, onPlayAgain }: TableMobileProps) {
  const isMyTurn = room.currentTurn === myUserId;
  const myPlayer = room.players.find((p) => p.user_id === myUserId);
  const playerNames: Record<number, string> = useMemo(() => {
    const m: Record<number, string> = {};
    room.players.forEach((p) => { m[p.user_id] = p.nickname || p.username; });
    return m;
  }, [room.players]);
  const activeOthers = room.players.filter((p) => p.user_id !== myUserId && p.is_active);
  const allActiveIds = room.players.filter((p) => p.is_active).map((p) => p.user_id);
  const isReadyPhase = !room.phase && !room.gameOver;
  const isPlaying = room.phase || room.gameOver;
  const [betFlies, setBetFlies] = useState<BetFlyEvent[]>([]);
  const flyIdRef = useRef(0);

  /* ── ChipFly animation ── */
  useEffect(() => {
    if (room.lastAction?.amount && room.lastAction.amount > 0) {
      const id = ++flyIdRef.current;
      setBetFlies(prev => [...prev, {
        id,
        playerId: room.lastAction!.player_id,
        amount: room.lastAction!.amount,
      }]);
    }
  }, [room.lastAction]);

  return (
    <div className="md:hidden flex-1 flex flex-col">
      {room.gameOver ? (
        /* ── Game over ── */
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass-strong rounded-2xl p-8 text-center max-w-sm animate-entrance border border-yellow-500/20">
            <div className="text-5xl mb-3">{room.gameOver.winner_id === myUserId ? "🏆" : "💫"}</div>
            <h2 className={`text-2xl font-black mb-1 ${room.gameOver.winner_id === myUserId ? "text-yellow-400" : "text-emerald-200"}`}>
              {room.gameOver.winner_id === myUserId ? "大赢家！" : "游戏结束"}
            </h2>
            <div className="text-xs text-emerald-300/70 mb-4">
              共 {room.gameOver.rounds} 局 · 总底池 {room.gameOver.total_pot}
            </div>
            <div className="flex flex-col gap-1.5 mb-5">
              {Object.entries(room.gameOver.final_chips).map(([id, chips]) => (
                <div key={id} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-white/5">
                  <span className="text-xs text-emerald-200">{playerNames[Number(id)] || `#${id}`}</span>
                  <span className={`text-xs font-bold ${Number(id) === room.gameOver.winner_id ? "text-yellow-400" : "text-emerald-300"}`}>
                    {chips} 筹码
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={onPlayAgain}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-300 active:scale-95 transition-all"
            >
              再来一局
            </button>
          </div>
        </div>
      ) : isReadyPhase ? (
        /* ── Ready phase ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4">
          <div className="glass-strong rounded-2xl p-6 text-center w-full max-w-sm">
            <h2 className="text-lg font-bold mb-1">等待开始</h2>
            <p className="text-xs text-emerald-300/70 mb-4">{room.players.length} 位玩家已加入</p>
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {room.players.map((p) => (
                <div key={p.user_id} className={`rounded-lg px-3 py-2 text-center text-xs ${p.ready ? "bg-emerald-600/50 border border-emerald-400/30" : "bg-white/5 border border-white/10"}`}>
                  <div className="font-medium">{p.nickname || p.username}{p.is_bot && " (AI)"}</div>
                  <div className="text-[10px] text-emerald-300/60 mt-0.5">{p.ready ? "✅ 已准备" : "⏳ 未准备"}</div>
                </div>
              ))}
            </div>
            {myPlayer && (
              <button
                onClick={actions.ready}
                disabled={myPlayer.ready}
                className={`w-full rounded-xl py-3 text-base font-bold transition-all duration-200 ${
                  myPlayer.ready
                    ? "bg-emerald-700/50 text-emerald-400 cursor-default"
                    : "bg-gradient-to-r from-yellow-500 to-yellow-400 text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 shadow-lg shadow-yellow-600/25 active:scale-95"
                }`}
              >
                {myPlayer.ready ? "已准备" : "准备开始"}
              </button>
            )}
          </div>
        </div>
      ) : !isPlaying ? null : (
        /* ── Playing ── */
        <>

          {/* ChipFly animations */}
          {betFlies.map(fly => (
            <ChipFly
              key={fly.id}
              id={fly.id}
              fromTop="30%"
              fromLeft="50%"
              amount={fly.amount}
              onComplete={(id) => setBetFlies(prev => prev.filter(f => f.id !== id))}
            />
          ))}
          {/* Opponents */}
          <div className="flex justify-center gap-2 p-2 overflow-x-auto">
            {activeOthers.slice(0, 5).map((p) => (
              <PlayerSeat
                key={p.user_id}
                player={p}
                isCurrentTurn={room.currentTurn === p.user_id}
                isMe={false}
                showCards={false}
                size="micro"
                style={{ position: "static" }}
                lastBet={room.playerBets[p.user_id]}
              />
            ))}
          </div>

          {/* Table center — pot + timer */}
          <div className="flex flex-col items-center py-2">
            <div className="relative">
              {/* Mini table glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-emerald-800/60 to-emerald-900/60 blur-sm -z-10" />
              <div className="rounded-full bg-gradient-to-b from-emerald-800/80 to-emerald-900/80 border border-yellow-600/20 px-5 py-2 shadow-lg">
                <PotDisplay pot={room.pot} currentBet={room.currentBet}
                  currentTurnPlayerName={room.currentTurn ? playerNames[room.currentTurn] : undefined} />
                <div className="flex justify-center mt-1">
                  <TimerBar deadline={room.turnDeadline} isMyTurn={isMyTurn} />
                </div>
              </div>
            </div>
          </div>

          {/* My chips + info */}
          {myPlayer && (
            <div className="flex justify-center items-center gap-3 px-4 py-1">
              <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1">
                <ChipStack amount={myPlayer.chips} size="sm" />
                <span className="text-xs font-bold text-yellow-300">{myPlayer.chips}</span>
              </div>
              {room.phase && room.currentBet > 0 && (
                <div className="text-[10px] text-emerald-300/60">
                  当前注: {room.currentBet}
                </div>
              )}
            </div>
          )}

          {/* My cards */}
          <div className="flex justify-center gap-2 py-1">
            {myPlayer?.hand_count ? (
              room.seen
                ? room.myCards.map((card, i) => (
                    <div key={i} className="animate-deal" style={{ animationDelay: `${i * 0.1}s` }}>
                      <CardView card={card} />
                    </div>
                  ))
                : (
                  <>
                    <div className="animate-deal" style={{ animationDelay: "0s" }}><CardView faceDown /></div>
                    <div className="animate-deal" style={{ animationDelay: "0.1s" }}><CardView faceDown /></div>
                    <div className="animate-deal" style={{ animationDelay: "0.2s" }}><CardView faceDown /></div>
                  </>
                )
            ) : null}
          </div>

          {/* Action bar */}
          <div className="mt-auto">
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
          </div>
        </>
      )}
    </div>
  );
}
