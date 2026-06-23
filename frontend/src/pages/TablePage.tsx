import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getStoredUser } from "../api/client";
import { useGameRoom } from "../hooks/useGameRoom";
import LoadingSpinner from "../components/LoadingSpinner";
import TableDesktop from "../components/TableDesktop";
import TableMobile from "../components/TableMobile";
import ChatBox from "../components/ChatBox";

export default function TablePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const password = searchParams.get("password") || undefined;
  const user = getStoredUser();

  const {
    state: room,
    connectionStatus,
    error: connError,
    actions,
    dispatch,
  } = useGameRoom(roomId ?? "", user?.id ?? 0, password);
  const [isChatOpen, setChatOpen] = useState(false);

  const myPlayer = room.players.find((p) => p.user_id === user?.id);

  function handleLeave() {
    actions.leave();
    navigate("/lobby");
  }

  function handlePlayAgain() {
    dispatch({ type: "RESET" });
    actions.ready();
  }

  if (!roomId) {
    return <div className="min-h-screen bg-emerald-900 p-4 text-white">缺少房间ID</div>;
  }

  // Loading / connecting state
  if (connectionStatus !== "connected") {
    const message = connectionStatus === "connecting"
      ? "正在连接..."
      : "连接断开";
    return <LoadingSpinner message={message} />;
  }

  // Connection error with reconnect option
  if (connError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-3xl">🔌</div>
          <p className="text-sm text-emerald-300/70">{connError}</p>
          <button
            onClick={actions.reconnect}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-2 text-sm font-bold text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 transition-all active:scale-95"
          >
            重新连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white flex flex-col overflow-hidden">
      {/* Animated bg overlay */}
      <div className="absolute inset-0 animate-gradient bg-[radial-gradient(ellipse_at_top,rgba(5,150,105,0.08),transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 glass rounded-2xl mx-3 mt-3 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={handleLeave} className="text-sm text-emerald-300/70 hover:text-white transition-colors">← 返回</button>
          <span className="font-bold text-emerald-100">{room.roomName || roomId}</span>
          <span className="text-xs text-emerald-500">#{roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${connectionStatus === "connected" ? "bg-green-400 shadow-sm shadow-green-400/50" : "bg-red-400"}`} />
          <span className="text-sm text-emerald-300/80">
            <span className="text-yellow-400 font-bold">{myPlayer?.chips ?? 0}</span> 筹码
          </span>
        </div>
      </header>

      {/* Game area */}
      <main className="relative z-10 flex-1 flex flex-col">
        <TableDesktop
          room={room}
          actions={actions}
          myUserId={user?.id ?? 0}
          onPlayAgain={handlePlayAgain}
        />
        <TableMobile
          room={room}
          actions={actions}
          myUserId={user?.id ?? 0}
          onPlayAgain={handlePlayAgain}
        />
      </main>

      <ChatBox
        messages={room.chatMessages}
        onSend={actions.sendChat}
        myUserId={user?.id ?? 0}
        isOpen={isChatOpen}
        onToggle={() => setChatOpen((o) => !o)}
      />
    </div>
  );
}
