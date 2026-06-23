import CardView from "./CardView";
import PlayerSeat from "./PlayerSeat";
import PotDisplay from "./PotDisplay";
import ActionBar from "./ActionBar";
import TimerBar from "./TimerBar";
import type { GameRoomState, GameRoomActions } from "../hooks/useGameRoom";

interface TableMobileProps {
  room: GameRoomState;
  actions: GameRoomActions;
  myUserId: number;
}

export default function TableMobile({ room, actions, myUserId }: TableMobileProps) {
  const isMyTurn = room.currentTurn === myUserId;
  const myPlayer = room.players.find((p) => p.user_id === myUserId);
  const playerNames: Record<number, string> = {};
  room.players.forEach((p) => { playerNames[p.user_id] = p.nickname || p.username; });
  const activeOthers = room.players.filter((p) => p.user_id !== myUserId && p.is_active);
  const allActiveIds = room.players.filter((p) => p.is_active).map((p) => p.user_id);

  const isReadyPhase = !room.phase && !room.gameOver;
  const isPlaying = room.phase || room.gameOver;

  if (isReadyPhase) {
    return (
      <div className="md:hidden flex-1 flex flex-col items-center justify-center gap-6">
        <h2 className="text-xl font-bold">等待开始</h2>
        <p className="text-sm text-emerald-300">{room.players.length} 位玩家已加入</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-lg">
          {room.players.map((p) => (
            <div key={p.user_id} className={`rounded-lg px-4 py-2 text-center ${p.ready ? "bg-emerald-600" : "bg-emerald-800"}`}>
              <div className="text-sm font-medium">{p.nickname || p.username}{p.is_bot && " (AI)"}</div>
              <div className="text-xs text-emerald-300">{p.ready ? "已准备" : "未准备"}</div>
            </div>
          ))}
        </div>
        <button onClick={actions.ready} className="rounded-lg bg-yellow-500 px-8 py-3 text-lg font-bold text-emerald-900 hover:bg-yellow-400">准备开始</button>
      </div>
    );
  }

  if (!isPlaying) return null;

  return (
    <div className="md:hidden flex-1 flex flex-col">
      <div className="flex justify-center gap-2 p-2 flex-wrap">
        {activeOthers.slice(0, 5).map((p) => (
          <PlayerSeat
            key={p.user_id}
            player={p}
            isCurrentTurn={room.currentTurn === p.user_id}
            isMe={false}
            showCards={false}
            size="micro"
            style={{ position: "static" }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center py-1">
        <PotDisplay pot={room.pot} currentBet={room.currentBet}
          currentTurnPlayerName={room.currentTurn ? playerNames[room.currentTurn] : undefined} />
        <TimerBar deadline={room.turnDeadline} isMyTurn={isMyTurn} />
      </div>

      <div className="flex justify-center gap-2 py-2">
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
    </div>
  );
}
