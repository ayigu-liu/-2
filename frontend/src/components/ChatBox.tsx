import { useState, useRef, useEffect } from "react";

interface S2CChatMessage {
  user_id: number;
  username: string;
  content: string;
}

interface ChatBoxProps {
  messages: S2CChatMessage[];
  onSend: (content: string) => void;
  myUserId: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatBox({ messages, onSend, myUserId, isOpen, onToggle }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <button onClick={onToggle} className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full glass-strong flex items-center justify-center text-sm hover:bg-white/20 transition-all shadow-lg">
        {isOpen ? "✕" : "💬"}
      </button>
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-40 w-72 h-80 glass-strong rounded-2xl border border-white/10 flex flex-col shadow-2xl animate-entrance">
          <div className="text-[10px] text-emerald-300/50 uppercase tracking-wider px-4 pt-3 pb-1 border-b border-white/5">
            聊天
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {messages.length === 0 ? (
              <div className="text-xs text-emerald-400/40 text-center pt-6">暂无消息</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`text-xs ${m.user_id === myUserId ? "text-right" : "text-left"}`}>
                  <span className={`text-[9px] ${m.user_id === myUserId ? "text-amber-400/60" : "text-emerald-400/60"}`}>
                    {m.user_id === myUserId ? "我" : m.username}
                  </span>
                  <div className={`inline-block mt-0.5 rounded-xl px-2.5 py-1.5 max-w-[80%] break-words ${m.user_id === myUserId ? "bg-amber-500/20 text-amber-100" : "bg-white/10 text-emerald-100"}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-1.5 p-2 border-t border-white/5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  onSend(input.trim());
                  setInput("");
                }
              }}
              placeholder="发送消息..."
              maxLength={200}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-amber-500/30"
            />
            <button
              onClick={() => {
                if (input.trim()) {
                  onSend(input.trim());
                  setInput("");
                }
              }}
              className="rounded-lg bg-amber-500/30 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/50 transition-all"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </>
  );
}
