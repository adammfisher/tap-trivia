import React, { useState, useEffect, useMemo, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// TapTrivia — BETWEEN-ROUNDS SEGMENT (120s)
// Results (20s) · Signage 1 (20s) · Play TapTrivia (40s) · Signage 2 (20s) · Categories (20s)
// Single-venue content only — no cross-venue data. Drops into the results window;
// game clock untouched.
// ═══════════════════════════════════════════════════════════

const C = {
  w: (a = 1) => `rgba(255,255,255,${a})`,
  b: (a = 1) => `rgba(0,0,0,${a})`,
  gold: "#ffd200", blue: "#667eea", green: "#00d4aa",
  grad: {
    main: "linear-gradient(135deg,#0f0326 0%,#1e0f4a 28%,#3d1866 52%,#6b2358 78%,#a8334a 100%)",
    gold: "linear-gradient(135deg,#f7971e,#ffd200,#ffe066)",
    sel: "linear-gradient(135deg,#667eea,#764ba2)",
    sign1: "linear-gradient(135deg,#1a0b2e,#5b1e5e,#a8334a)",
    sign2: "linear-gradient(135deg,#0a1f2e,#13495e,#1f8a7a)",
  },
};
const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap";

const QRCode = ({ size = 150 }) => {
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
    <div style={{ background: "#fff", borderRadius: size * 0.07, padding: size * 0.055, display: "inline-block", boxShadow: "0 10px 44px rgba(0,0,0,.35)" }}>
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
const Av = ({ name, size = 36 }) => {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,hsl(${h},60%,55%),hsl(${(h + 40) % 360},60%,45%))`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: size * 0.42, color: "#fff" }}>{name.charAt(0)}</div>;
};
const Center = ({ children, bg }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 8%", zIndex: 4, animation: "fade .5s ease-out", background: bg || "transparent" }}>{children}</div>
);

// ─── 1. LEADER RESULTS ───
const FINISHERS = [
  { name: "Adam", score: 13420 }, { name: "Priya", score: 12180 },
  { name: "Wes", score: 11650 }, { name: "Marcus", score: 9900 }, { name: "Jen", score: 8740 },
];
const SResults = () => (
  <Center>
    <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 34, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Round Complete! 🎉</div>
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: C.gold, marginBottom: 18 }}>FINAL STANDINGS · {BAR.name}</div>
    <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 7 }}>
      {FINISHERS.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: i === 0 ? C.grad.gold : C.w(0.05), border: `1px solid ${i === 0 ? "transparent" : C.w(0.07)}`, borderRadius: 13, padding: "9px 18px" }}>
          <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 20, fontWeight: 700, color: i === 0 ? "#1e0f4a" : i < 3 ? C.gold : C.w(0.3), width: 22 }}>{i === 0 ? "👑" : i + 1}</span>
          <Av name={p.name} size={32} />
          <span style={{ flex: 1, fontSize: 17, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "#1e0f4a" : C.w(0.8) }}>{p.name}</span>
          <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 17, fontWeight: 700, color: i === 0 ? "#1e0f4a" : C.gold }}>{p.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  </Center>
);

// ─── 2 & 4. FULL-SCREEN BAR SIGNAGE (owner-controlled) ───
const SSign1 = () => (
  <Center bg={C.grad.sign1}>
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 5, color: C.gold, marginBottom: 18 }}>LIVE THIS FRIDAY</div>
    <div style={{ fontSize: 72, marginBottom: 16 }}>🎸</div>
    <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 76, fontWeight: 700, color: "#fff", lineHeight: 1, textAlign: "center" }}>The Hangovers</div>
    <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 40, fontWeight: 600, color: C.gold, marginTop: 12 }}>9PM · No Cover</div>
    <div style={{ marginTop: 20, fontSize: 16, color: C.w(0.4), fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>VENUE SIGNAGE · OWNER-CONTROLLED</div>
  </Center>
);
const SSign2 = () => (
  <Center bg={C.grad.sign2}>
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 5, color: C.green, marginBottom: 18 }}>EVERY TUESDAY</div>
    <div style={{ fontSize: 72, marginBottom: 16 }}>🍗</div>
    <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 76, fontWeight: 700, color: "#fff", lineHeight: 1 }}>Half-Price Wings</div>
    <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 36, fontWeight: 600, color: C.green, marginTop: 12 }}>All Night · Dine-In Only</div>
    <div style={{ marginTop: 20, fontSize: 16, color: C.w(0.4), fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>VENUE SIGNAGE · OWNER-CONTROLLED</div>
  </Center>
);

// ─── 3. PLAY TAPTRIVIA (all text left + lower fonts, QR only on right) ───
const SPlay = () => (
  <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 4, animation: "fade .5s ease-out" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 6%", borderRight: `1px solid ${C.w(0.08)}` }}>
      <div style={{ fontSize: 38, marginBottom: 10, animation: "breathe 4s ease-in-out infinite" }}>🧠</div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 4, color: C.blue, marginBottom: 8 }}>NEW QUESTIONS EVERY 15 MIN</div>
      <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1.02, marginBottom: 10 }}>Play <span style={{ color: C.gold }}>TapTrivia</span></div>
      <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 19, fontWeight: 700, color: C.green }}>Free for 7 days</span>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.w(0.6), marginTop: 3, marginBottom: 16 }}>Scan the code → playing on your phone in seconds</span>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: C.gold, letterSpacing: 1 }}>app.taptrivia.tv</div>
      <div style={{ marginTop: 7, display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.w(0.45), letterSpacing: 2 }}>OR ENTER CODE</span>
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: 5, lineHeight: 1 }}>{BAR.code}</span>
      </div>
    </div>
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5%" }}>
      <QRCode size={280} />
    </div>
  </div>
);

// ─── 5. NEXT ROUND CATEGORIES ───
const CATS = [
  { n: "History", e: "🏛️" }, { n: "Movies", e: "🎬" }, { n: "Science", e: "🔬" },
  { n: "Sports", e: "🏈" }, { n: "Music", e: "🎵" }, { n: "Geography", e: "🌍" },
  { n: "Food & Drink", e: "🍔" }, { n: "The '90s", e: "📼" },
];
const SCategories = () => (
  <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 4, animation: "fade .5s ease-out" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 6%", borderRight: `1px solid ${C.w(0.08)}` }}>
      <div style={{ fontSize: 38, marginBottom: 8, animation: "breathe 4s ease-in-out infinite" }}>🧠</div>
      <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1, marginBottom: 8 }}>Play <span style={{ color: C.gold }}>TapTrivia</span></div>
      <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 20, fontWeight: 700, color: C.green, marginBottom: 16 }}>Free for 7 days</span>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <QRCode size={140} />
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: C.gold, letterSpacing: 1 }}>app.taptrivia.tv</div>
          <div style={{ marginTop: 10, fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.w(0.45), letterSpacing: 2 }}>OR ENTER CODE</div>
          <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 32, fontWeight: 700, color: C.gold, letterSpacing: 4, lineHeight: 1.1 }}>{BAR.code}</div>
        </div>
      </div>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 6%" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: C.blue, marginBottom: 8 }}>NEXT ROUND STARTS SOON</div>
      <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Coming Up</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 9 }}>
        {CATS.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: C.w(0.06), border: `1px solid ${C.w(0.08)}`, borderRadius: 10, padding: "9px 11px", animation: `fadeUp .4s ease-out ${i * 0.04}s both` }}>
            <span style={{ fontSize: 18 }}>{c.e}</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.w(0.85) }}>{c.n}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SEGMENTS = [
  { key: "results", label: "Leader Results", dur: 20, Comp: SResults },
  { key: "sign1", label: "Bar Signage 1", dur: 20, Comp: SSign1, sign: true },
  { key: "play", label: "Play TapTrivia", dur: 40, Comp: SPlay },
  { key: "sign2", label: "Bar Signage 2", dur: 20, Comp: SSign2, sign: true },
  { key: "categories", label: "Next Categories", dur: 20, Comp: SCategories },
];
const PREVIEW_MS = 5000; // accelerated preview; live pacing is the dur values

export default function App() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [prog, setProg] = useState(0);
  const raf = useRef();

  useEffect(() => {
    if (!playing) return;
    let start = Date.now();
    const ms = PREVIEW_MS * (SEGMENTS[i].dur / 20);
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / ms);
      setProg(p);
      if (p >= 1) { setI((v) => (v + 1) % SEGMENTS.length); start = Date.now(); setProg(0); }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, i]);

  const Comp = SEGMENTS[i].Comp;
  let acc = 0;
  const starts = SEGMENTS.map((s) => { const st = acc; acc += s.dur; return st; });

  return (
    <div style={{ minHeight: "100vh", background: "#08080c", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px 48px", fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @import url('${FONTS}');
        @keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,30px)}}
        @keyframes float2{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,-30px)}}
        @keyframes fade{from{opacity:0}to{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        *{box-sizing:border-box}
      `}</style>

      <div style={{ width: "100%", maxWidth: 1180, marginBottom: 14, textAlign: "center" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: C.w(0.3), textTransform: "uppercase" }}>📺 tv.taptrivia.tv — between-rounds segment · 120s</span>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 1180, aspectRatio: "16/9", borderRadius: 22, overflow: "hidden", background: C.grad.main, boxShadow: "0 30px 90px rgba(0,0,0,.6)" }}>
        <Orbs />
        <Comp />
      </div>

      {/* 120s timeline */}
      <div style={{ width: "100%", maxWidth: 1180, marginTop: 16, display: "flex", gap: 6 }}>
        {SEGMENTS.map((s, n) => (
          <button key={s.key} onClick={() => { setI(n); setProg(0); }} style={{ flex: s.dur, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ height: 6, borderRadius: 3, background: C.w(0.1), overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: s.sign ? "linear-gradient(90deg,#7a3b8a,#1f8a7a)" : C.grad.gold, width: n === i ? `${prog * 100}%` : n < i ? "100%" : "0%", transition: n === i ? "none" : "width .3s" }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: n === i ? 700 : 500, color: n === i ? "#fff" : C.w(0.4) }}>{s.label}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: C.w(0.3) }}>{starts[n]}–{starts[n] + s.dur}s</div>
          </button>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 1180, marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <button onClick={() => setPlaying((p) => !p)} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: C.grad.sel, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{playing ? "⏸ Pause" : "▶ Preview (5s/screen)"}</button>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.w(0.4), textAlign: "right", lineHeight: 1.7 }}>
          live pacing: Play 40s + 4 × 20s = 120s · all single-venue content<br />
          fits the results window · game clock untouched
        </span>
      </div>
    </div>
  );
}
