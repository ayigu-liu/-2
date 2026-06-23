import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRooms, createRoom, getStoredUser, logout } from "../api/client";
import ChipStack from "../components/ChipStack";
import type { User, RoomBrief } from "../types";

export default function LobbyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [rooms, setRooms] = useState<RoomBrief[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAnte, setCreateAnte] = useState(20);
  const [createPlayers, setCreatePlayers] = useState(6);
  const [createBot, setCreateBot] = useState(true);
  const [createPassword, setCreatePassword] = useState("");
  const [error, setError] = useState("");
  const [matching, setMatching] = useState(false);
  const [joinPasswordRoom, setJoinPasswordRoom] = useState<RoomBrief | null>(null);
  const [joinPassword, setJoinPassword] = useState("");

  async function loadRooms() {
    try {
      const result = await listRooms(search || undefined);
      setRooms(result);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [search]);

  async function handleCreate() {
    if (!createName.trim()) return;
    setError("");
    try {
      const room = await createRoom({
        name: createName.trim(),
        max_players: createPlayers,
        ante: createAnte,
        allow_bot: createBot,
        password: createPassword || undefined,
      });
      setShowCreate(false);
      navigate(`/table/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }

  async function handleQuickMatch() {
    setMatching(true);
    try {
      const available = await listRooms();
      const joinable = available.find((r) => r.player_count < r.max_players);
      if (joinable) {
        navigate(`/table/${joinable.id}`);
        return;
      }
      const room = await createRoom({
        name: "快速匹配",
        max_players: 6,
        ante: 20,
        allow_bot: true,
      });
      navigate(`/table/${room.id}`);
    } catch {
      setMatching(false);
    }
  }

  function handleJoin(room: RoomBrief) {
    if (room.has_password) {
      setJoinPasswordRoom(room);
      setJoinPassword("");
    } else {
      navigate(`/table/${room.id}`);
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white flex flex-col">
      {/* Header */}
      <header className="glass-strong mx-3 mt-3 rounded-2xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 text-lg shadow-lg shadow-yellow-600/30">🀄</div>
          <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-yellow-200 to-yellow-400 text-transparent bg-clip-text">炸金花</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/tutorial")} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-emerald-300/50 hover:bg-white/5 hover:text-emerald-200 transition-all">
            📖 教程
          </button>
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-white/10">
              <ChipStack amount={user.chips} size="sm" />
              <span className="text-sm text-emerald-200">{user.nickname || user.username}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-emerald-300/70 hover:bg-white/5 hover:text-white transition-all"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-6">
        {/* Quick Match */}
        <button
          onClick={handleQuickMatch}
          disabled={matching}
          className="w-full rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-8 py-6 text-center hover:from-yellow-400 hover:to-yellow-300 active:scale-[0.98] transition-all shadow-lg shadow-yellow-600/20 disabled:opacity-60"
        >
          <div className="text-xl font-black text-emerald-900 mb-1">
            {matching ? "🔍 匹配中" : "⚡ 快速匹配"}
          </div>
          <div className="text-sm text-emerald-800/80">
            {matching ? (
              <span className="inline-flex items-center gap-1">
                正在寻找可用房间
                <span className="inline-flex">
                  <span className="animate-bounce" style={{ animationDelay: "0s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                </span>
              </span>
            ) : "随机加入一个可用房间"}
          </div>
        </button>

        {/* Create Room Card */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-center hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <div className="text-lg font-bold text-emerald-100 mb-1">➕ 创建房间</div>
            <div className="text-sm text-emerald-300/60">自定义参数开房</div>
          </button>
        ) : (
          <div className="rounded-2xl border border-yellow-500/20 bg-white/5 p-6">
            <h2 className="text-lg font-bold mb-4">创建房间</h2>
            {error && (
              <div className="mb-3 rounded bg-red-700/50 px-3 py-2 text-sm">{error}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-emerald-300/70 mb-1">房间名</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-emerald-400/50 focus:outline-none focus:border-yellow-500/50"
                  placeholder="我的房间"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-emerald-300/70 mb-1">最大人数</label>
                  <input
                    type="number"
                    min={2}
                    max={6}
                    value={createPlayers}
                    onChange={(e) => setCreatePlayers(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-emerald-300/70 mb-1">底注</label>
                  <input
                    type="number"
                    min={1}
                    value={createAnte}
                    onChange={(e) => setCreateAnte(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-emerald-200">
                <input
                  type="checkbox"
                  checked={createBot}
                  onChange={(e) => setCreateBot(e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                允许 AI 机器人
              </label>
              <div>
                <label className="block text-xs text-emerald-300/70 mb-1">房间密码（可选）</label>
                <input
                  type="text"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-emerald-400/50 focus:outline-none focus:border-yellow-500/50"
                  placeholder="留空则无密码"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-emerald-300/70 hover:bg-white/5 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 py-2 text-sm font-bold text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 transition-all"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room list */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold text-emerald-300/80 uppercase tracking-wider">可用房间</h2>
            <input
              type="text"
              placeholder="搜索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 max-w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-emerald-400/50 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          {rooms.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-emerald-400/50">
              {search ? "没有匹配的房间" : "暂无可用房间，创建一个吧！"}
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleJoin(room)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06] hover:border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-lg">🃏</div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-emerald-100 truncate">{room.name}{room.has_password ? " 🔒" : ""}</h3>
                      <p className="text-xs text-emerald-400/60">
                        {room.player_count}/{room.max_players} 人
                        {room.allow_bot ? " · 可补AI" : ""}
                        {" · "}#{room.id.slice(0, 6)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ChipStack amount={room.ante} size="sm" />
                    <span className="rounded-lg bg-emerald-600/30 px-3 py-1 text-xs font-medium text-emerald-200">
                      加入
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Password prompt dialog */}
      {joinPasswordRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl border border-yellow-500/20 bg-emerald-900 p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">输入密码</h3>
            <p className="text-sm text-emerald-300/70 mb-4">
              加入房间 "{joinPasswordRoom.name}"
            </p>
            {error && (
              <div className="mb-3 rounded bg-red-700/50 px-3 py-2 text-sm">{error}</div>
            )}
            <input
              type="text"
              value={joinPassword}
              onChange={(e) => {
                setJoinPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/table/${joinPasswordRoom.id}?password=${encodeURIComponent(joinPassword)}`);
                  setJoinPasswordRoom(null);
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-emerald-400/50 focus:outline-none focus:border-yellow-500/50 mb-4"
              placeholder="输入密码"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setJoinPasswordRoom(null)}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-emerald-300/70 hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  navigate(`/table/${joinPasswordRoom.id}?password=${encodeURIComponent(joinPassword)}`);
                  setJoinPasswordRoom(null);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 py-2 text-sm font-bold text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 transition-all"
              >
                加入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

