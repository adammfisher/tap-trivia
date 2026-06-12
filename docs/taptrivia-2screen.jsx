import React, { useState, useEffect, useMemo, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// TapTrivia — TWO combined screens, alternating (end segment)
// Screen 1 (50/50): Did You Know | Leaderboard
// Screen 2 (50/50): Venue Ad     | Play TapTrivia QR
// ═══════════════════════════════════════════════════════════

const C = {
  w: (a = 1) => `rgba(255,255,255,${a})`,
  b: (a = 1) => `rgba(0,0,0,${a})`,
  gold: "#ffd200", blue: "#667eea", green: "#00d4aa",
  grad: {
    main: "linear-gradient(135deg,#0f0326 0%,#1e0f4a 28%,#3d1866 52%,#6b2358 78%,#a8334a 100%)",
    gold: "linear-gradient(135deg,#f7971e,#ffd200,#ffe066)",
    selected: "linear-gradient(135deg,#667eea,#764ba2)",
  },
};
const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap";

const QRCode = ({ size = 160 }) => {
  const grid = 25, cell = size / grid;
  const cells = useMemo(() => {
    const r = []; let s = 48271;
    const inF = (cx, cy, x, y) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    const border = (cx, cy, x, y) => inF(cx, cy, x, y) && !(x > cx && x < cx + 6 && y > cy && y < cy + 6);
    const core = (cx, cy, x, y) => x >= cx + 2 && x < cx + 5 && y >= cy + 2 && y < cy + 5;
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
      if (border(0, 0, x, y) || core(0, 0, x, y) || border(18, 0, x, y) || core(18, 0, x, y) || border(0, 18, x, y) || core(0, 18, x, y)) r.push({ x, y, f: true });
      else if (inF(0, 0, x, y) || inF(18, 0, x, y) || inF(0, 18, x, y)) r.push({ x, y, f: false });
      else { s = (s * 1103515245 + 12345) >>> 0; if (s % 100 < 42) r.push({ x, y, f: true }); }
    }
    return r;
  }, []);
  return (
    <div style={{ background: "#fff", borderRadius: size * 0.08, padding: size * 0.06, display: "inline-block", boxShadow: "0 8px 36px rgba(0,0,0,.3)" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.filter((c) => c.f).map((c, i) => <rect key={i} x={c.x * cell} y={c.y * cell} width={cell + 0.5} height={cell + 0.5} fill="#1e0f4a" rx={cell * 0.12} />)}
      </svg>
    </div>
  );
};
const Logo = ({ size = 1 }) => (
  <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 28 * size, letterSpacing: -0.5, lineHeight: 1 }}>
    <span style={{ color: "#fff" }}>Tap</span><span style={{ color: C.gold }}>Trivia</span>
  </span>
);
const Orbs = () => (
  <>
    <div style={{ position: "absolute", top: "-12%", left: "-8%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(118,75,162,.5),transparent 70%)", filter: "blur(50px)", animation: "float1 14s ease-in-out infinite" }} />
    <div style={{ position: "absolute", bottom: "-15%", right: "-6%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,51,74,.45),transparent 70%)", filter: "blur(50px)", animation: "float2 17s ease-in-out infinite" }} />
  </>
);

const BAR = { name: "Two Buck Saloon — Pineville, NC", code: "2EHRT" };
// Real players available to "join" (high, varied scores — engaged humans)
const REAL = [
  { name: "Adam", score: 6619 }, { name: "Sam", score: 5840 },
  { name: "Priya", score: 5210 }, { name: "Wes", score: 4905 },
];
// House player name bank (assigned per venue per game)
const NAME_BANK = ["Marcus", "Jen", "TKitchen", "Dré", "Hollis", "BoomBox", "Reggie", "Tina_M", "Dax", "PennyL", "Gus", "Marlo", "Vee", "QuizKid", "Siela"];
const MAX_HOUSE = 3;  // never more than 3 house players; they recede 1:1 as real players join

// deterministic board: real players + house fill, sorted, #1 always real if any real present
function buildBoard(realCount) {
  let seed = 1234 + realCount * 97;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const real = REAL.slice(0, realCount).map((p) => ({ ...p, house: false }));
  const houseNeeded = Math.max(0, MAX_HOUSE - realCount); // 0 real → 3, 1 → 2, 2 → 1, 3+ → 0
  const names = [...NAME_BANK].sort(() => rnd() - 0.5).slice(0, houseNeeded);
  const house = names.map((name) => ({ name, score: Math.round(rnd() * 700), house: true }));
  const board = [...real, ...house].sort((a, b) => b.score - a.score);
  // guarantee: a real player can always win the bar
  if (real.length && board[0].house) {
    const topReal = Math.max(...real.map((r) => r.score));
    board[0].score = topReal - 1 - Math.round(rnd() * 40);
    board.sort((a, b) => b.score - a.score);
  }
  return board;
}

const NATIONAL = [
  { name: "Space_cowboy", venue: "Hodges Taproom", score: 9120 },
  { name: "Adam", venue: "Two Buck Saloon", score: 6619 },
  { name: "quizlord", venue: "Dry Falls Brewing", score: 6080 },
];
const FACT = "The UH-1's distinctive 'whop-whop' rotor sound became so iconic that it defined the entire Vietnam War era for millions of people.";

const Av = ({ name, size = 36 }) => {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,hsl(${h},60%,55%),hsl(${(h + 40) % 360},60%,45%))`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: size * 0.42, color: "#fff" }}>{name.charAt(0)}</div>;
};

const Half = ({ children, divider }) => (
  <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 5%", borderRight: divider ? `1px solid ${C.w(0.08)}` : "none" }}>{children}</div>
);

// ───── SCREEN 1: Did You Know | Leaderboard ─────
const Screen1 = ({ realCount = 0, revealHouse = false }) => {
  const board = buildBoard(realCount);
  return (
  <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 4, animation: "fade .5s ease-out" }}>
    <Half divider>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: C.gold, letterSpacing: 5, marginBottom: 20, textAlign: "center" }}>DID YOU KNOW?</div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 600, color: "#fff", lineHeight: 1.4, textAlign: "center" }}>{FACT}</div>
    </Half>
    <Half>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <Logo size={0.85} />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: C.w(0.4), marginTop: 4 }}>FINAL STANDINGS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {board.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: i === 0 ? C.w(0.1) : C.w(0.04), border: `1px solid ${i === 0 ? C.gold + "55" : C.w(0.06)}`, borderRadius: 11, padding: "8px 14px", outline: revealHouse && p.house ? `1px dashed ${C.blue}` : "none" }}>
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 15, fontWeight: 700, color: i < 3 ? C.gold : C.w(0.3), width: 14 }}>{i + 1}</span>
            <Av name={p.name} size={28} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: i === 0 ? 700 : 500, color: C.w(i === 0 ? 1 : 0.7) }}>{p.name}{revealHouse && p.house && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: C.blue, marginLeft: 6, letterSpacing: 1 }}>HOUSE</span>}</span>
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 15, fontWeight: 700, color: C.gold }}>{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.w(0.08)}` }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: C.blue, marginBottom: 8 }}>🌎 TOP ACROSS TAPTRIVIA TONIGHT</div>
        {NATIONAL.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12 }}>
            <span style={{ color: C.w(0.35), width: 12 }}>{i + 1}</span>
            <span style={{ color: C.w(0.85), fontWeight: 600 }}>{p.name}</span>
            <span style={{ color: C.w(0.35), flex: 1, fontSize: 11 }}>· {p.venue}</span>
            <span style={{ fontFamily: "'Fredoka',sans-serif", color: C.gold, fontWeight: 700 }}>{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Half>
  </div>
  );
};

// ───── SCREEN 2: Venue Ad | Play TapTrivia QR ─────
const Screen2 = () => (
  <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 4, animation: "fade .5s ease-out" }}>
    <Half divider>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: C.green, marginBottom: 16 }}>TONIGHT AT TWO BUCK SALOON</div>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: C.grad.gold, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 40, marginBottom: 18, boxShadow: "0 12px 40px rgba(255,210,0,.3)" }}>🍺</div>
        <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 46, fontWeight: 700, color: "#fff", lineHeight: 1.02 }}>$3 Drafts</div>
        <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 46, fontWeight: 700, color: C.gold, lineHeight: 1.02, marginBottom: 12 }}>Till 9PM</div>
        <div style={{ fontSize: 16, color: C.w(0.5) }}>Local IPAs · Lagers · House Pours</div>
      </div>
    </Half>
    <Half>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 8, animation: "breathe 4s ease-in-out infinite" }}>🧠</div>
        <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 34, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Play TapTrivia!</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1 }}>Free for 7 days</span>
          <span style={{ fontSize: 13, color: C.w(0.45), marginTop: 3 }}>scan to start</span>
        </div>
        <QRCode size={150} />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: C.gold, marginTop: 12 }}>app.taptrivia.tv</div>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: C.w(0.4), letterSpacing: 2 }}>CODE </span>
          <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: 4 }}>{BAR.code}</span>
        </div>
      </div>
    </Half>
  </div>
);

const SCREENS = [
  { key: "s1", label: "Did You Know | Leaderboard", dur: 6000, Comp: Screen1 },
  { key: "s2", label: "Venue Ad | Play TapTrivia QR", dur: 9000, Comp: Screen2 },
];

export default function App() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [prog, setProg] = useState(0);
  const [realCount, setRealCount] = useState(0);
  const [revealHouse, setRevealHouse] = useState(true);
  const raf = useRef();

  useEffect(() => {
    if (!playing) return;
    let start = Date.now();
    const dur = SCREENS[i].dur;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setProg(p);
      if (p >= 1) { setI((v) => (v + 1) % SCREENS.length); start = Date.now(); setProg(0); }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, i]);

  return (
    <div style={{ minHeight: "100vh", background: "#08080c", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px 48px", fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @import url('${FONTS}');
        @keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,30px)}}
        @keyframes float2{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,-30px)}}
        @keyframes fade{from{opacity:0}to{opacity:1}}
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        *{box-sizing:border-box} input[type=range]{accent-color:#ffd200}
      `}</style>

      <div style={{ width: "100%", maxWidth: 1180, marginBottom: 14, textAlign: "center" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: C.w(0.3), textTransform: "uppercase" }}>📺 tv.taptrivia.tv — 15s between-question window (16:9)</span>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 1180, aspectRatio: "16/9", borderRadius: 22, overflow: "hidden", background: C.grad.main, boxShadow: "0 30px 90px rgba(0,0,0,.6)" }}>
        <Orbs />
        {(() => { const Comp = SCREENS[i].Comp; return <Comp realCount={realCount} revealHouse={revealHouse} />; })()}
      </div>

      <div style={{ width: "100%", maxWidth: 1180, marginTop: 16, display: "flex", gap: 12 }}>
        {SCREENS.map((s, n) => (
          <button key={s.key} onClick={() => { setI(n); setProg(0); }} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ height: 5, borderRadius: 3, background: C.w(0.1), overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: C.grad.gold, width: n === i ? `${prog * 100}%` : "0%", transition: n === i ? "none" : "width .3s" }} />
            </div>
            <span style={{ display: "block", marginTop: 7, fontSize: 12, fontWeight: n === i ? 700 : 500, color: n === i ? "#fff" : C.w(0.4) }}>{s.label}</span>
          </button>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 1180, marginTop: 20, background: C.w(0.04), border: `1px solid ${C.w(0.07)}`, borderRadius: 16, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <button onClick={() => setPlaying((p) => !p)} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: C.grad.selected, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{playing ? "⏸ Pause" : "▶ Play"}</button>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: C.w(0.55), lineHeight: 1.8, textAlign: "right" }}>
          screen 1 = <span style={{ color: C.gold }}>6s</span> · screen 2 = <span style={{ color: C.gold }}>9s</span> · window = <span style={{ color: C.green }}>15s</span><br />
          fits the native Scores phase (0:37–0:52)<br />
          reveal stays 6s · question 52s · zero clock change
        </div>
      </div>

      {/* House-player demo control */}
      <div style={{ width: "100%", maxWidth: 1180, marginTop: 14, background: C.w(0.04), border: `1px solid ${C.w(0.07)}`, borderRadius: 16, padding: "16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: C.w(0.5), fontWeight: 600 }}>Real players at this bar:</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => { setI(0); setRealCount(n); }} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${realCount === n ? C.gold : C.w(0.12)}`, background: realCount === n ? C.grad.gold : C.w(0.04), color: realCount === n ? "#1e0f4a" : C.w(0.6), fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{n}{n === 4 ? "+" : ""}</button>
            ))}
          </div>
          <button onClick={() => setRevealHouse((v) => !v)} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${C.blue}66`, background: revealHouse ? C.blue + "22" : "transparent", color: C.w(0.8), fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            {revealHouse ? "👁 Showing tags (dev)" : "Tags hidden (bar view)"}
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: C.w(0.45), lineHeight: 1.6 }}>
          Max <b style={{ color: C.w(0.7) }}>3</b> house players, receding one-for-one: 0 real → 3 house, 1 → 2, 2 → 1, 3+ → none. A real player always holds #1 when present. In dev view, only <span style={{ color: C.blue, fontWeight: 700 }}>HOUSE</span> rows are tagged; toggle off for the patron's view, where they're indistinguishable. House scores stay in the 0–700 band.
        </div>
      </div>
    </div>
  );
}
