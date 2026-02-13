import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// BARBRAIN — Production Interface Prototypes
// TV Display (landscape) + Mobile Player (portrait)
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  gradient: {
    main: "linear-gradient(145deg, #1a0533 0%, #2d1b69 25%, #5b2a86 50%, #8b3a62 75%, #c44b3f 100%)",
    card: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
    header: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)",
    footer: "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
    correct: "linear-gradient(135deg, #00c9a7 0%, #00d4aa 50%, #45e6c3 100%)",
    wrong: "linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)",
    selected: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
    timer: "conic-gradient(from 0deg, #00d4aa, #45e6c3, #667eea, #764ba2, #c44b3f, #f7971e, #00d4aa)",
  },
  white: "#ffffff",
  whiteA: (a) => `rgba(255,255,255,${a})`,
  blackA: (a) => `rgba(0,0,0,${a})`,
  text: { primary: "#ffffff", secondary: "rgba(255,255,255,0.7)", muted: "rgba(255,255,255,0.4)" },
  accent: { green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea", purple: "#764ba2" },
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideRight { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes countdown { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 283; } }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
    @keyframes bounceIn { 0%{transform:scale(1)} 30%{transform:scale(1.08)} 100%{transform:scale(1)} }
    @keyframes fadeSlideDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(102,126,234,0.3); } 50% { box-shadow: 0 0 35px rgba(102,126,234,0.6); } }
    @keyframes pointsFly { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(0.6); opacity: 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes barGrow { from { width: 0; } }
    @keyframes chatSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 0.8; } }
    @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.9)} }
    @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-30px,40px) scale(0.9)} 66%{transform:translate(30px,-20px) scale(1.1)} }
    
    .answer-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
    .answer-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
    .answer-btn:active { transform: scale(0.97); }
  `}</style>
);

// ─── Floating Orbs Background ───
const OrbBackground = ({ style }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", ...style }}>
    <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)", top: "-5%", right: "10%", animation: "orb1 20s ease-in-out infinite" }} />
    <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,75,63,0.12) 0%, transparent 70%)", bottom: "10%", left: "5%", animation: "orb2 25s ease-in-out infinite" }} />
    <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)", top: "40%", left: "60%", animation: "orb1 18s ease-in-out infinite reverse" }} />
  </div>
);

// ─── Circular Timer ───
const CircularTimer = ({ seconds, total, size = 80, strokeWidth = 4 }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const color = pct > 0.5 ? COLORS.accent.green : pct > 0.2 ? COLORS.accent.gold : COLORS.accent.red;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.whiteA(0.1)} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease", filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: size * 0.3, fontWeight: 700, color, lineHeight: 1, animation: pct < 0.2 ? "pulse 1s ease-in-out infinite" : "none" }}>
          {seconds}
        </span>
        {size > 60 && <span style={{ fontSize: size * 0.12, color: COLORS.text.muted, fontWeight: 500, marginTop: 1 }}>SEC</span>}
      </div>
    </div>
  );
};

// ─── Answer Card ───
const AnswerCard = ({ label, letter, state = "default", onClick, delay = 0, variant = "mobile" }) => {
  const letterLabel = String.fromCharCode(64 + letter);
  const isTv = variant === "tv";

  const bgMap = {
    default: COLORS.white,
    selected: "transparent",
    correct: "transparent",
    wrong: "transparent",
    eliminated: COLORS.whiteA(0.3),
  };
  const gradMap = {
    selected: COLORS.gradient.selected,
    correct: COLORS.gradient.correct,
    wrong: COLORS.gradient.wrong,
  };
  const textColor = {
    default: "#2d1b69",
    selected: "#fff",
    correct: "#fff",
    wrong: "#fff",
    eliminated: COLORS.whiteA(0.35),
  };

  const animMap = {
    correct: "bounceIn 0.4s ease-out",
    wrong: "shake 0.4s ease-out",
    default: `slideUp 0.4s ease-out ${delay * 0.08}s both`,
  };

  return (
    <button
      className="answer-btn"
      onClick={state === "default" ? onClick : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: isTv ? 20 : 14,
        padding: isTv ? "20px 28px" : "16px 20px",
        minHeight: isTv ? 72 : 58,
        background: gradMap[state] || bgMap[state],
        border: state === "eliminated" ? `1px dashed ${COLORS.whiteA(0.2)}` : "none",
        borderRadius: isTv ? 18 : 14,
        cursor: state === "default" ? "pointer" : "default",
        fontFamily: "'Outfit', sans-serif",
        textDecoration: state === "eliminated" ? "line-through" : "none",
        opacity: state === "eliminated" ? 0.5 : 1,
        animation: animMap[state] || animMap.default,
        boxShadow: state === "default" ? "0 4px 15px rgba(0,0,0,0.1)" : state === "selected" ? "0 4px 25px rgba(102,126,234,0.4)" : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Letter badge */}
      <div style={{
        width: isTv ? 42 : 34, height: isTv ? 42 : 34, borderRadius: 10,
        background: state === "default" ? "linear-gradient(135deg, #eef1ff 0%, #e8e0ff 100%)" : COLORS.whiteA(0.2),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: isTv ? 18 : 15,
        color: state === "default" ? "#5b2a86" : "#fff",
        flexShrink: 0,
      }}>
        {state === "correct" ? "✓" : state === "wrong" ? "✗" : letterLabel}
      </div>
      <span style={{
        flex: 1, textAlign: "left",
        fontSize: isTv ? 22 : 16, fontWeight: 600,
        color: textColor[state],
        letterSpacing: -0.2,
      }}>
        {label}
      </span>
      {state === "correct" && (
        <span style={{ fontSize: isTv ? 22 : 18 }}>🎉</span>
      )}
    </button>
  );
};

// ─── Player Avatar ───
const PlayerAvatar = ({ name, score, rank, size = 36, showScore }) => {
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue+40)%360},70%,45%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.42, fontFamily: "'Outfit', sans-serif",
        border: rank === 1 ? "2px solid #ffd200" : `2px solid ${COLORS.whiteA(0.3)}`,
        boxShadow: rank === 1 ? "0 0 12px rgba(255,210,0,0.4)" : "none",
        position: "relative",
      }}>
        {initial}
        {rank && rank <= 3 && (
          <span style={{ position: "absolute", bottom: -4, right: -4, fontSize: size * 0.35 }}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        )}
      </div>
      {showScore && (
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: COLORS.accent.gold, fontWeight: 700 }}>
          {score?.toLocaleString()}
        </span>
      )}
    </div>
  );
};

// ─── Chat Message ───
const ChatMsg = ({ name, msg, delay = 0 }) => {
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, animation: `chatSlide 0.3s ease-out ${delay}s both`, opacity: 0.8, padding: "3px 0" }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: `hsl(${hue},60%,50%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: "#fff", fontWeight: 700,
      }}>{name.charAt(0)}</div>
      <span style={{ fontSize: 12, color: COLORS.whiteA(0.5) }}>
        <strong style={{ color: `hsl(${hue},60%,70%)`, fontWeight: 600 }}>{name}</strong>{" "}{msg}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PHONE SCREEN (Portrait)
// ═══════════════════════════════════════════════════════════════
const PhoneScreen = ({ question, answers, category, qNum, totalQ, timer, totalTime, points, playerCount, answerState }) => (
  <div style={{
    width: 375, height: 812,
    background: COLORS.gradient.main,
    borderRadius: 44, overflow: "hidden",
    position: "relative", fontFamily: "'Outfit', sans-serif",
    boxShadow: "0 25px 80px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(255,255,255,0.1)",
  }}>
    <OrbBackground />

    {/* Status bar */}
    <div style={{ height: 50, padding: "14px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.whiteA(0.5) }}>9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ width: 16, height: 10, borderRadius: 2, border: `1px solid ${COLORS.whiteA(0.4)}`, position: "relative" }}>
          <div style={{ position: "absolute", left: 1, top: 1, bottom: 1, width: "70%", borderRadius: 1, background: COLORS.accent.green }} />
        </div>
      </div>
    </div>

    {/* Header */}
    <div style={{ padding: "8px 24px 0", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>🧠</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>BarBrain</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: COLORS.whiteA(0.1), borderRadius: 20, padding: "5px 12px",
          backdropFilter: "blur(10px)",
        }}>
          <span style={{ fontSize: 14 }}>👥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{playerCount}</span>
        </div>
      </div>

      {/* Points banner */}
      <div style={{
        marginTop: 16, textAlign: "center",
        animation: "fadeSlideDown 0.5s ease-out",
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
          Points Available
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 44, fontWeight: 700,
          background: COLORS.gradient.gold, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 8px rgba(255,210,0,0.3))",
          lineHeight: 1,
        }}>
          {points.toLocaleString()}
        </div>
      </div>
    </div>

    {/* Timer + Question */}
    <div style={{ padding: "20px 24px 0", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <CircularTimer seconds={timer} total={totalTime} size={76} strokeWidth={4} />
      </div>

      {/* Category + Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: COLORS.whiteA(0.1), borderRadius: 20, padding: "4px 12px",
          backdropFilter: "blur(8px)",
        }}>
          <span style={{ fontSize: 14 }}>{category.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.whiteA(0.8), textTransform: "uppercase", letterSpacing: 0.5 }}>{category.name}</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: COLORS.whiteA(0.6) }}>
          {qNum}<span style={{ color: COLORS.whiteA(0.3) }}>/{totalQ}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: COLORS.whiteA(0.1), marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(qNum / totalQ) * 100}%`, borderRadius: 2, background: "linear-gradient(90deg, #667eea, #764ba2)", transition: "width 0.5s ease", animation: "barGrow 0.8s ease-out" }} />
      </div>

      {/* Question */}
      <div style={{
        fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.35,
        textAlign: "center", letterSpacing: -0.3,
        minHeight: 56,
        animation: "fadeSlideDown 0.4s ease-out",
        textShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}>
        {question}
      </div>
    </div>

    {/* Answer Cards */}
    <div style={{ padding: "20px 20px 0", position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 10 }}>
      {answers.map((a, i) => (
        <AnswerCard key={i} label={a} letter={i + 1} state={answerState[i] || "default"} delay={i} variant="mobile" />
      ))}
    </div>

    {/* Chat Feed */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: COLORS.gradient.footer,
      padding: "40px 20px 36px",
      zIndex: 2,
    }}>
      <ChatMsg name="KatieBee" msg="Love this song! 🎵" delay={0} />
      <ChatMsg name="JakeFromBar" msg="easy question 😎" delay={0.1} />
      <ChatMsg name="TriviaNerd99" msg="gotta be Frozen" delay={0.2} />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// TV SCREEN (Landscape)
// ═══════════════════════════════════════════════════════════════
const TVScreen = ({ question, answers, category, qNum, totalQ, timer, totalTime, points, players, answerState, roomCode }) => (
  <div style={{
    width: 960, height: 540,
    background: COLORS.gradient.main,
    borderRadius: 12, overflow: "hidden",
    position: "relative", fontFamily: "'Outfit', sans-serif",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,255,255,0.08)",
  }}>
    <OrbBackground />

    {/* TV Header Bar */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
      background: COLORS.gradient.header,
      padding: "16px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      {/* Left: Logo + Room */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 28 }}>🧠</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>BarBrain</span>
        </div>
        <div style={{
          background: COLORS.whiteA(0.1), borderRadius: 10, padding: "6px 14px",
          backdropFilter: "blur(10px)", border: `1px solid ${COLORS.whiteA(0.1)}`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.whiteA(0.5), letterSpacing: 1, textTransform: "uppercase" }}>JOIN </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: COLORS.accent.gold, letterSpacing: 2 }}>{roomCode}</span>
        </div>
      </div>

      {/* Center: Points */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.accent.gold, letterSpacing: 2, textTransform: "uppercase" }}>PRIZE</div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700,
          background: COLORS.gradient.gold, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          lineHeight: 1, filter: "drop-shadow(0 2px 6px rgba(255,210,0,0.3))",
        }}>
          {points.toLocaleString()}
        </div>
      </div>

      {/* Right: Player count + Timer */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.whiteA(0.1), borderRadius: 20, padding: "6px 14px" }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{players.length}</span>
        </div>
        <CircularTimer seconds={timer} total={totalTime} size={52} strokeWidth={3} />
      </div>
    </div>

    {/* Main Content Area */}
    <div style={{ position: "absolute", top: 80, bottom: 80, left: 0, right: 0, display: "flex", padding: "0 40px", gap: 40, zIndex: 5 }}>

      {/* Left: Question + Category */}
      <div style={{ flex: 1.2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Category + Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: COLORS.whiteA(0.1), borderRadius: 24, padding: "8px 18px",
            backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 20 }}>{category.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.whiteA(0.9), textTransform: "uppercase", letterSpacing: 1 }}>{category.name}</span>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: COLORS.whiteA(0.4) }}>
            Q{qNum}<span style={{ color: COLORS.whiteA(0.2) }}>/{totalQ}</span>
          </div>
        </div>

        {/* Question */}
        <div style={{
          fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.25,
          letterSpacing: -0.5, maxWidth: 560,
          textShadow: "0 3px 20px rgba(0,0,0,0.4)",
          animation: "fadeSlideDown 0.5s ease-out",
        }}>
          {question}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: COLORS.whiteA(0.08), marginTop: 24, maxWidth: 300, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(qNum / totalQ) * 100}%`, borderRadius: 2, background: "linear-gradient(90deg, #667eea, #764ba2)", transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Right: Answer Cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        {answers.map((a, i) => (
          <AnswerCard key={i} label={a} letter={i + 1} state={answerState[i] || "default"} delay={i} variant="tv" />
        ))}
      </div>
    </div>

    {/* Bottom: Leaderboard Strip */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
      background: COLORS.gradient.footer,
      padding: "20px 40px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
        {players.slice(0, 6).map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            animation: `slideRight 0.4s ease-out ${i * 0.08}s both`,
          }}>
            <PlayerAvatar name={p.name} rank={i + 1} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: COLORS.accent.gold }}>{p.score.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);


// ═══════════════════════════════════════════════════════════════
// MAIN APP — Side by Side View
// ═══════════════════════════════════════════════════════════════
export default function BarBrainPrototype() {
  const [timer, setTimer] = useState(32);
  const [activeView, setActiveView] = useState("both");
  const [phoneAnswerState, setPhoneAnswerState] = useState({});
  const [tvAnswerState, setTvAnswerState] = useState({});
  const [demoMode, setDemoMode] = useState("playing");

  useEffect(() => {
    const t = setInterval(() => setTimer(s => s <= 0 ? 45 : s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Demo answer states
  useEffect(() => {
    if (demoMode === "answered_correct") {
      setPhoneAnswerState({ 0: "correct", 2: "eliminated" });
      setTvAnswerState({ 0: "correct", 2: "eliminated" });
    } else if (demoMode === "answered_wrong") {
      setPhoneAnswerState({ 1: "wrong", 0: "correct" });
      setTvAnswerState({ 1: "wrong", 0: "correct" });
    } else if (demoMode === "hints") {
      setPhoneAnswerState({ 2: "eliminated", 3: "eliminated" });
      setTvAnswerState({ 2: "eliminated", 3: "eliminated" });
    } else {
      setPhoneAnswerState({});
      setTvAnswerState({});
    }
  }, [demoMode]);

  const question = '"Let It Go" is the theme song of which Disney movie?';
  const answers = ["Frozen", "Tangled", "Cinderella", "Snow White"];
  const category = { icon: "🎬", name: "Entertainment" };
  const players = [
    { name: "Sarah M", score: 12450 },
    { name: "Jake B", score: 11200 },
    { name: "Mike D", score: 10875 },
    { name: "Chris K", score: 9640 },
    { name: "Lisa P", score: 8920 },
    { name: "Tom W", score: 7350 },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <Styles />

      {/* Controls */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 24px",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🧠</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>BarBrain Interface Prototype</div>
              <div style={{ fontSize: 11, color: COLORS.whiteA(0.4) }}>TV + Mobile • Interactive Preview</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "both", label: "📺 + 📱 Both" },
              { key: "tv", label: "📺 TV Only" },
              { key: "phone", label: "📱 Phone Only" },
            ].map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: activeView === v.key ? "linear-gradient(135deg, #667eea, #764ba2)" : COLORS.whiteA(0.08),
                  color: activeView === v.key ? "#fff" : COLORS.whiteA(0.6),
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "playing", label: "▶ Playing" },
              { key: "hints", label: "💡 Hints" },
              { key: "answered_correct", label: "✅ Correct" },
              { key: "answered_wrong", label: "❌ Wrong" },
            ].map(d => (
              <button key={d.key} onClick={() => setDemoMode(d.key)}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "none",
                  background: demoMode === d.key ? COLORS.whiteA(0.15) : "transparent",
                  color: demoMode === d.key ? "#fff" : COLORS.whiteA(0.4),
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screens */}
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "40px 24px 60px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 48,
        flexWrap: "wrap",
      }}>
        {/* TV */}
        {(activeView === "both" || activeView === "tv") && (
          <div style={{ animation: "popIn 0.5s ease-out" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.whiteA(0.3), textAlign: "center", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" }}>
              📺 Bar TV Display — 16:9
            </div>
            <TVScreen
              question={question} answers={answers} category={category}
              qNum={7} totalQ={15} timer={timer} totalTime={45}
              points={1000} players={players} answerState={tvAnswerState}
              roomCode="BR7X"
            />
          </div>
        )}

        {/* Phone */}
        {(activeView === "both" || activeView === "phone") && (
          <div style={{ animation: "popIn 0.5s ease-out 0.1s both" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.whiteA(0.3), textAlign: "center", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" }}>
              📱 Player Phone — Portrait
            </div>
            <PhoneScreen
              question={question} answers={answers} category={category}
              qNum={7} totalQ={15} timer={timer} totalTime={45}
              points={1000} playerCount={14} answerState={phoneAnswerState}
            />
          </div>
        )}
      </div>

      {/* Spec Notes */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{
          background: COLORS.whiteA(0.03), borderRadius: 16,
          border: `1px solid ${COLORS.whiteA(0.06)}`,
          padding: "28px 32px",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.whiteA(0.6), marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>
            🎨 Design Specs
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {[
              { title: "Typography", body: "Outfit (display/body) + Space Mono (scores/timer). Outfit chosen for geometric warmth — feels modern but approachable in a bar context." },
              { title: "Color System", body: "Deep indigo → warm coral gradient. Gold for points/prizes. Teal for correct. Frosted glass effects via backdrop-filter blur. White answer cards for readability." },
              { title: "Motion", body: "Cards pop in with staggered delays. Correct = bounce scale. Wrong = horizontal shake. Eliminated = fade + slide. Timer pulses red at <20%. Points fly upward." },
              { title: "TV vs Phone", body: "Same visual language, different layout. TV is landscape split (question left, answers right, leaderboard bottom). Phone is stacked portrait with chat feed." },
              { title: "Tap Targets", body: "Min 58px mobile, 72px TV. Generous padding. White cards on gradient = high contrast. Large letter badges for quick scanning." },
              { title: "Accessibility", body: "All answer states use color + icon + animation (never color alone). High contrast text on gradient. Timer has numeric + ring + color indicators." },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent.gold, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: COLORS.whiteA(0.45), lineHeight: 1.5 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
