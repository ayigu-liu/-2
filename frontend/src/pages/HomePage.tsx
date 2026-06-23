import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../api/client";
import ChipStack from "../components/ChipStack";

const floatingCards = [
  { suit: "♠", label: "A", color: "text-gray-900", delay: "0s", top: "18%", left: "8%", rotate: "-15deg", floatDelay: "0s" },
  { suit: "♥", label: "K", color: "text-red-600", delay: "0.3s", top: "55%", left: "5%", rotate: "20deg", floatDelay: "0.6s" },
  { suit: "♦", label: "Q", color: "text-red-600", delay: "0.6s", top: "12%", left: "78%", rotate: "25deg", floatDelay: "1.2s" },
  { suit: "♣", label: "J", color: "text-gray-900", delay: "0.9s", top: "60%", left: "88%", rotate: "-10deg", floatDelay: "1.8s" },
  { suit: "♥", label: "10", color: "text-red-600", delay: "1.2s", top: "30%", left: "92%", rotate: "8deg", floatDelay: "0.3s" },
  { suit: "♠", label: "9", color: "text-gray-900", delay: "1.5s", top: "45%", left: "2%", rotate: "-20deg", floatDelay: "0.9s" },
];

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 12}s`,
  size: Math.random() > 0.5 ? 5 : 3,
  duration: `${10 + Math.random() * 8}s`,
}));

const features = [
  { icon: "🃏", title: "经典玩法", desc: "正宗炸金花规则，豹子同花顺，原汁原味" },
  { icon: "👥", title: "好友开房", desc: "创建私人房间，邀请好友同台竞技" },
  { icon: "⚡", title: "毫秒匹配", desc: "智能匹配系统，秒开局零等待" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleStart() {
    navigate(user ? "/lobby" : "/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white flex flex-col relative overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 animate-gradient bg-[radial-gradient(ellipse_at_top,rgba(5,150,105,0.15),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(20,83,45,0.2),transparent_50%)] pointer-events-none" />

      {/* Gold particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: "100%",
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
          }}
        />
      ))}

      {/* Glass nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 mx-4 mt-4 rounded-2xl glass-strong">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 text-lg shadow-lg shadow-yellow-600/30">
            🀄
          </div>
          <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-yellow-200 to-yellow-400 text-transparent bg-clip-text">
            炸金花
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/tutorial")} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-emerald-300/60 hover:bg-white/5 hover:text-emerald-200 transition-all duration-200">
            📖 教程
          </button>
          <div className="flex items-center gap-3 pl-2 border-l border-white/10">
            {user ? (
              <>
                <ChipStack amount={user.chips} size="sm" />
                <span className="text-sm text-emerald-200">{user.nickname || user.username}</span>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-xl border border-white/15 px-5 py-2 text-sm text-emerald-100/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  登录
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-5 py-2 text-sm font-bold text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 shadow-lg shadow-yellow-600/25 active:scale-95 transition-all duration-200"
                >
                  注册
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {/* Floating decorative cards */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floatingCards.map((card, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: card.top,
                left: card.left,
                transform: `rotate(${card.rotate})`,
                animation: `card-float 4s ease-in-out ${card.floatDelay} infinite`,
              }}
            >
              <div
                className={`flex flex-col items-center justify-center rounded-xl bg-white/95 border border-gray-200/50 shadow-2xl ${card.color} h-20 w-14 sm:h-24 sm:w-16 font-bold transform-gpu`}
                style={{
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                <span className="text-xl sm:text-2xl leading-none">{card.suit}</span>
                <span className="text-base sm:text-lg leading-tight">{card.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hero content */}
        <div className="flex flex-col items-center gap-5 text-center max-w-2xl">
          {/* Icon */}
          <div className="animate-entrance animate-entrance-delay-1 flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 text-3xl shadow-xl shadow-yellow-600/10">
            🀄
          </div>

          {/* Title */}
          <h1 className="animate-entrance animate-entrance-delay-2 text-6xl sm:text-8xl font-black tracking-[0.15em] bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300 text-transparent bg-clip-text drop-shadow-lg leading-none">
            炸金花
          </h1>

          {/* Subtitle */}
          <p className="animate-entrance animate-entrance-delay-3 text-lg sm:text-xl text-emerald-200/80 tracking-widest font-light">
            经典三张扑克 · 在线对战
          </p>

          {/* CTA */}
          <button
            onClick={handleStart}
            className="animate-entrance animate-entrance-delay-4 mt-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-400 px-12 py-4 text-xl font-bold text-emerald-900 shadow-2xl animate-glow hover:scale-105 active:scale-95 transition-all duration-200"
          >
            开始游戏
          </button>

          {/* Tagline */}
          <p className="animate-entrance animate-entrance-delay-5 text-sm text-emerald-300/60 tracking-wider mt-2">
            注册即送 10,000 筹码 · 邀请好友开房对战
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 w-full max-w-2xl px-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-5 text-center hover:bg-white/[0.08] hover:border-yellow-500/30 transition-all duration-300 cursor-default group"
              style={{
                animation: `fade-in-up 0.6s ease-out ${0.7 + i * 0.15}s forwards`,
                opacity: 0,
              }}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
              <div className="text-sm font-bold text-white/90 mb-1">{f.title}</div>
              <div className="text-xs text-emerald-300/60 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-emerald-700/60 border-t border-white/5">
        © 2026 炸金花 · 虚拟娱乐
      </footer>
    </div>
  );
}
