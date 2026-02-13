import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// BARBRAIN DESIGN SYSTEM — Complete Component Library
// Dark mode cocktail-bar aesthetic for live trivia
// React + React Native compatible design tokens & patterns
// ═══════════════════════════════════════════════════════════════

// ─── DESIGN TOKENS ───────────────────────────────────────────
const tokens = {
  colors: {
    bg: {
      primary: "#0D0D0F",
      secondary: "#1A1A2E",
      tertiary: "#16213E",
      overlay: "rgba(13,13,15,0.85)",
    },
    accent: {
      primary: "#E94560",
      primaryGlow: "rgba(233,69,96,0.3)",
      secondary: "#F5A623",
      secondaryGlow: "rgba(245,166,35,0.3)",
      tertiary: "#00D4AA",
      tertiaryGlow: "rgba(0,212,170,0.3)",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#A0A0B0",
      disabled: "#4A4A5A",
      inverse: "#0D0D0F",
    },
    semantic: {
      correct: "#00D4AA",
      wrong: "#E94560",
      eliminated: "#333345",
      points: "#F5A623",
      info: "#5B8DEF",
    },
    timer: {
      plenty: "#00D4AA",
      warning: "#F5A623",
      danger: "#E94560",
    },
    border: {
      subtle: "rgba(255,255,255,0.06)",
      medium: "rgba(255,255,255,0.12)",
      strong: "rgba(255,255,255,0.2)",
    },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    pill: 999,
  },
  typography: {
    display: { fontSize: 48, fontWeight: "800", letterSpacing: -1.5, lineHeight: 1.1 },
    h1: { fontSize: 32, fontWeight: "700", letterSpacing: -0.8, lineHeight: 1.2 },
    h2: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, lineHeight: 1.25 },
    h3: { fontSize: 20, fontWeight: "600", letterSpacing: -0.3, lineHeight: 1.3 },
    body: { fontSize: 16, fontWeight: "400", letterSpacing: 0, lineHeight: 1.5 },
    bodyBold: { fontSize: 16, fontWeight: "600", letterSpacing: 0, lineHeight: 1.5 },
    caption: { fontSize: 13, fontWeight: "500", letterSpacing: 0.3, lineHeight: 1.4 },
    mono: { fontSize: 28, fontWeight: "700", letterSpacing: 1, lineHeight: 1.2, fontFamily: "'JetBrains Mono', 'SF Mono', monospace" },
    monoSm: { fontSize: 18, fontWeight: "600", letterSpacing: 0.5, lineHeight: 1.3, fontFamily: "'JetBrains Mono', 'SF Mono', monospace" },
    monoLg: { fontSize: 42, fontWeight: "800", letterSpacing: 2, lineHeight: 1.1, fontFamily: "'JetBrains Mono', 'SF Mono', monospace" },
  },
  shadows: {
    sm: "0 2px 8px rgba(0,0,0,0.3)",
    md: "0 4px 16px rgba(0,0,0,0.4)",
    lg: "0 8px 32px rgba(0,0,0,0.5)",
    glow: (color) => `0 0 20px ${color}, 0 0 40px ${color}`,
    inner: "inset 0 2px 4px rgba(0,0,0,0.3)",
  },
  animation: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    easeOut: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    easeInOut: "cubic-bezier(0.42, 0, 0.58, 1)",
  },
};

// ─── CSS KEYFRAMES (injected once) ───────────────────────────
const StyleInjector = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; }

    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 8px var(--glow-color); }
      50% { box-shadow: 0 0 20px var(--glow-color), 0 0 40px var(--glow-color); }
    }
    @keyframes shakeX {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-4px); }
      40% { transform: translateX(4px); }
      60% { transform: translateX(-3px); }
      80% { transform: translateX(3px); }
    }
    @keyframes bounceScale {
      0% { transform: scale(1); }
      40% { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pointsFly {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-60px) scale(0.7); opacity: 0; }
    }
    @keyframes timerPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @keyframes eliminateSlide {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(-8px); opacity: 0.4; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes countUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes ripple {
      0% { transform: scale(0); opacity: 0.6; }
      100% { transform: scale(4); opacity: 0; }
    }
    @keyframes progressStripe {
      0% { background-position: 0 0; }
      100% { background-position: 40px 0; }
    }
  `}</style>
);

// ─── PRIMITIVE COMPONENTS ────────────────────────────────────

// Card — the fundamental surface
const Card = ({ children, variant = "secondary", glow, style, ...props }) => {
  const bgMap = { primary: tokens.colors.bg.primary, secondary: tokens.colors.bg.secondary, tertiary: tokens.colors.bg.tertiary };
  return (
    <div
      style={{
        background: bgMap[variant],
        borderRadius: tokens.radius.lg,
        border: `1px solid ${tokens.colors.border.subtle}`,
        padding: tokens.spacing.xl,
        boxShadow: glow ? tokens.shadows.glow(glow) : tokens.shadows.md,
        transition: `all ${tokens.animation.normal} ${tokens.animation.easeOut}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Badge / Pill
const Badge = ({ children, color = tokens.colors.accent.primary, size = "md", style }) => {
  const sizes = {
    sm: { padding: "2px 8px", fontSize: 11, fontWeight: 600 },
    md: { padding: "4px 12px", fontSize: 13, fontWeight: 600 },
    lg: { padding: "6px 16px", fontSize: 15, fontWeight: 700 },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: `${color}22`,
        color: color,
        borderRadius: tokens.radius.pill,
        ...sizes[size],
        letterSpacing: 0.5,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

// Button — primary action component
const Button = ({ children, variant = "primary", size = "lg", disabled, glow, icon, style, ...props }) => {
  const [pressed, setPressed] = useState(false);
  const [ripplePos, setRipplePos] = useState(null);

  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, #D63B55)`,
      color: tokens.colors.text.primary,
      boxShadow: glow ? `0 4px 20px ${tokens.colors.accent.primaryGlow}` : tokens.shadows.sm,
    },
    secondary: {
      background: tokens.colors.bg.tertiary,
      color: tokens.colors.text.primary,
      border: `1px solid ${tokens.colors.border.medium}`,
    },
    ghost: {
      background: "transparent",
      color: tokens.colors.text.secondary,
      border: `1px solid ${tokens.colors.border.subtle}`,
    },
    success: {
      background: `linear-gradient(135deg, ${tokens.colors.semantic.correct}, #00B894)`,
      color: tokens.colors.text.primary,
    },
    amber: {
      background: `linear-gradient(135deg, ${tokens.colors.accent.secondary}, #E09600)`,
      color: tokens.colors.text.inverse,
    },
  };

  const sizes = {
    sm: { padding: "8px 16px", fontSize: 13, minHeight: 36, borderRadius: tokens.radius.sm },
    md: { padding: "12px 20px", fontSize: 15, minHeight: 44, borderRadius: tokens.radius.md },
    lg: { padding: "16px 28px", fontSize: 17, minHeight: 56, borderRadius: tokens.radius.lg },
    xl: { padding: "20px 36px", fontSize: 19, minHeight: 64, borderRadius: tokens.radius.lg },
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipplePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipplePos(null), 600);
    props.onClick?.(e);
  };

  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        ...sizes[size],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700,
        letterSpacing: 0.3,
        border: variants[variant].border || "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: `all ${tokens.animation.fast} ${tokens.animation.spring}`,
        position: "relative",
        overflow: "hidden",
        width: size === "xl" ? "100%" : undefined,
        ...style,
      }}
    >
      {ripplePos && (
        <span
          style={{
            position: "absolute",
            left: ripplePos.x,
            top: ripplePos.y,
            width: 20,
            height: 20,
            marginLeft: -10,
            marginTop: -10,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.3)",
            animation: "ripple 600ms ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}
      {icon && <span style={{ fontSize: sizes[size].fontSize + 2 }}>{icon}</span>}
      {children}
    </button>
  );
};

// AnswerButton — the core trivia interaction
const AnswerButton = ({ label, letter, state = "default", onPress }) => {
  const letterColors = { A: "#E94560", B: "#F5A623", C: "#00D4AA", D: "#5B8DEF" };
  const letterColor = letterColors[letter] || tokens.colors.accent.primary;

  const stateStyles = {
    default: {
      bg: tokens.colors.bg.tertiary,
      border: tokens.colors.border.subtle,
      opacity: 1,
      animation: "none",
      textDecoration: "none",
      cursor: "pointer",
    },
    selected: {
      bg: tokens.colors.bg.tertiary,
      border: letterColor,
      opacity: 1,
      animation: "pulseGlow 1.5s ease-in-out infinite",
      textDecoration: "none",
      cursor: "default",
    },
    correct: {
      bg: `${tokens.colors.semantic.correct}20`,
      border: tokens.colors.semantic.correct,
      opacity: 1,
      animation: "bounceScale 400ms ease-out",
      textDecoration: "none",
      cursor: "default",
    },
    wrong: {
      bg: `${tokens.colors.semantic.wrong}20`,
      border: tokens.colors.semantic.wrong,
      opacity: 1,
      animation: "shakeX 400ms ease-out",
      textDecoration: "none",
      cursor: "default",
    },
    eliminated: {
      bg: tokens.colors.semantic.eliminated,
      border: "transparent",
      opacity: 0.4,
      animation: "eliminateSlide 400ms ease-out forwards",
      textDecoration: "line-through",
      cursor: "default",
    },
  };

  const s = stateStyles[state];

  return (
    <button
      onClick={state === "default" ? onPress : undefined}
      style={{
        "--glow-color": letterColor + "60",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
        minHeight: 64,
        background: s.bg,
        border: `2px solid ${s.border}`,
        borderRadius: tokens.radius.lg,
        color: tokens.colors.text.primary,
        fontSize: 16,
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        textAlign: "left",
        cursor: s.cursor,
        opacity: s.opacity,
        textDecoration: s.textDecoration,
        animation: s.animation,
        transition: `all ${tokens.animation.normal} ${tokens.animation.easeOut}`,
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: tokens.radius.sm,
          background: state === "correct" ? tokens.colors.semantic.correct : state === "wrong" ? tokens.colors.semantic.wrong : `${letterColor}20`,
          color: state === "correct" || state === "wrong" ? "#fff" : letterColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 15,
          flexShrink: 0,
          transition: `all ${tokens.animation.normal}`,
        }}
      >
        {state === "correct" ? "✓" : state === "wrong" ? "✗" : letter}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
};

// Timer Ring — circular countdown
const TimerRing = ({ seconds, total = 45, size = 72 }) => {
  const pct = seconds / total;
  const color = pct > 0.5 ? tokens.colors.timer.plenty : pct > 0.2 ? tokens.colors.timer.warning : tokens.colors.timer.danger;
  const circumference = 2 * Math.PI * (size / 2 - 4);
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke={tokens.colors.border.subtle} strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 500ms" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          ...tokens.typography.monoSm,
          animation: pct < 0.2 ? "timerPulse 1s ease-in-out infinite" : "none",
        }}
      >
        {seconds}
      </span>
    </div>
  );
};

// Points Display — animated score
const PointsDisplay = ({ points, label, size = "lg" }) => {
  const sizes = {
    sm: tokens.typography.monoSm,
    md: tokens.typography.mono,
    lg: tokens.typography.monoLg,
  };
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...sizes[size], color: tokens.colors.semantic.points }}>
        {typeof points === "number" ? points.toLocaleString() : points}
      </div>
      {label && (
        <div style={{ ...tokens.typography.caption, color: tokens.colors.text.secondary, marginTop: 2 }}>
          {label}
        </div>
      )}
    </div>
  );
};

// Progress Bar
const ProgressBar = ({ value, max, color = tokens.colors.accent.primary, height = 6, animated }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ width: "100%", height, borderRadius: height, background: tokens.colors.bg.primary, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: height,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: `width ${tokens.animation.normal} ${tokens.animation.easeOut}`,
          ...(animated
            ? {
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.08) 10px, rgba(255,255,255,0.08) 20px)`,
                backgroundSize: "40px 40px",
                animation: "progressStripe 1s linear infinite",
              }
            : {}),
        }}
      />
    </div>
  );
};

// Avatar
const Avatar = ({ name, rank, size = 40, highlight }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `hsl(${hue}, 60%, 40%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.38,
        fontFamily: "'DM Sans', sans-serif",
        border: highlight ? `2px solid ${tokens.colors.accent.secondary}` : `2px solid transparent`,
        boxShadow: highlight ? `0 0 12px ${tokens.colors.accent.secondaryGlow}` : "none",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {initials}
      {rank && rank <= 3 && (
        <span
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            fontSize: 14,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
          }}
        >
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
        </span>
      )}
    </div>
  );
};

// Leaderboard Row
const LeaderboardRow = ({ rank, name, score, isYou }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 16px",
      borderRadius: tokens.radius.md,
      background: isYou ? `${tokens.colors.accent.primary}15` : "transparent",
      border: isYou ? `1px solid ${tokens.colors.accent.primary}40` : "1px solid transparent",
      transition: `all ${tokens.animation.normal}`,
    }}
  >
    <span style={{ ...tokens.typography.monoSm, color: rank <= 3 ? tokens.colors.accent.secondary : tokens.colors.text.disabled, width: 30, textAlign: "center" }}>
      {rank}
    </span>
    <Avatar name={name} rank={rank} size={36} highlight={isYou} />
    <span style={{ flex: 1, ...tokens.typography.bodyBold, color: tokens.colors.text.primary }}>{name}</span>
    <span style={{ ...tokens.typography.monoSm, color: tokens.colors.semantic.points }}>{score.toLocaleString()}</span>
  </div>
);

// Category Pill
const CategoryPill = ({ icon, label, color }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px",
      borderRadius: tokens.radius.pill,
      background: `${color}18`,
      border: `1px solid ${color}40`,
    }}
  >
    <span style={{ fontSize: 18 }}>{icon}</span>
    <span style={{ ...tokens.typography.caption, color: color, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
  </div>
);

// Question Counter
const QuestionCounter = ({ current, total }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ ...tokens.typography.monoSm, color: tokens.colors.text.primary }}>{current}</span>
    <span style={{ ...tokens.typography.caption, color: tokens.colors.text.disabled }}>/</span>
    <span style={{ ...tokens.typography.caption, color: tokens.colors.text.disabled }}>{total}</span>
  </div>
);

// Input Field
const TextInput = ({ placeholder, value, onChange, icon, style: s }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 18px",
      borderRadius: tokens.radius.lg,
      background: tokens.colors.bg.primary,
      border: `1px solid ${tokens.colors.border.medium}`,
      ...s,
    }}
  >
    {icon && <span style={{ fontSize: 20, opacity: 0.5 }}>{icon}</span>}
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        background: "none",
        border: "none",
        outline: "none",
        color: tokens.colors.text.primary,
        ...tokens.typography.body,
        fontFamily: "'DM Sans', sans-serif",
      }}
    />
  </div>
);

// Code Input (for room codes)
const CodeInput = ({ value = "", onChange, length = 4 }) => {
  const chars = value.toUpperCase().padEnd(length, " ").split("").slice(0, length);
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {chars.map((c, i) => (
        <div
          key={i}
          style={{
            width: 56,
            height: 68,
            borderRadius: tokens.radius.md,
            background: c.trim() ? tokens.colors.bg.tertiary : tokens.colors.bg.primary,
            border: `2px solid ${c.trim() ? tokens.colors.accent.primary : tokens.colors.border.medium}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...tokens.typography.mono,
            color: tokens.colors.text.primary,
            transition: `all ${tokens.animation.fast}`,
            boxShadow: c.trim() ? `0 0 12px ${tokens.colors.accent.primaryGlow}` : "none",
          }}
        >
          {c.trim() || ""}
        </div>
      ))}
    </div>
  );
};

// Toast / Notification
const Toast = ({ message, type = "info", visible }) => {
  const typeStyles = {
    info: { bg: tokens.colors.semantic.info, icon: "ℹ️" },
    success: { bg: tokens.colors.semantic.correct, icon: "✓" },
    error: { bg: tokens.colors.semantic.wrong, icon: "✗" },
    points: { bg: tokens.colors.semantic.points, icon: "⭐" },
  };
  const t = typeStyles[type];
  return (
    <div
      style={{
        padding: "12px 20px",
        borderRadius: tokens.radius.lg,
        background: `${t.bg}20`,
        border: `1px solid ${t.bg}50`,
        color: t.bg,
        ...tokens.typography.bodyBold,
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: visible ? "slideUp 300ms ease-out" : "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms",
      }}
    >
      <span style={{ fontSize: 18 }}>{t.icon}</span>
      {message}
    </div>
  );
};

// Skeleton Loader
const Skeleton = ({ width = "100%", height = 20, radius = tokens.radius.sm }) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius,
      background: `linear-gradient(90deg, ${tokens.colors.bg.secondary} 25%, ${tokens.colors.bg.tertiary} 50%, ${tokens.colors.bg.secondary} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s ease-in-out infinite",
    }}
  />
);

// ─── DEMO APP ────────────────────────────────────────────────
const SECTIONS = ["Tokens", "Buttons", "Answer Btns", "Game UI", "Leaderboard", "Inputs"];

export default function DesignSystem() {
  const [activeSection, setActiveSection] = useState("Tokens");
  const [demoAnswer, setDemoAnswer] = useState("default");
  const [timerSec, setTimerSec] = useState(35);
  const [codeValue, setCodeValue] = useState("BR");
  const [showToast, setShowToast] = useState(false);
  const [demoPoints, setDemoPoints] = useState(847);

  useEffect(() => {
    const t = setInterval(() => setTimerSec((s) => (s <= 0 ? 45 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const renderTokens = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Colors */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Color Palette</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
          {[
            ["bg.primary", tokens.colors.bg.primary],
            ["bg.secondary", tokens.colors.bg.secondary],
            ["bg.tertiary", tokens.colors.bg.tertiary],
            ["accent.primary", tokens.colors.accent.primary],
            ["accent.secondary", tokens.colors.accent.secondary],
            ["accent.tertiary", tokens.colors.accent.tertiary],
            ["correct", tokens.colors.semantic.correct],
            ["wrong", tokens.colors.semantic.wrong],
            ["eliminated", tokens.colors.semantic.eliminated],
            ["points", tokens.colors.semantic.points],
            ["info", tokens.colors.semantic.info],
            ["text.disabled", tokens.colors.text.disabled],
          ].map(([name, hex]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "100%",
                  height: 56,
                  borderRadius: tokens.radius.md,
                  background: hex,
                  border: `1px solid ${tokens.colors.border.medium}`,
                  marginBottom: 6,
                }}
              />
              <div style={{ ...tokens.typography.caption, color: tokens.colors.text.secondary, fontSize: 11 }}>{name}</div>
              <div style={{ ...tokens.typography.caption, color: tokens.colors.text.disabled, fontSize: 10 }}>{hex}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Typography Scale</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["display", "BarBrain"],
            ["h1", "Game Night"],
            ["h2", "Leaderboard"],
            ["h3", "Round 3 of 5"],
            ["body", "Tap the answer you think is correct before time runs out."],
            ["caption", "SCIENCE & NATURE • DIFFICULTY 3"],
            ["mono", "1,250"],
            ["monoSm", "7/15"],
            ["monoLg", "847"],
          ].map(([name, sample]) => (
            <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
              <Badge size="sm" color={tokens.colors.text.disabled}>{name}</Badge>
              <span style={{ ...tokens.typography[name], color: name.includes("mono") ? tokens.colors.semantic.points : tokens.colors.text.primary, fontFamily: tokens.typography[name].fontFamily || "'DM Sans', sans-serif" }}>
                {sample}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacing */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Spacing Scale</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(tokens.spacing).map(([name, val]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ ...tokens.typography.caption, color: tokens.colors.text.disabled, width: 40 }}>{name}</span>
              <div style={{ height: 12, width: val * 3, background: tokens.colors.accent.tertiary, borderRadius: 2, opacity: 0.7 }} />
              <span style={{ ...tokens.typography.caption, color: tokens.colors.text.secondary }}>{val}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Border Radius</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Object.entries(tokens.radius).map(([name, val]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: val, background: tokens.colors.bg.tertiary, border: `1px solid ${tokens.colors.border.medium}` }} />
              <div style={{ ...tokens.typography.caption, color: tokens.colors.text.secondary, marginTop: 4 }}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderButtons = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Button Variants</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" glow>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="amber">Amber</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Button Sizes</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>With Icons</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" icon="🎮" glow>Join Game</Button>
          <Button variant="success" icon="✓">Correct!</Button>
          <Button variant="amber" icon="⭐">+500 pts</Button>
          <Button variant="ghost" icon="⚙">Settings</Button>
        </div>
      </div>

      <div style={{ maxWidth: 340 }}>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Full Width (Phone CTA)</h3>
        <Button variant="primary" size="xl" glow icon="🎯">Start Playing</Button>
      </div>
    </div>
  );

  const renderAnswerBtns = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Answer Button States</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
          <AnswerButton letter="A" label="Paris, France" state="default" />
          <AnswerButton letter="B" label="London, England" state="selected" />
          <AnswerButton letter="C" label="Berlin, Germany" state="correct" />
          <AnswerButton letter="D" label="Madrid, Spain" state="wrong" />
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Eliminated State</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
          <AnswerButton letter="A" label="Paris, France" state="default" />
          <AnswerButton letter="B" label="London, England" state="eliminated" />
          <AnswerButton letter="C" label="Berlin, Germany" state="default" />
          <AnswerButton letter="D" label="Madrid, Spain" state="eliminated" />
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Interactive Demo</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {["default", "selected", "correct", "wrong", "eliminated"].map((s) => (
            <Button key={s} size="sm" variant={demoAnswer === s ? "primary" : "ghost"} onClick={() => setDemoAnswer(s)}>
              {s}
            </Button>
          ))}
        </div>
        <div style={{ maxWidth: 420 }}>
          <AnswerButton letter="A" label="The answer changes state →" state={demoAnswer} />
        </div>
      </div>
    </div>
  );

  const renderGameUI = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Timer Ring */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Timer Ring (Live)</h3>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <TimerRing seconds={timerSec} total={45} size={72} />
          <TimerRing seconds={timerSec} total={45} size={56} />
          <TimerRing seconds={Math.max(0, timerSec - 36)} total={9} size={72} />
        </div>
      </div>

      {/* Points */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Points Display</h3>
        <div style={{ display: "flex", gap: 32, alignItems: "flex-end", flexWrap: "wrap" }}>
          <PointsDisplay points={demoPoints} label="POINTS AVAILABLE" size="lg" />
          <PointsDisplay points={12450} label="YOUR SCORE" size="md" />
          <PointsDisplay points="+847" label="EARNED" size="sm" />
        </div>
      </div>

      {/* Badges & Categories */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Category Pills</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <CategoryPill icon="🌍" label="Geography" color="#00D4AA" />
          <CategoryPill icon="🎬" label="Entertainment" color="#E94560" />
          <CategoryPill icon="📜" label="History" color="#F5A623" />
          <CategoryPill icon="🎨" label="Art & Culture" color="#C77DFF" />
          <CategoryPill icon="🔬" label="Science" color="#5B8DEF" />
          <CategoryPill icon="⚽" label="Sports" color="#FF6B6B" />
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Badges</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge color={tokens.colors.semantic.correct} size="sm">EASY</Badge>
          <Badge color={tokens.colors.accent.secondary} size="md">MEDIUM</Badge>
          <Badge color={tokens.colors.semantic.wrong} size="md">HARD</Badge>
          <Badge color={tokens.colors.semantic.info} size="lg">ROUND 3</Badge>
          <Badge color={tokens.colors.accent.tertiary} size="md">🏆 STREAK x5</Badge>
        </div>
      </div>

      {/* Question Counter */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Question Counter + Progress</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <QuestionCounter current={7} total={15} />
            <Badge size="sm" color={tokens.colors.text.secondary}>47% COMPLETE</Badge>
          </div>
          <ProgressBar value={7} max={15} color={tokens.colors.accent.primary} height={4} />
          <ProgressBar value={12} max={15} color={tokens.colors.semantic.correct} height={6} animated />
          <ProgressBar value={3} max={15} color={tokens.colors.semantic.wrong} height={4} />
        </div>
      </div>

      {/* Toasts */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Toasts / Notifications</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
          <Toast message="Connected to game room" type="info" visible={true} />
          <Toast message="+847 points earned!" type="points" visible={true} />
          <Toast message="Correct! Nice one!" type="success" visible={true} />
          <Toast message="Time's up!" type="error" visible={true} />
        </div>
      </div>

      {/* Skeleton Loading */}
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Skeleton Loading</h3>
        <Card variant="secondary" style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="90%" height={22} />
          <Skeleton width="100%" height={56} radius={tokens.radius.lg} />
          <Skeleton width="100%" height={56} radius={tokens.radius.lg} />
          <Skeleton width="100%" height={56} radius={tokens.radius.lg} />
        </Card>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Avatars</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Avatar name="Sarah M" rank={1} size={48} />
          <Avatar name="Jake B" rank={2} size={48} />
          <Avatar name="Chris K" rank={3} size={48} />
          <Avatar name="Mike D" size={48} highlight />
          <Avatar name="Lisa P" size={40} />
          <Avatar name="Tom W" size={36} />
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Leaderboard</h3>
        <Card variant="secondary" style={{ maxWidth: 400 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <LeaderboardRow rank={1} name="Sarah M" score={12450} />
            <LeaderboardRow rank={2} name="Jake B" score={11200} />
            <LeaderboardRow rank={3} name="Chris K" score={10875} />
            <LeaderboardRow rank={4} name="You" score={9640} isYou />
            <LeaderboardRow rank={5} name="Lisa P" score={8920} />
            <LeaderboardRow rank={6} name="Tom W" score={7350} />
          </div>
        </Card>
      </div>
    </div>
  );

  const renderInputs = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Text Input</h3>
        <div style={{ maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
          <TextInput placeholder="Enter your name..." icon="👤" />
          <TextInput placeholder="Search questions..." icon="🔍" />
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Room Code Input</h3>
        <div style={{ maxWidth: 300 }}>
          <CodeInput value={codeValue} length={4} />
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
            {["BR", "BR7X", "GAME", ""].map((v) => (
              <Button key={v} size="sm" variant="ghost" onClick={() => setCodeValue(v)}>
                {v || "Clear"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, marginBottom: 16 }}>Cards</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Card variant="secondary" style={{ width: 200 }}>
            <Badge size="sm" color={tokens.colors.semantic.info}>INFO</Badge>
            <p style={{ ...tokens.typography.body, color: tokens.colors.text.secondary, marginTop: 8 }}>Standard card surface</p>
          </Card>
          <Card variant="tertiary" glow={tokens.colors.accent.primaryGlow} style={{ width: 200 }}>
            <Badge size="sm" color={tokens.colors.accent.primary}>ACTIVE</Badge>
            <p style={{ ...tokens.typography.body, color: tokens.colors.text.secondary, marginTop: 8 }}>Glowing card surface</p>
          </Card>
          <Card variant="primary" style={{ width: 200, border: `1px solid ${tokens.colors.border.strong}` }}>
            <Badge size="sm" color={tokens.colors.text.disabled}>SUBTLE</Badge>
            <p style={{ ...tokens.typography.body, color: tokens.colors.text.secondary, marginTop: 8 }}>Deep background card</p>
          </Card>
        </div>
      </div>
    </div>
  );

  const sectionRenderers = {
    Tokens: renderTokens,
    Buttons: renderButtons,
    "Answer Btns": renderAnswerBtns,
    "Game UI": renderGameUI,
    Leaderboard: renderLeaderboard,
    Inputs: renderInputs,
  };

  return (
    <div style={{ background: tokens.colors.bg.primary, minHeight: "100vh", color: tokens.colors.text.primary, fontFamily: "'DM Sans', sans-serif" }}>
      <StyleInjector />

      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `${tokens.colors.bg.primary}ee`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          padding: "16px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🧠</span>
            <div>
              <div style={{ ...tokens.typography.h3, color: tokens.colors.text.primary, lineHeight: 1 }}>BarBrain</div>
              <div style={{ ...tokens.typography.caption, color: tokens.colors.text.disabled }}>Design System v1.0</div>
            </div>
          </div>
          <Badge color={tokens.colors.accent.tertiary} size="md">React + React Native</Badge>
        </div>

        {/* Nav Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 14, maxWidth: 900, margin: "14px auto 0", overflowX: "auto" }}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                padding: "8px 16px",
                borderRadius: tokens.radius.pill,
                border: "none",
                background: activeSection === s ? tokens.colors.accent.primary : "transparent",
                color: activeSection === s ? "#fff" : tokens.colors.text.secondary,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: `all ${tokens.animation.fast}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>{sectionRenderers[activeSection]?.()}</div>
    </div>
  );
}
