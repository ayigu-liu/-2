import { useNavigate } from "react-router-dom";

const handRanks = [
  { name: "豹子", aliases: "三条 / 炸弹", desc: "三张相同点数的牌，最大的牌型", odds: "0.24%", example: ["♠A", "♥A", "♦A"], color: "from-red-500 to-orange-500" },
  { name: "同花顺", aliases: "顺金", desc: "同一花色的顺子，第二大的牌型", odds: "0.22%", example: ["♠3", "♠4", "♠5"], color: "from-yellow-500 to-amber-500" },
  { name: "金花", aliases: "同花", desc: "同一花色但不是顺子", odds: "5.18%", example: ["♠2", "♠7", "♠K"], color: "from-emerald-500 to-green-500" },
  { name: "顺子", aliases: "顺金", desc: "不同花色但点数连续", odds: "3.26%", example: ["♠5", "♥6", "♦7"], color: "from-blue-500 to-cyan-500" },
  { name: "对子", aliases: "一对", desc: "两张相同点数的牌", odds: "16.94%", example: ["♠J", "♥J", "♦3"], color: "from-purple-500 to-violet-500" },
  { name: "散牌", aliases: "单张 / 高牌", desc: "没有任何特殊组合", odds: "74.17%", example: ["♠3", "♥8", "♦K"], color: "from-gray-400 to-gray-500" },
];

const actions = [
  { name: "闷牌", desc: "不查看自己的牌直接下注（盲注），通常所下筹码较少" },
  { name: "看牌", desc: "查看自己的三张牌，之后跟注金额翻倍（闷牌的双倍）" },
  { name: "跟注", desc: "投入与当前注额相同的筹码，继续游戏" },
  { name: "加注", desc: "投入比当前注额更多的筹码，增加底池金额" },
  { name: "比牌", desc: "选择一名对手进行比牌，输家出局（仅剩余2名活跃玩家时可用）" },
  { name: "弃牌", desc: "放弃本局，已下注筹码不退回" },
  { name: "全下", desc: "押上所有剩余筹码" },
];

export default function TutorialPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white">
      {/* Header */}
      <header className="glass-strong mx-3 mt-3 rounded-2xl px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-emerald-300/70 hover:text-white transition-colors">← 返回</button>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 text-sm shadow-lg shadow-yellow-600/30">🀄</div>
          <span className="text-base font-bold tracking-wider bg-gradient-to-r from-yellow-200 to-yellow-400 text-transparent bg-clip-text">玩法教程</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        {/* ── Intro ── */}
        <section className="glass-strong rounded-2xl p-6 md:p-8 text-center">
          <div className="text-3xl mb-3">🃏</div>
          <h1 className="text-2xl md:text-3xl font-black mb-3 bg-gradient-to-r from-yellow-200 to-yellow-400 text-transparent bg-clip-text">炸金花玩法指南</h1>
          <p className="text-sm text-emerald-300/70 leading-relaxed max-w-lg mx-auto">
            炸金花（又名"扎金花"、"三张牌"）是中国最流行的扑克游戏之一。每名玩家获得三张牌，通过比牌型大小决定胜负。
          </p>
        </section>

        {/* ── 牌型大小 ── */}
        <section>
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <span className="text-yellow-400">📊</span> 牌型大小（从高到低）
          </h2>
          <div className="grid gap-3">
            {handRanks.map((rank) => (
              <div key={rank.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-4 hover:bg-white/[0.06] transition-all">
                <div className={`w-1.5 h-12 rounded-full bg-gradient-to-b ${rank.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-emerald-100">{rank.name}</span>
                    <span className="text-[10px] text-emerald-500">{rank.aliases}</span>
                  </div>
                  <p className="text-xs text-emerald-300/60">{rank.desc}</p>
                  <p className="text-[10px] text-emerald-500/50 mt-0.5">出现概率 {rank.odds}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {rank.example.map((card, i) => (
                    <div key={i} className="w-7 h-10 rounded bg-white/10 flex items-center justify-center text-[9px] font-bold"
                      style={{ color: card.includes("♥") || card.includes("♦") ? "#ef4444" : "#e5e7eb" }}>
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── A23 / QKA 特殊规则 ── */}
        <section className="glass-strong rounded-2xl p-6">
          <h3 className="font-bold mb-2">📌 特殊规则</h3>
          <ul className="space-y-2 text-sm text-emerald-200/80">
            <li className="flex gap-2"><span className="text-yellow-400">•</span> <span><strong>A23</strong> 是顺子中最小的（A-2-3），<strong>QKA</strong> 是顺子中最大的（Q-K-A）</span></li>
            <li className="flex gap-2"><span className="text-yellow-400">•</span> <span><strong>对子</strong> 大小先比点数，点数相同则比散牌大小</span></li>
            <li className="flex gap-2"><span className="text-yellow-400">•</span> <span><strong>豹子 &gt; 同花顺 &gt; 金花 &gt; 顺子 &gt; 对子 &gt; 散牌</strong></span></li>
            <li className="flex gap-2"><span className="text-yellow-400">•</span> <span>牌型相同时，先比点数从大到小，再比花色（♠ &gt; ♥ &gt; ♣ &gt; ♦）</span></li>
          </ul>
        </section>

        {/* ── 游戏流程 ── */}
        <section>
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <span className="text-yellow-400">🎮</span> 游戏流程
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { step: "1", title: "发牌", desc: "每位玩家获得 3 张暗牌（背面朝上）" },
              { step: "2", title: "下注回合", desc: "轮流操作：可闷牌、看牌、跟注、加注、比牌或弃牌" },
              { step: "3", title: "摊牌决胜", desc: "最后回合结束或只剩一人时摊牌，比较牌型决定赢家" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 text-center hover:bg-white/[0.06] transition-all">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-sm font-black text-emerald-900 mx-auto mb-3">{step}</div>
                <h3 className="font-bold text-emerald-100 mb-1">{title}</h3>
                <p className="text-xs text-emerald-300/60">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 操作说明 ── */}
        <section>
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <span className="text-yellow-400">🎯</span> 操作说明
          </h2>
          <div className="grid md:grid-cols-2 gap-2">
            {actions.map((a) => (
              <div key={a.name} className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 flex items-start gap-3 hover:bg-white/[0.06] transition-all">
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-sm text-emerald-100">{a.name}</span>
                  <p className="text-xs text-emerald-300/60 mt-0.5">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 术语 ── */}
        <section className="glass-strong rounded-2xl p-6">
          <h3 className="font-bold mb-3">📖 常用术语</h3>
          <dl className="space-y-2 text-sm">
            {[
              ["底注", "每局开始时每位玩家必须投入的初始筹码"],
              ["底池", "当前所有投入筹码的总和"],
              ["闷牌", "不查看牌面直接下注，下注额较低"],
              ["看牌", "查看自己的牌，之后跟注额翻倍"],
              ["比牌", "选择对手比大小，输家出局"],
              ["全下", "押上所有剩余筹码（All-in）"],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-2">
                <dt className="font-bold text-yellow-300 shrink-0 w-14">{term}</dt>
                <dd className="text-emerald-300/70">{def}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 策略小贴士 ── */}
        <section className="rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className="text-yellow-400">💡</span> 小贴士
          </h3>
          <ul className="space-y-2 text-sm text-emerald-200/80">
            <li className="flex gap-2"><span className="text-yellow-400">•</span> 拿到 <strong>对子以上的好牌</strong> 再选择看牌，散牌闷到底诈唬也是一种策略</li>
            <li className="flex gap-2"><span className="text-yellow-400">•</span> <strong>比牌要谨慎</strong> — 选择你认为牌比你小的对手</li>
            <li className="flex gap-2"><span className="text-yellow-400">•</span> 适当 <strong>诈唬</strong>（弱势假装强势）可以让对手弃掉好牌</li>
            <li className="flex gap-2"><span className="text-yellow-400">•</span> 注意对手的 <strong>下注模式</strong> — 激进还是保守？</li>
          </ul>
        </section>

        {/* ── Go play ── */}
        <div className="text-center pb-6">
          <button
            onClick={() => navigate("/lobby")}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-10 py-3.5 text-base font-bold text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 shadow-lg shadow-yellow-600/25 active:scale-95 transition-all"
          >
            开始游戏 🎯
          </button>
        </div>
      </main>
    </div>
  );
}
