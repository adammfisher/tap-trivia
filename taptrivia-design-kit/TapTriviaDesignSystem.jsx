import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
//  TAP TRIVIA — Design System Showcase
//  Complete visual reference for all components & tokens
// ═══════════════════════════════════════════════════════════════

const P = {
  midnight: '#0B0E17', charcoal: '#141825', slate: '#1E2333', graphite: '#2A2F42',
  snow: '#EAEDF6', frost: '#B0B7CC', ash: '#6B7494',
  cyan: '#00D4FF', cyanMuted: '#0098B8', cyanGlow: '#00D4FF33', cyanSurface: '#00D4FF12',
  correct: '#00E676', wrong: '#FF3D5A', warning: '#FFB300',
  geo: '#4FC3F7', ent: '#CE93D8', hist: '#FFB74D', art: '#F06292', sci: '#81C784', sport: '#64B5F6',
};

const SLOTS = {
  A: { color: '#4FC3F7', label: 'A' },
  B: { color: '#CE93D8', label: 'B' },
  C: { color: '#FFB74D', label: 'C' },
  D: { color: '#81C784', label: 'D' },
};

const players = [
  { name: 'BarFly_Mike', score: 2400, rank: 1, avatar: '🍺', streak: 5, isCorrect: true },
  { name: 'QuizQueen', score: 2150, rank: 2, avatar: '👑', streak: 3, isCorrect: true },
  { name: 'TriviaSteve', score: 1800, rank: 3, avatar: '🧠', streak: 0, isCorrect: false },
  { name: 'WingNight_Jen', score: 1650, rank: 4, avatar: '🍗', streak: 2, isCorrect: true },
  { name: 'DartGuy', score: 1400, rank: 5, avatar: '🎯', streak: 0, isCorrect: false },
];

// ─── Timer Component ────────────────────────────────────
const CircleTimer = ({ seconds, total, size = 64, stroke = 4 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = seconds / total;
  const offset = circ * (1 - progress);
  const color = progress > 0.5 ? P.cyan : progress > 0.25 ? P.warning : P.wrong;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P.graphite} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
      </svg>
      <span style={{ position: 'absolute', fontFamily: '"JetBrains Mono", monospace', fontSize: size * 0.375, fontWeight: 700, color, transition: 'color 0.5s ease' }}>
        {seconds}
      </span>
    </div>
  );
};

// ─── Answer Card ────────────────────────────────────────
const AnswerCard = ({ letter, text, state = 'idle', pct, isTv = false, onClick }) => {
  const slot = SLOTS[letter];
  const isCorrect = state === 'correct';
  const isWrong = state === 'wrong';
  const isSelected = state === 'selected';

  const borderColor = isCorrect ? P.correct : isWrong ? P.wrong : isSelected ? slot.color : `${slot.color}40`;
  const bg = isCorrect ? `${P.correct}18` : isWrong ? `${P.wrong}18` : isSelected ? `${slot.color}20` : `${slot.color}08`;
  const textColor = isCorrect ? P.correct : isWrong ? P.wrong : isSelected ? slot.color : P.snow;

  return (
    <div onClick={onClick} style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      gap: isTv ? 20 : 12, padding: isTv ? '20px 28px' : '14px 16px',
      minHeight: isTv ? 100 : 56, background: bg,
      border: `${isTv ? 3 : 2}px solid ${borderColor}`, borderRadius: isTv ? 20 : 16,
      cursor: 'pointer', transition: 'all 0.3s ease', overflow: 'hidden', userSelect: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: isTv ? 52 : 32, height: isTv ? 52 : 32, borderRadius: isTv ? 14 : 8,
        background: `${slot.color}25`, color: isCorrect ? P.correct : isWrong ? P.wrong : slot.color,
        fontFamily: '"Chakra Petch", sans-serif', fontSize: isTv ? 28 : 16, fontWeight: 700, flexShrink: 0,
      }}>{letter}</div>
      <div style={{
        flex: 1, fontFamily: '"DM Sans", sans-serif', fontSize: isTv ? 28 : 16,
        fontWeight: 500, color: textColor, lineHeight: 1.3,
      }}>{text}</div>
      {pct !== undefined && (
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: isTv ? 22 : 14, fontWeight: 700, color: isCorrect ? P.correct : P.frost, minWidth: isTv ? 60 : 44, textAlign: 'right' }}>{pct}%</span>
      )}
      {pct !== undefined && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: `${pct}%`, background: isCorrect ? P.correct : slot.color, borderRadius: '0 3px 3px 0', transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
      )}
    </div>
  );
};

// ─── Category Pill ──────────────────────────────────────
const CategoryPill = ({ label, color, isTv = false }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    height: isTv ? 40 : 28, padding: `0 ${isTv ? 18 : 12}px`,
    borderRadius: 9999, background: `${color}18`, border: `1.5px solid ${color}50`,
    color, fontFamily: '"DM Sans", sans-serif', fontSize: isTv ? 18 : 12,
    fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap',
  }}>{label}</span>
);

// ─── Difficulty Dots ────────────────────────────────────
const Dots = ({ level, size = 6 }) => {
  const color = level <= 2 ? P.correct : level <= 3 ? P.warning : P.wrong;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width: size, height: size, borderRadius: '50%', background: i <= level ? color : P.graphite }} />
      ))}
    </div>
  );
};

// ─── Scoreboard Row ─────────────────────────────────────
const ScoreRow = ({ player, isTv = false }) => {
  const medals = ['🥇','🥈','🥉'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isTv ? 16 : 10,
      padding: isTv ? '14px 20px' : '10px 14px', height: isTv ? 60 : 48,
      borderRadius: isTv ? 16 : 12,
      background: player.rank === 1 ? P.cyanSurface : 'transparent',
      border: player.rank === 1 ? `1.5px solid ${P.cyan}30` : '1.5px solid transparent',
    }}>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: isTv ? 20 : 13, fontWeight: 700, color: player.rank <= 3 ? P.warning : P.ash, minWidth: isTv ? 36 : 24, textAlign: 'center' }}>
        {player.rank <= 3 ? medals[player.rank-1] : `#${player.rank}`}
      </span>
      <div style={{ width: isTv ? 44 : 32, height: isTv ? 44 : 32, borderRadius: isTv ? 14 : 10, background: P.graphite, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isTv ? 22 : 16, flexShrink: 0 }}>
        {player.avatar}
      </div>
      <span style={{ flex: 1, fontFamily: '"DM Sans", sans-serif', fontSize: isTv ? 22 : 15, fontWeight: 500, color: P.snow, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {player.name}
        {player.isCorrect !== undefined && <span style={{ marginLeft: 6, fontSize: isTv ? 16 : 12, color: player.isCorrect ? P.correct : P.wrong }}>{player.isCorrect ? '✓' : '✗'}</span>}
      </span>
      {player.streak >= 3 && <span style={{ fontSize: isTv ? 16 : 12, color: P.warning }}>🔥{player.streak}</span>}
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: isTv ? 24 : 16, fontWeight: 700, color: P.cyan, minWidth: isTv ? 70 : 48, textAlign: 'right' }}>{player.score.toLocaleString()}</span>
    </div>
  );
};

// ─── Button ─────────────────────────────────────────────
const Btn = ({ children, variant = 'primary', size = 'md', disabled, fullWidth, style }) => {
  const variants = {
    primary:   { background: `linear-gradient(135deg, ${P.cyan} 0%, ${P.cyanMuted} 100%)`, color: P.midnight, border: 'none' },
    secondary: { background: P.slate, color: P.snow, border: `1.5px solid ${P.graphite}` },
    ghost:     { background: 'transparent', color: P.cyan, border: `1.5px solid ${P.cyan}` },
    danger:    { background: `linear-gradient(135deg, ${P.wrong} 0%, #CC2244 100%)`, color: '#FFF', border: 'none' },
  };
  const sizes = {
    sm: { height: 36, padding: '0 12px', fontSize: 14 },
    md: { height: 44, padding: '0 16px', fontSize: 16 },
    lg: { height: 52, padding: '0 24px', fontSize: 18 },
  };
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: '"DM Sans", sans-serif', fontWeight: 600, borderRadius: 12, cursor: 'pointer',
      opacity: disabled ? 0.4 : 1, width: fullWidth ? '100%' : 'auto', letterSpacing: '0.01em',
      ...variants[variant], ...sizes[size], ...style,
    }}>{children}</button>
  );
};

// ─── Toast ──────────────────────────────────────────────
const ToastEl = ({ variant = 'info', message, icon }) => {
  const map = {
    info:    { bg: `${P.cyan}15`, border: `${P.cyan}40`, text: P.cyan },
    success: { bg: `${P.correct}15`, border: `${P.correct}40`, text: P.correct },
    error:   { bg: `${P.wrong}15`, border: `${P.wrong}40`, text: P.wrong },
    warning: { bg: `${P.warning}15`, border: `${P.warning}40`, text: P.warning },
  };
  const c = map[variant];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: c.bg, border: `1.5px solid ${c.border}` }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, fontWeight: 500, color: c.text }}>{message}</span>
    </div>
  );
};

// ─── Section Header ─────────────────────────────────────
const Section = ({ title, subtitle, children }) => (
  <div style={{ marginBottom: 48 }}>
    <h2 style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: 28, fontWeight: 700, color: P.snow, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
    {subtitle && <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, color: P.frost, margin: '4px 0 0', lineHeight: 1.5 }}>{subtitle}</p>}
    <div style={{ marginTop: 20 }}>{children}</div>
  </div>
);

// ─── Color Swatch ───────────────────────────────────────
const Swatch = ({ name, hex, large }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ width: large ? 80 : 56, height: large ? 80 : 56, borderRadius: 12, background: hex, border: `1px solid ${P.graphite}` }} />
    <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: P.frost }}>{name}</span>
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: P.ash }}>{hex}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN SHOWCASE
// ═══════════════════════════════════════════════════════════════

export default function TapTriviaDesignSystem() {
  const [timer, setTimer] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showView, setShowView] = useState('system'); // system | mobile | tv

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t <= 0 ? 20 : t - 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: P.midnight, color: P.snow, padding: 0 }}>
      {/* Load Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ─── Hero Header ─── */}
      <div style={{
        background: `linear-gradient(180deg, ${P.charcoal} 0%, ${P.midnight} 100%)`,
        borderBottom: `1px solid ${P.graphite}`,
        padding: '48px 40px 40px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${P.cyan} 0%, ${P.cyanMuted} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: P.midnight, fontFamily: '"Chakra Petch", sans-serif',
            }}>T</div>
            <span style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: 14, fontWeight: 600, color: P.cyan, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Design System v1.0</span>
          </div>
          <h1 style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: 48, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Tap Trivia
          </h1>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 18, color: P.frost, margin: '8px 0 24px', lineHeight: 1.5 }}>
            Component design language for mobile, web, and TV surfaces
          </p>

          {/* View Switcher */}
          <div style={{ display: 'flex', gap: 8 }}>
            {['system', 'mobile', 'tv'].map(v => (
              <button key={v} onClick={() => setShowView(v)} style={{
                height: 36, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif', fontSize: 14, fontWeight: 600,
                background: showView === v ? P.cyan : P.slate,
                color: showView === v ? P.midnight : P.frost,
                transition: 'all 0.2s ease', textTransform: 'capitalize',
              }}>{v === 'system' ? '🎨 Design Tokens' : v === 'mobile' ? '📱 Mobile' : '📺 TV Display'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>

        {/* ════════════════════════════════════════════════════════
            DESIGN TOKENS VIEW
            ════════════════════════════════════════════════════════ */}
        {showView === 'system' && (
          <>
            {/* Colors */}
            <Section title="Color Palette" subtitle="Dark-first design optimized for dimly-lit bar environments. Avoids pure black/white to prevent TV haloing.">
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Surfaces</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Swatch name="Midnight" hex={P.midnight} large />
                  <Swatch name="Charcoal" hex={P.charcoal} large />
                  <Swatch name="Slate" hex={P.slate} large />
                  <Swatch name="Graphite" hex={P.graphite} large />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Text</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Swatch name="Snow" hex={P.snow} />
                  <Swatch name="Frost" hex={P.frost} />
                  <Swatch name="Ash" hex={P.ash} />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand & Signals</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Swatch name="Cyan" hex={P.cyan} />
                  <Swatch name="Correct" hex={P.correct} />
                  <Swatch name="Wrong" hex={P.wrong} />
                  <Swatch name="Warning" hex={P.warning} />
                </div>
              </div>
              <div>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category Accents</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Swatch name="Geography" hex={P.geo} />
                  <Swatch name="Entertainment" hex={P.ent} />
                  <Swatch name="History" hex={P.hist} />
                  <Swatch name="Art & Culture" hex={P.art} />
                  <Swatch name="Science" hex={P.sci} />
                  <Swatch name="Sports" hex={P.sport} />
                </div>
              </div>
            </Section>

            {/* Typography */}
            <Section title="Typography" subtitle="Three-font system: display for impact, body for readability, mono for data.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Display — Chakra Petch</p>
                  <p style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: 48, fontWeight: 700, color: P.snow, margin: 0, lineHeight: 1.1 }}>Who discovered penicillin?</p>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, color: P.ash, marginTop: 8 }}>Used for questions on TV, round titles, hero moments, and the logo</p>
                </div>
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Body — DM Sans</p>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 18, fontWeight: 400, color: P.snow, margin: 0, lineHeight: 1.5 }}>Clean, geometric sans-serif with tall x-height and open apertures. Excellent legibility at small sizes on mobile screens and as answer option text on both surfaces.</p>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, color: P.ash, marginTop: 8 }}>Used for answer text, labels, descriptions, body copy, UI elements</p>
                </div>
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Mono — JetBrains Mono</p>
                  <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 48, fontWeight: 700, color: P.cyan }}>2,400</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 700, color: P.warning }}>00:15</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 500, color: P.frost }}>Q7/20</span>
                  </div>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, color: P.ash, marginTop: 8 }}>Used for scores, timers, question counters, percentages, and all numeric data</p>
                </div>
              </div>
            </Section>

            {/* Spacing & Radius */}
            <Section title="Spacing & Radius" subtitle="4px base unit. Consistent rhythm across platforms.">
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Spacing Scale</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    {[4,8,12,16,24,32,48,64].map(s => (
                      <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: s, height: s, background: `${P.cyan}30`, borderRadius: 4, border: `1px solid ${P.cyan}50` }} />
                        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: P.ash }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Border Radius</p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {[{r:4,l:'sm'},{r:8,l:'md'},{r:12,l:'lg'},{r:16,l:'xl'},{r:20,l:'2xl'},{r:9999,l:'full'}].map(({r,l}) => (
                      <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 48, height: 48, borderRadius: r, background: P.slate, border: `1.5px solid ${P.graphite}` }} />
                        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: P.ash }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Components Grid */}
            <Section title="Components" subtitle="All components adapt between mobile and TV surfaces via the surface prop.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Buttons */}
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Buttons</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Btn variant="primary">Join Game</Btn>
                      <Btn variant="secondary">Settings</Btn>
                      <Btn variant="ghost">Skip</Btn>
                      <Btn variant="danger">Leave</Btn>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Btn variant="primary" size="sm">Small</Btn>
                      <Btn variant="primary" size="md">Medium</Btn>
                      <Btn variant="primary" size="lg">Large</Btn>
                    </div>
                    <Btn variant="primary" disabled>Disabled State</Btn>
                  </div>
                </div>

                {/* Timer */}
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Timer (Live)</p>
                  <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <CircleTimer seconds={timer} total={20} size={64} stroke={4} />
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, color: P.ash, marginTop: 8 }}>Mobile</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <CircleTimer seconds={timer} total={20} size={120} stroke={6} />
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, color: P.ash, marginTop: 8 }}>TV</p>
                    </div>
                  </div>
                </div>

                {/* Category Pills */}
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Category Pills & Difficulty</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <CategoryPill label="Geography" color={P.geo} />
                    <CategoryPill label="Entertainment" color={P.ent} />
                    <CategoryPill label="History" color={P.hist} />
                    <CategoryPill label="Art & Culture" color={P.art} />
                    <CategoryPill label="Science" color={P.sci} />
                    <CategoryPill label="Sports" color={P.sport} />
                  </div>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    {[1,2,3,4,5].map(l => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Dots level={l} />
                        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: P.ash }}>Lv{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toasts */}
                <div style={{ padding: 24, background: P.charcoal, borderRadius: 16, border: `1px solid ${P.graphite}` }}>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Toasts</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ToastEl variant="info" message="Waiting for more players..." icon="⏳" />
                    <ToastEl variant="success" message="Correct! +200 points" icon="🎉" />
                    <ToastEl variant="error" message="Time's up!" icon="⏰" />
                    <ToastEl variant="warning" message="5 seconds remaining" icon="⚡" />
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            MOBILE VIEW
            ════════════════════════════════════════════════════════ */}
        {showView === 'mobile' && (
          <Section title="Mobile Game Screen" subtitle="How players see questions on their phones. Tap an answer to see state changes.">
            <div style={{
              width: 375, margin: '0 auto', background: P.midnight, borderRadius: 32,
              border: `2px solid ${P.graphite}`, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
              {/* Status bar mock */}
              <div style={{ height: 44, background: P.charcoal, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: P.frost }}>9:41</span>
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.cyan }}>TAP TRIVIA</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: P.frost }}>🔋</span>
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${P.graphite}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 500, color: P.ash }}>Q7/20</span>
                  <CategoryPill label="Science" color={P.sci} />
                  <Dots level={2} />
                </div>
                <CircleTimer seconds={timer} total={20} size={44} stroke={3} />
              </div>

              {/* Question */}
              <div style={{ padding: '24px 20px 16px' }}>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 20, fontWeight: 600, color: P.snow, lineHeight: 1.3, margin: 0 }}>
                  What is the primary function of the xylem tissue in plants?
                </p>
              </div>

              {/* Answers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px 24px' }}>
                <AnswerCard letter="A" text="Transport water from roots to leaves" state={selectedAnswer === 'A' ? 'selected' : 'idle'} onClick={() => setSelectedAnswer('A')} />
                <AnswerCard letter="B" text="Transport sugars throughout the plant" state={selectedAnswer === 'B' ? 'selected' : 'idle'} onClick={() => setSelectedAnswer('B')} />
                <AnswerCard letter="C" text="Provide structural support" state={selectedAnswer === 'C' ? 'selected' : 'idle'} onClick={() => setSelectedAnswer('C')} />
                <AnswerCard letter="D" text="Absorb sunlight for photosynthesis" state={selectedAnswer === 'D' ? 'selected' : 'idle'} onClick={() => setSelectedAnswer('D')} />
              </div>

              {/* Score bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: P.charcoal, borderTop: `1px solid ${P.graphite}` }}>
                <div>
                  <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 12, color: P.ash }}>Your Score</span>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, fontWeight: 700, color: P.cyan, margin: 0 }}>1,850</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 12, color: P.ash }}>Rank</span>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, fontWeight: 700, color: P.warning, margin: 0 }}>#3 of 12</p>
                </div>
              </div>
            </div>

            {/* Answer States Demo */}
            <div style={{ marginTop: 48 }}>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Answer Card States</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 700 }}>
                <AnswerCard letter="A" text="Idle State" state="idle" />
                <AnswerCard letter="B" text="Selected State" state="selected" />
                <AnswerCard letter="C" text="Correct Answer!" state="correct" />
                <AnswerCard letter="D" text="Wrong Answer" state="wrong" />
              </div>
            </div>
          </Section>
        )}

        {/* ════════════════════════════════════════════════════════
            TV VIEW
            ════════════════════════════════════════════════════════ */}
        {showView === 'tv' && (
          <Section title="TV Display" subtitle="What the bar TV shows. Designed for 1080p viewed from 8–25 feet away in dim lighting.">
            {/* TV Frame */}
            <div style={{
              width: '100%', aspectRatio: '16/9', background: P.midnight,
              borderRadius: 16, border: `2px solid ${P.graphite}`, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 32px', background: P.charcoal, borderBottom: `1px solid ${P.graphite}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, ${P.cyan}, ${P.cyanMuted})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Chakra Petch", sans-serif', fontSize: 18, fontWeight: 800, color: P.midnight,
                  }}>T</div>
                  <span style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: 18, fontWeight: 700, color: P.snow }}>TAP TRIVIA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: P.frost }}>👥 12 players</span>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: P.frost }}>Round 2/4</span>
                  <CategoryPill label="Science & Nature" color={P.sci} isTv />
                </div>
                <CircleTimer seconds={timer} total={20} size={56} stroke={4} />
              </div>

              {/* Main content area */}
              <div style={{ display: 'flex', height: 'calc(100% - 69px)' }}>
                {/* Question + Answers */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 32px', gap: 24 }}>
                  {/* Question number + difficulty */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 16, color: P.ash }}>Q7 of 20</span>
                    <Dots level={3} size={8} />
                  </div>

                  {/* Question */}
                  <p style={{
                    fontFamily: '"Chakra Petch", sans-serif', fontSize: 32, fontWeight: 700,
                    color: P.snow, textAlign: 'center', lineHeight: 1.2, margin: 0,
                    maxWidth: 800, alignSelf: 'center',
                  }}>
                    What is the primary function of the xylem tissue in plants?
                  </p>

                  {/* Answer Grid 2x2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 900, alignSelf: 'center', width: '100%' }}>
                    <AnswerCard letter="A" text="Transport water from roots to leaves" state="correct" pct={58} isTv />
                    <AnswerCard letter="B" text="Transport sugars throughout the plant" state="idle" pct={25} isTv />
                    <AnswerCard letter="C" text="Provide structural support" state="idle" pct={8} isTv />
                    <AnswerCard letter="D" text="Absorb sunlight for photosynthesis" state="idle" pct={9} isTv />
                  </div>
                </div>

                {/* Scoreboard Sidebar */}
                <div style={{
                  width: 300, background: P.charcoal, borderLeft: `1px solid ${P.graphite}`,
                  padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <p style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: 16, fontWeight: 700, color: P.frost, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 8 }}>Leaderboard</p>
                  {players.map(p => <ScoreRow key={p.name} player={p} isTv />)}
                </div>
              </div>
            </div>

            {/* TV Answer Slot Colors */}
            <div style={{ marginTop: 48 }}>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: P.ash, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>TV Answer Slot System</p>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, color: P.frost, marginBottom: 16, maxWidth: 600 }}>
                Each answer slot (A/B/C/D) has a unique accent color so viewers can quickly identify options from across the bar. Colors are chosen for maximum distinguishability even for colorblind viewers.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 700 }}>
                {Object.entries(SLOTS).map(([key, slot]) => (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    background: `${slot.color}10`, border: `2px solid ${slot.color}40`, borderRadius: 16,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, background: `${slot.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: '"Chakra Petch", sans-serif', fontSize: 24, fontWeight: 700, color: slot.color,
                    }}>{key}</div>
                    <div>
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 15, fontWeight: 600, color: P.snow, margin: 0 }}>Slot {key}</p>
                      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: P.ash, margin: 0 }}>{slot.color}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${P.graphite}`, paddingTop: 32, marginTop: 24, textAlign: 'center' }}>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, color: P.ash }}>
            Tap Trivia Design System • Tokens + React + React Native + TV
          </p>
        </div>
      </div>
    </div>
  );
}
