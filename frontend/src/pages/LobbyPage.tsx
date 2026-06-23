import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRooms, createRoom, getStoredUser, logout } from "../api/client";
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
  const [error, setError] = useState("");

  async function loadRooms() {
    try {
      const list = await listRooms(search || undefined);
      setRooms(list);
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
      });
      setShowCreate(false);
      navigate(`/table/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }

  function handleJoin(roomId: string) {
    navigate(`/table/${roomId}`);
  }

  function handleLogout() {
    logout();
  }

  return (
    <div className="min-h-screen bg-emerald-900 text-white">
      <header className="flex items-center justify-between border-b border-emerald-700 bg-emerald-800 px-4 py-3">
        <h1 className="text-xl font-bold">炸金花</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-emerald-200">
            {user?.nickname || user?.username} | 筹码: {user?.chips ?? 0}
          </span>
          <button
            onClick={handleLogout}
            className="rounded bg-emerald-700 px-3 py-1 text-sm hover:bg-emerald-600"
          >
            退出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <input
            type="text"
            placeholder="搜索房间..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-emerald-600 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-400 focus:outline-none"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-yellow-500 px-4 py-2 font-semibold text-emerald-900 hover:bg-yellow-400"
          >
            创建房间
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-lg bg-emerald-800 p-8 text-center text-emerald-300">
            {search ? "没有匹配的房间" : "暂无可用房间，创建一个吧！"}
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleJoin(room.id)}
                className="flex cursor-pointer items-center justify-between rounded-lg bg-emerald-800 p-4 transition hover:bg-emerald-700"
              >
                <div>
                  <h3 className="font-semibold">{room.name}</h3>
                  <p className="text-sm text-emerald-300">
                    {room.player_count}/{room.max_players} 人 | 底注 {room.ante}{" "}
                    | {room.allow_bot ? "可补AI" : "仅真人"} | #{room.id}
                  </p>
                </div>
                <span className="rounded bg-emerald-600 px-3 py-1 text-sm">
                  加入
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create room modal */}
      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-emerald-800 p-6">
            <h2 className="mb-4 text-lg font-bold">创建房间</h2>
            {error && (
              <div className="mb-3 rounded bg-red-700 p-2 text-sm">{error}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm">房间名</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded border border-emerald-600 bg-emerald-700 px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm">最大人数 (2-6)</label>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={createPlayers}
                  onChange={(e) => setCreatePlayers(Number(e.target.value))}
                  className="w-full rounded border border-emerald-600 bg-emerald-700 px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm">底注</label>
                <input
                  type="number"
                  min={1}
                  value={createAnte}
                  onChange={(e) => setCreateAnte(Number(e.target.value))}
                  className="w-full rounded border border-emerald-600 bg-emerald-700 px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createBot}
                  onChange={(e) => setCreateBot(e.target.checked)}
                  className="rounded"
                />
                允许 AI 机器人
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded bg-emerald-600 py-2 hover:bg-emerald-500"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 rounded bg-yellow-500 py-2 font-semibold text-emerald-900 hover:bg-yellow-400"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
