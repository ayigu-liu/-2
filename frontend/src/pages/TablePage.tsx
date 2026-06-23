import { useEffect, useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoredUser } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import { useGameState } from "../hooks/useGameState";
import CardView from "../components/CardView";
import PlayerSeat from "../components/PlayerSeat";
import PotDisplay from "../components/PotDisplay";
import ActionBar from "../components/ActionBar";
import TimerBar from "../components/TimerBar";

export default function TablePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = getStoredUser();
  const { connected, lastMessage, send, connect, disconnect } = useWebSocket();
  const { state, handleMessage } = useGameState(user?.id ?? 0);
  const joinedRef = useRef(false);
  const [showSettle, setShowSettle] = useState(false);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  useEffect(() => {
    if (connected && roomId && !joinedRef.current) {
      send({ type: "join_room", data: { room_id: roomId } });
      joinedRef.current = true;
    }
  }, [connected, roomId, send]);

  useEffect(() => {
    if (lastMessage) handleMessage(lastMessage);
  }, [lastMessage, handleMessage]);

  useEffect(() => {
    if (state.roundResult) {
      setShowSettle(true);
      const timer = setTimeout(() => setShowSettle(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.roundResult]);

  const isMyTurn = state.currentTurn === user?.id;
  const myPlayer = state.players.find((p) => p.user_id === user?.id);
  const seen = state.seen;

  const playerNames: Record<number, string> = {};
  state.players.forEach((p) => { playerNames[p.user_id] = p.nickname || p.username; });

  const activeOthers = state.players.filter((p) => p.user_id !== user?.id && p.is_active);
  const allActiveIds = state.players.filter((p) => p.is_active).map((p) => p.user_id);

  const handleReady = useCallback(() => send({ type: "set_ready", data: {} }), [send]);
  const handleLookCards = useCallback(() => send({ type: "look_cards", data: {} }), [send]);
  const handleBet = useCallback(
    (action: string, amount?: number) => send({ type: "bet", data: { action, ...(amount !== undefined ? { amount } : {}) } }),
    [send]
  );
  const handleCompare = useCallback(
    (targetId: number) => send({ type: "compare", data: { target_player_id: targetId } }),
    [send]
  );
  const handleShowdown = useCallback(() => send({ type: "showdown", data: {} }), [send]);

  function handleLeave() {
    send({ type: "leave_room", data: {} });
    navigate("/lobby");
  }

  if (!roomId) return <div className="min-h-screen bg-emerald-900 p-4 text-white">缺少房间ID</div>;

  return (
    <div className="min-h-screen bg-emerald-900 text-white flex flex-col">
      <header className="flex items-center justify-between bg-emerald-800 px-4 py-2 border-b border-emerald-700">
        <div className="flex items-center gap-2">
          <button onClick={handleLeave} className="text-sm text-emerald-300 hover:text-white">← 返回</button>
          <span className="font-bold">{state.roomName || roomId}</span>
          <span className="text-xs text-emerald-400">#{roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-sm text-emerald-300">{myPlayer?.chips ?? 0} 筹码</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Ready phase */}
        {!state.phase && !state.gameOver && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <h2 className="text-xl font-bold">等待开始</h2>
            <p className="text-sm text-emerald-300">
              {state.players.length} 位玩家已加入
            </p>
            <div className="flex flex-wrap justify-center gap-3 max-w-lg">
              {state.players.map((p) => (
                <div key={p.user_id} className={`rounded-lg px-4 py-2 text-center ${p.ready ? "bg-emerald-600" : "bg-emerald-800"}`}>
                  <div className="text-sm font-medium">{p.nickname || p.username}{p.is_bot && " (AI)"}</div>
                  <div className="text-xs text-emerald-300">{p.ready ? "已准备" : "未准备"}</div>
                </div>
              ))}
            </div>
            <button onClick={handleReady} className="rounded-lg bg-yellow-500 px-8 py-3 text-lg font-bold text-emerald-900 hover:bg-yellow-400">准备开始</button>
          </div>
        )}

        {/* Game playing */}
        {(state.phase || state.gameOver) && (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-center gap-4 p-4 flex-wrap">
              {activeOthers.slice(0, 3).map((p) => (
                <PlayerSeat
                  key={p.user_id}
                  player={p}
                  cards={undefined}
                  isCurrentTurn={state.currentTurn === p.user_id}
                  isMe={false}
                  showCards={false}
                  position="top"
                />
              ))}
            </div>

            <div className="flex flex-col items-center py-2">
              <PotDisplay pot={state.pot} currentBet={state.currentBet}
                currentTurnPlayerName={state.currentTurn ? playerNames[state.currentTurn] : undefined} />
              <TimerBar deadline={state.turnDeadline} isMyTurn={isMyTurn} />
            </div>
            {/* My cards */}
            <div className="flex justify-center gap-2 py-3">
              {state.phase === "betting" && myPlayer?.hand_count ? (
                seen ? (
                  state.myCards.map((card, i) => <CardView key={i} card={card} />)
                ) : (
                  <><CardView faceDown /><CardView faceDown /><CardView faceDown /></>
                )
              ) : null}
            </div>

            <ActionBar
              isMyTurn={isMyTurn}
              seen={seen}
              canShowdown={allActiveIds.length === 2 && (state.phase === "betting")}
              activePlayers={allActiveIds}
              onLookCards={handleLookCards}
              onBet={handleBet}
              onCompare={handleCompare}
              onShowdown={handleShowdown}
              playerNames={playerNames}
            />
          </div>
        )}
      </main>
    </div>
  );
}
