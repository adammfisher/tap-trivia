import { useState, useMemo } from "react";

// ╔══════════════════════════════════════════════════════════════════════════
// TAP TRIVIA — Operator Analytics Dashboard (Mockup)
// One-person command center. Pulls from: DynamoDB, RevenueCat, App Store
// Connect, Google Play Console, AWS Cost Explorer.
// ╚══════════════════════════════════════════════════════════════════════════

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    panel: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    green: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    purple: "linear-gradient(135deg, #667eea, #764ba2)",
    red: "linear-gradient(135deg, #ff4757, #ff6b81)",
    cyan: "linear-gradient(135deg, #4facfe, #00f2fe)",
  },
  w: a => `rgba(255,255,255,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea",
  purple: "#764ba2", cyan: "#4facfe", orange: "#f7971e",
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Outfit',sans-serif}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .panel{animation:fadeUp .4s ease-out both}
    .live::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#00d4aa;margin-right:6px;animation:pulse 1.6s infinite;box-shadow:0 0 8px #00d4aa}
    .scrollbar::-webkit-scrollbar{width:6px;height:6px}
    .scrollbar::-webkit-scrollbar-track{background:transparent}
    .scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
    .scrollbar::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.2)}
    .row:hover{background:rgba(255,255,255,.03)}
    .row.clickable{cursor:pointer;transition:background .15s}
    .row.clickable:hover{background:rgba(102,126,234,.08)}
    .tab{transition:all .15s}
    .tab:hover{color:#fff}
    .tab.active{color:#fff;background:rgba(255,255,255,.06)}
  `}</style>
);

// ─── Date Range System ────────────────────────────────────────────────────
const RANGES = [
  {key:"mtd",   label:"Month to date",      days: null}, // computed
  {key:"30d",   label:"Last 30 days",       days: 30},
  {key:"90d",   label:"Last 90 days",       days: 90},
  {key:"ytd",   label:"Year to date",       days: null},
  {key:"12mo",  label:"Last 12 months",     days: 365},
  {key:"3y",    label:"Last 3 years",       days: 1095},
  {key:"custom",label:"Custom…",            days: null},
];

const COMPARE_MODES = [
  {key:"none", label:"No comparison"},
  {key:"prev", label:"Previous period"},
  {key:"yoy",  label:"Same period last year"},
];

// Active "today" for the mockup
const TODAY = new Date(2026, 3, 30); // Apr 30, 2026

const rangeWindow = (rangeKey, today=TODAY) => {
  const end = new Date(today);
  const start = new Date(today);
  if (rangeKey === "mtd") start.setDate(1);
  else if (rangeKey === "ytd") { start.setMonth(0); start.setDate(1); }
  else if (rangeKey === "30d")  start.setDate(end.getDate() - 30);
  else if (rangeKey === "90d")  start.setDate(end.getDate() - 90);
  else if (rangeKey === "12mo") start.setFullYear(end.getFullYear() - 1);
  else if (rangeKey === "3y")   start.setFullYear(end.getFullYear() - 3);
  return {start, end};
};

const compareWindow = (window, mode) => {
  if (mode === "none") return null;
  const ms = window.end - window.start;
  if (mode === "prev") {
    return {start: new Date(window.start.getTime() - ms), end: new Date(window.start)};
  }
  if (mode === "yoy") {
    const start = new Date(window.start); start.setFullYear(start.getFullYear() - 1);
    const end   = new Date(window.end);   end.setFullYear(end.getFullYear() - 1);
    return {start, end};
  }
  return null;
};

const fmtRange = (w) => {
  const opts = {month:"short", day:"numeric", year:"numeric"};
  return `${w.start.toLocaleDateString("en-US",opts)} – ${w.end.toLocaleDateString("en-US",opts)}`;
};

const daysBetween = (a,b) => Math.round((b-a)/(1000*60*60*24));

// ─── Mock Data ─────────────────────────────────────────────────────────────

// 36 months of revenue history (May 2023 through Apr 2026)
// Realistic curve: tiny launch, slow growth, recent acceleration
const MONTHLY_REVENUE = (() => {
  const months = [];
  // 36 months, oldest first. Apr 2026 (current) ends the array.
  // Patterns: gradual ramp + seasonal boost (Sep-Dec, sports + holiday trivia surge)
  const rawMrr = [
    // 2023: pre-launch tinkering, no revenue (May-Dec 2023)
    0, 0, 0, 0, 0, 0, 0, 0,
    // 2024: launch in Jan, slow ramp
    34, 78, 142, 198, 271, 318, 402, 478, 612, 781, 924, 1102,
    // 2025: real growth, seasonal pop in Q4
    1284, 1421, 1602, 1789, 2014, 2218, 2487, 2702, 3145, 3621, 4012, 4318,
    // 2026: continued growth
    4612, 4894, 5208, 5511, // through Apr 2026 (current month)
  ];
  let yr = 2023, mo = 4; // May 2023 = index 0
  for (let i = 0; i < rawMrr.length; i++) {
    months.push({
      year: yr,
      month: mo,
      label: new Date(yr, mo, 1).toLocaleDateString("en-US", {month:"short", year:"2-digit"}),
      gross: rawMrr[i],
      net:   rawMrr[i] * 0.85, // after store fees
      aws:   Math.max(2, rawMrr[i] * 0.0072 + 4), // floor + scaling
      paidSubs: Math.round(rawMrr[i] / 2.99),
    });
    mo++;
    if (mo > 11) { mo = 0; yr++; }
  }
  return months;
})();

// Slice monthly revenue by date window
const sliceMonthly = (window) => {
  return MONTHLY_REVENUE.filter(m => {
    const mDate = new Date(m.year, m.month, 15); // mid-month
    return mDate >= window.start && mDate <= window.end;
  });
};

const aggregateRevenue = (slice) => {
  const gross = slice.reduce((s,m) => s + m.gross, 0);
  const net   = slice.reduce((s,m) => s + m.net, 0);
  const aws   = slice.reduce((s,m) => s + m.aws, 0);
  return {gross, net, aws};
};

const mockData = {
  overview: {
    totalUsers: 4287,
    trialUsers: 312,
    paidSubs: 1843,
    free: 2132,
    newSubsToday: 28,
    newSubsTrend: 0.12,
    churnRate: 0.038,
    trialConversion: 0.61,
    activeBars: 47,
    pendingBars: 6,
    mrr: 5510.57,
    netMrr: 4683.99, // after store fees
    awsThisMonth: 38.42,
    questionsTotal: 70312,
    questionsUsed: 18904,
    currentRound: 1,
    nextRoundStartsAt: 51408,
  },
  // Daily subscriber count for the last 3 years (1095 points). Mock pattern.
  subDaily: (() => {
    const days = 1095;
    const arr = [];
    for (let i = 0; i < days; i++) {
      // Smooth sigmoid-ish growth from 0 → 1843
      const t = i / days;
      const paid = Math.round(1843 * (1/(1 + Math.exp(-7*(t-0.65)))));
      const trial = Math.round(paid * 0.18 + Math.sin(i/8)*12);
      const date = new Date(TODAY); date.setDate(date.getDate() - (days - i));
      arr.push({date, paid, trial: Math.max(0, trial)});
    }
    return arr;
  })(),
  bars: [
    {code:"BR7X9", name:"The Rusty Rooster",        city:"Brevard, NC",     players: 87, gamesMonth: 12, mrrAttr: 198.34, lastGame:"2h ago",  status:"active"},
    {code:"K3M2L", name:"Hawg Wild Brewing",         city:"Brevard, NC",     players: 64, gamesMonth: 9,  mrrAttr: 156.12, lastGame:"1d ago",  status:"active"},
    {code:"P9D4F", name:"Ecusta Brewing",            city:"Brevard, NC",     players: 58, gamesMonth: 8,  mrrAttr: 134.87, lastGame:"3h ago",  status:"active"},
    {code:"X2N7T", name:"The Square Root",           city:"Brevard, NC",     players: 41, gamesMonth: 6,  mrrAttr: 98.22,  lastGame:"5h ago",  status:"active"},
    {code:"Q8R5A", name:"Pisgah Tavern",             city:"Brevard, NC",     players: 34, gamesMonth: 5,  mrrAttr: 81.44,  lastGame:"2d ago",  status:"active"},
    {code:"M4V1B", name:"The Phoenix",               city:"Hendersonville, NC", players: 29, gamesMonth: 4, mrrAttr: 72.18, lastGame:"4h ago", status:"active"},
    {code:"L7H3J", name:"Sanctuary Brewing",         city:"Hendersonville, NC", players: 23, gamesMonth: 4, mrrAttr: 58.92, lastGame:"6h ago", status:"active"},
    {code:"Z6K9C", name:"Boondocks Brewing",         city:"West Jefferson, NC", players: 19, gamesMonth: 3, mrrAttr: 47.11, lastGame:"1d ago", status:"active"},
    {code:"F2W8E", name:"Whiteside Brewing",         city:"Cashiers, NC",    players: 14, gamesMonth: 2,  mrrAttr: 34.56,  lastGame:"3d ago", status:"slow"},
    {code:"T5G1U", name:"Innovation Station",        city:"Asheville, NC",   players: 12, gamesMonth: 2,  mrrAttr: 28.94,  lastGame:"4d ago", status:"slow"},
    {code:"Y8B6N", name:"Burial Beer Co",            city:"Asheville, NC",   players: 9,  gamesMonth: 1,  mrrAttr: 18.41,  lastGame:"6d ago", status:"slow"},
    {code:"D3S9O", name:"Hi-Wire Brewing",           city:"Asheville, NC",   players: 7,  gamesMonth: 1,  mrrAttr: 14.22,  lastGame:"8d ago", status:"dormant"},
  ],
  awsCosts: [
    {service:"Lambda",       cost: 4.18,  pct: 0.109, color: C.blue},
    {service:"DynamoDB",     cost: 12.84, pct: 0.334, color: C.purple},
    {service:"API Gateway",  cost: 6.21,  pct: 0.162, color: C.cyan},
    {service:"Bedrock",      cost: 2.94,  pct: 0.077, color: C.gold},
    {service:"S3 + CloudFront", cost: 3.52, pct: 0.092, color: "#2ee6b6"},
    {service:"Route 53",     cost: 1.10,  pct: 0.029, color: "#ff6b81"},
    {service:"SES",          cost: 0.42,  pct: 0.011, color: "#9f7aea"},
    {service:"EventBridge",  cost: 0.18,  pct: 0.005, color: "#f7971e"},
    {service:"Other",        cost: 7.03,  pct: 0.183, color: "#888"},
  ],
  finance: {
    revenuecatGross: 5510.57,
    appleNet: 2418.33,    // after 15% take
    googleNet: 2265.66,   // after 15% take
    appleRefunds: -42.18,
    googleRefunds: -28.56,
    revenuecatFee: 0,    // still under MTR cap
    nextApplePayout: "May 28",
    nextGooglePayout: "May 15",
    appleRevByCountry: [
      {c:"US", v: 1782.44}, {c:"CA", v: 312.91}, {c:"UK", v: 198.42},
      {c:"AU", v: 92.18}, {c:"DE", v: 33.38},
    ],
  },
  questions: {
    bySupercategory: [
      {name:"Entertainment",   total: 14082, used: 4218},
      {name:"Sports & Leisure", total: 12104, used: 3804},
      {name:"History",         total: 11521, used: 2987},
      {name:"Geography",       total: 10889, used: 2641},
      {name:"Science & Nature",total: 10412, used: 2832},
      {name:"Art & Culture",   total: 11304, used: 2422},
    ],
    byDifficulty: [
      {d:1, count: 13218, used: 4012},
      {d:2, count: 16842, used: 4533},
      {d:3, count: 18923, used: 5104},
      {d:4, count: 13098, used: 3387},
      {d:5, count:  8231, used: 1868},
    ],
  },
};

// Augment each bar with geo (from IP at pairing) and TV count
const BAR_GEO = {
  "BR7X9": {state:"NC", zip:"28712", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:2, lastSeen:"2h ago"},
  "K3M2L": {state:"NC", zip:"28712", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"1d ago"},
  "P9D4F": {state:"NC", zip:"28712", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:3, lastSeen:"3h ago"},
  "X2N7T": {state:"NC", zip:"28712", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"5h ago"},
  "Q8R5A": {state:"NC", zip:"28712", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"2d ago"},
  "M4V1B": {state:"NC", zip:"28739", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:2, lastSeen:"4h ago"},
  "L7H3J": {state:"NC", zip:"28739", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"6h ago"},
  "Z6K9C": {state:"NC", zip:"28694", dma:"Charlotte",                                  tvs:1, lastSeen:"1d ago"},
  "F2W8E": {state:"NC", zip:"28717", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"3d ago"},
  "T5G1U": {state:"NC", zip:"28801", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:2, lastSeen:"4d ago"},
  "Y8B6N": {state:"NC", zip:"28801", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"6d ago"},
  "D3S9O": {state:"NC", zip:"28801", dma:"Greenville-Spartanburg-Asheville-Anderson", tvs:1, lastSeen:"8d ago"},
};

// Signage / impression mock data
const SIGNAGE = {
  totals: {
    impressions: 184_722,        // last 30 days
    audienceSeconds: 2_184_310,  // impressions × duration × concurrent_players
    activeTvs: 17,               // TVs that reported in last 24h
    totalTvs: 21,                // all paired TVs across 47 bars
    avgConcurrent: 11.8,
    peakConcurrent: 38,
    impressionsByContext: [
      {context:"between_rounds", label:"Between rounds",  count: 71_204, color: C.gold,    audienceWeighted: 0.42},
      {context:"game_lobby",     label:"Lobby (waiting)", count: 18_612, color: C.cyan,    audienceWeighted: 0.11},
      {context:"results",        label:"End-of-game",     count: 12_088, color: C.green,   audienceWeighted: 0.09},
      {context:"off_hours_idle", label:"Off-hours idle",  count: 82_818, color: C.purple,  audienceWeighted: 0.0},
    ],
  },
  // Hour-of-day × day-of-week heatmap, in BAR-LOCAL time
  // 5 PM - 5 AM window only (12 cells per day). Values = audience-seconds.
  heatmap: (() => {
    // Each row is a day (Mon-Sun), each col is a local hour 17-04
    const hours = [17,18,19,20,21,22,23,0,1,2,3,4];
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    // Pattern: Tue/Wed/Thu evenings strongest (trivia nights), Fri/Sat broader
    const pattern = [
      [4200, 8400,12000,14200,11800, 9200, 6400, 3800, 2200, 1400,  900,  500], // Mon
      [6200,18000,32000,41000,38000,28000,16000, 8200, 4400, 2200, 1100,  600], // Tue
      [7800,22000,38000,46000,42000,32000,18000, 9100, 4800, 2400, 1200,  700], // Wed
      [8400,24000,40000,48000,44000,34000,20000,10200, 5400, 2700, 1400,  800], // Thu
      [5800,16000,28000,36000,40000,38000,32000,22000,12000, 6400, 3200, 1800], // Fri
      [4200,12000,22000,30000,38000,40000,38000,30000,18000, 9200, 4800, 2400], // Sat
      [3200, 8400,14000,18000,18000,14000, 9200, 5400, 2800, 1600,  800,  400], // Sun
    ];
    return {hours, days, values: pattern};
  })(),
  // Inventory by region (state + DMA)
  byState: [
    {state:"NC", bars: 47, tvs: 21, impressions: 184_722, audienceSeconds: 2_184_310},
  ],
  byDMA: [
    {dma:"Greenville-Spartanburg-Asheville-Anderson", rank:38, bars: 46, tvs: 20, impressions: 178_104, audienceSeconds: 2_098_412},
    {dma:"Charlotte",                                  rank:22, bars:  1, tvs:  1, impressions:   6_618, audienceSeconds:    85_898},
  ],
  // Audience size buckets — what would inventory look like if sold by audience threshold?
  audienceBuckets: [
    {label:"5+ players",   threshold: 5,  impressions: 132_410, pct: 0.717},
    {label:"10+ players",  threshold:10,  impressions:  84_320, pct: 0.456},
    {label:"15+ players",  threshold:15,  impressions:  41_188, pct: 0.223},
    {label:"20+ players",  threshold:20,  impressions:  18_604, pct: 0.101},
    {label:"30+ players",  threshold:30,  impressions:   3_120, pct: 0.017},
  ],
  // Daypart breakdown (in EST window)
  dayparts: [
    {label:"Early evening", range:"5-7 PM ET",  pct:0.18, audienceSeconds:  393_175},
    {label:"Prime",         range:"7-10 PM ET", pct:0.51, audienceSeconds: 1_113_998},
    {label:"Late night",    range:"10 PM-1 AM", pct:0.24, audienceSeconds:   524_234},
    {label:"After hours",   range:"1-5 AM ET",  pct:0.07, audienceSeconds:   152_902},
  ],
  // Data quality issues — what's missing or broken
  dataQuality: [
    {label:"TVs heartbeating in last 24h",  good: 17, total: 21, kind:"good"},
    {label:"Impressions w/ concurrent_players",   good: 184_722, total: 184_722, kind:"good"},
    {label:"Bars with geo (state/zip) resolved",  good: 47, total: 47, kind:"good"},
    {label:"Bars with DMA derived",               good: 47, total: 47, kind:"good"},
    {label:"Off-hours impressions captured",      good: 82_818, total: 82_818, kind:"info"},
  ],
};

// ─── Atoms ─────────────────────────────────────────────────────────────────
const Panel = ({children, style, delay=0, className=""}) => (
  <div className={`panel ${className}`} style={{
    background: C.grad.panel,
    border: `1px solid ${C.w(0.06)}`,
    borderRadius: 16,
    padding: 24,
    backdropFilter: "blur(10px)",
    animationDelay: `${delay}s`,
    ...style,
  }}>{children}</div>
);

const Stat = ({label, value, sub, accent, icon, big, delay=0, trend, compare}) => {
  // compare: {value, label} → renders comparison delta
  let computedTrend = trend;
  if (compare && compare.value !== undefined && typeof value === "string") {
    const num = parseFloat(value.replace(/[^0-9.-]/g,""));
    const prev = compare.value;
    if (!isNaN(num) && prev > 0) computedTrend = (num - prev) / prev;
  }
  return (
  <Panel delay={delay} style={{padding: big?28:22}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: big?14:10}}>
      <div style={{fontSize:11, fontWeight:600, color: C.w(0.45), letterSpacing:.8, textTransform:"uppercase"}}>{label}</div>
      {icon && <div style={{
        width:32,height:32,borderRadius:10,
        background: accent || C.grad.purple,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:14,
      }}>{icon}</div>}
    </div>
    <div style={{
      fontFamily:"'Fredoka',sans-serif",
      fontSize: big?38:30,
      fontWeight:700, color:"#fff", lineHeight:1, letterSpacing:-1,
    }}>{value}</div>
    {(sub || computedTrend !== undefined || compare) && (
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
        {computedTrend !== undefined && (
          <div style={{
            display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:6,
            background: computedTrend >= 0 ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)",
            color: computedTrend >= 0 ? C.green : C.red, fontSize:11, fontWeight:700,
          }}>
            {computedTrend >= 0 ? "▲" : "▼"} {Math.abs(computedTrend*100).toFixed(1)}%
          </div>
        )}
        {sub && <div style={{fontSize:12, color: C.w(0.45), fontWeight:500}}>{sub}</div>}
        {compare && compare.label && (
          <div style={{fontSize:11, color: C.w(0.35), fontWeight:500}}>
            vs <span style={{color:C.gold}}>{compare.label}</span>
          </div>
        )}
      </div>
    )}
  </Panel>
  );
};

const Pill = ({children, color, bg}) => (
  <span style={{
    display:"inline-block", padding:"3px 10px", borderRadius:999,
    fontSize:10, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
    background: bg || C.w(0.06), color: color || C.w(0.7),
    fontFamily:"'Outfit',sans-serif",
  }}>{children}</span>
);

const SectionHeader = ({title, sub, action, live}) => (
  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:18}}>
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:600,color:"#fff",letterSpacing:-.3}}>{title}</div>
        {live && <span className="live" style={{fontSize:10,fontWeight:700,color:C.green,letterSpacing:.6,textTransform:"uppercase"}}>Live</span>}
      </div>
      {sub && <div style={{fontSize:12,color:C.w(0.4),marginTop:3}}>{sub}</div>}
    </div>
    {action}
  </div>
);

// ─── Sparkline / Mini Chart ────────────────────────────────────────────────
// Renders subscriber growth. Data is array of {date, paid, trial}.
// Compare data is optional second series rendered with dashed style.
const SubChart = ({data, compareData}) => {
  const W = 600, H = 120, pad = 8;
  if (!data || data.length === 0) return null;

  // For long ranges, downsample to keep ~40 points max
  const downsample = (arr) => {
    if (arr.length <= 40) return arr;
    const step = Math.ceil(arr.length / 40);
    return arr.filter((_,i) => i % step === 0 || i === arr.length - 1);
  };

  const main = downsample(data);
  const cmp  = compareData ? downsample(compareData) : null;

  const allVals = [
    ...main.map(d => d.paid + d.trial),
    ...(cmp ? cmp.map(d => d.paid + d.trial) : []),
  ];
  const max = Math.max(...allVals) * 1.1 || 1;
  const xStep = (W - pad*2) / Math.max(1, main.length - 1);
  const y = v => H - pad - (v/max) * (H - pad*2);

  const buildPath = (arr, key) => {
    const step = (W - pad*2) / Math.max(1, arr.length - 1);
    return arr.map((d,i) => {
      const v = key === "total" ? (d.paid + d.trial) : d.paid;
      return `${i===0?"M":"L"} ${pad + i*step} ${y(v)}`;
    }).join(" ");
  };

  const paidPath  = buildPath(main, "paid");
  const totalPath = buildPath(main, "total");
  const totalArea = totalPath + ` L ${W-pad} ${H-pad} L ${pad} ${H-pad} Z`;

  // Tick labels — show ~5 across the range
  const tickCount = Math.min(5, main.length);
  const tickStep  = Math.max(1, Math.floor(main.length / tickCount));

  return (
    <svg viewBox={`0 0 ${W} ${H+18}`} style={{width:"100%",height:140,overflow:"visible"}}>
      <defs>
        <linearGradient id="areagrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#764ba2" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#764ba2" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={totalArea} fill="url(#areagrad)"/>
      {cmp && (
        <path d={buildPath(cmp, "total")} fill="none" stroke="#ffd200" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" opacity="0.6"/>
      )}
      <path d={totalPath} fill="none" stroke="#a8334a" strokeWidth="2" strokeLinecap="round"/>
      <path d={paidPath}  fill="none" stroke="#ffd200" strokeWidth="2.5" strokeLinecap="round"/>
      {main.map((d,i) => i % tickStep === 0 && (
        <text
          key={i}
          x={pad+i*xStep}
          y={H+12}
          fontSize="9"
          fill="rgba(255,255,255,0.4)"
          textAnchor="middle"
          fontFamily="DM Mono"
        >{d.d || (d.date && d.date.toLocaleDateString("en-US",{month:"short",day:"numeric"}))}</text>
      ))}
    </svg>
  );
};

// ─── Donut for AWS costs ───────────────────────────────────────────────────
const Donut = ({segments, size=180, total}) => {
  const r = size/2 - 10;
  const c = size/2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        {segments.map((s,i) => {
          const dash = circ * s.pct;
          const offset = circ * acc;
          acc += s.pct;
          return (
            <circle
              key={i}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              opacity="0.9"
            />
          );
        })}
      </svg>
      <div style={{
        position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
      }}>
        <div style={{fontSize:10,color:C.w(0.4),letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>This Month</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:30,fontWeight:700,color:"#fff",lineHeight:1.1}}>${total.toFixed(2)}</div>
        <div style={{fontSize:11,color:C.w(0.4),marginTop:2}}>AWS spend</div>
      </div>
    </div>
  );
};

// ─── Date Range Control ───────────────────────────────────────────────────
const DateControl = ({range, setRange, compare, setCompare, customRange, setCustomRange}) => {
  const [open, setOpen] = useState(false);
  const window = range === "custom" ? customRange : rangeWindow(range);
  const activeRange = RANGES.find(r => r.key === range);
  const activeCompare = COMPARE_MODES.find(c => c.key === compare);

  return (
    <div style={{position:"relative"}}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"8px 14px",borderRadius:9,
          background: open ? C.w(0.08) : C.w(0.04),
          border:`1px solid ${open ? C.w(0.15) : C.w(0.08)}`,
          color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",
          fontFamily:"'Outfit',sans-serif",
        }}
      >
        <span style={{fontSize:13}}>📅</span>
        <span>{activeRange.label}</span>
        {compare !== "none" && (
          <span style={{
            padding:"2px 7px",borderRadius:5,
            background:"rgba(255,210,0,0.15)",color:C.gold,
            fontSize:10,fontWeight:700,letterSpacing:.4,
          }}>vs {compare === "yoy" ? "YoY" : "Prev"}</span>
        )}
        <span style={{color:C.w(0.4),fontSize:10}}>▾</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{position:"fixed",inset:0,zIndex:50}}
          />
          <div style={{
            position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:51,
            width:340,padding:18,
            background:"rgba(15,3,38,0.96)",
            border:`1px solid ${C.w(0.1)}`,
            borderRadius:14,
            backdropFilter:"blur(20px)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
            animation:"fadeUp .15s ease-out both",
          }}>
            <div style={{fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.8,textTransform:"uppercase",marginBottom:10}}>Range</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:18}}>
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setRange(r.key); if (r.key !== "custom") setOpen(false); }}
                  style={{
                    padding:"9px 12px",borderRadius:8,
                    background: range === r.key ? C.grad.purple : C.w(0.04),
                    border: `1px solid ${range === r.key ? "transparent" : C.w(0.06)}`,
                    color: range === r.key ? "#fff" : C.w(0.7),
                    fontSize:12,fontWeight:600,cursor:"pointer",
                    fontFamily:"'Outfit',sans-serif",textAlign:"left",
                  }}
                >{r.label}</button>
              ))}
            </div>

            {range === "custom" && (
              <div style={{marginBottom:18,padding:12,background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.06)}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,marginBottom:4}}>From</div>
                    <input
                      type="date"
                      value={customRange.start.toISOString().split("T")[0]}
                      onChange={e => setCustomRange({...customRange, start: new Date(e.target.value)})}
                      style={{width:"100%",padding:"8px 10px",background:C.w(0.04),border:`1px solid ${C.w(0.08)}`,borderRadius:6,color:"#fff",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none"}}
                    />
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,marginBottom:4}}>To</div>
                    <input
                      type="date"
                      value={customRange.end.toISOString().split("T")[0]}
                      onChange={e => setCustomRange({...customRange, end: new Date(e.target.value)})}
                      style={{width:"100%",padding:"8px 10px",background:C.w(0.04),border:`1px solid ${C.w(0.08)}`,borderRadius:6,color:"#fff",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none"}}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.8,textTransform:"uppercase",marginBottom:10}}>Compare to</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:14}}>
              {COMPARE_MODES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCompare(c.key)}
                  style={{
                    padding:"9px 12px",borderRadius:8,
                    background: compare === c.key ? "rgba(255,210,0,0.12)" : "transparent",
                    border: `1px solid ${compare === c.key ? "rgba(255,210,0,0.25)" : C.w(0.06)}`,
                    color: compare === c.key ? C.gold : C.w(0.7),
                    fontSize:12,fontWeight:600,cursor:"pointer",
                    fontFamily:"'Outfit',sans-serif",textAlign:"left",
                    display:"flex",alignItems:"center",gap:8,
                  }}
                >
                  <span style={{
                    width:14,height:14,borderRadius:"50%",
                    border:`1.5px solid ${compare===c.key?C.gold:C.w(0.2)}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    {compare===c.key && <span style={{width:6,height:6,borderRadius:"50%",background:C.gold}}/>}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>

            <div style={{
              padding:10,background:C.w(0.03),borderRadius:8,
              border:`1px solid ${C.w(0.05)}`,
              fontSize:11,color:C.w(0.5),fontFamily:"'DM Mono',monospace",lineHeight:1.5,
            }}>
              <div>Showing: <span style={{color:"#fff"}}>{fmtRange(window)}</span></div>
              {activeCompare.key !== "none" && (
                <div style={{marginTop:4}}>vs: <span style={{color:C.gold}}>{fmtRange(compareWindow(window, compare))}</span></div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Topbar ────────────────────────────────────────────────────────────────
const Topbar = ({tab, setTab, range, setRange, compare, setCompare, customRange, setCustomRange}) => {
  const tabs = ["Overview", "Subscribers", "Bars", "Signage", "Finance", "Questions", "AWS"];
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"22px 32px",
      borderBottom: `1px solid ${C.w(0.05)}`,
      background:"rgba(15,3,38,0.6)",
      backdropFilter:"blur(14px)",
      position:"sticky",top:0,zIndex:10,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:34,height:34,borderRadius:9,
            background: C.grad.gold,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18, boxShadow:"0 4px 14px rgba(255,210,0,0.3)",
          }}>🧠</div>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:17,fontWeight:600,color:"#fff",letterSpacing:-.3,lineHeight:1}}>TapTrivia</div>
            <div style={{fontSize:10,color:C.w(0.4),letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginTop:2}}>Operator Console</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {tabs.map(t => (
            <button
              key={t}
              className={`tab ${tab===t?"active":""}`}
              onClick={() => setTab(t)}
              style={{
                background:"transparent", border:"none", cursor:"pointer",
                padding:"8px 14px", borderRadius:8,
                fontSize:13, fontWeight:600, fontFamily:"'Outfit',sans-serif",
                color: tab===t ? "#fff" : C.w(0.45),
              }}
            >{t}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <DateControl
          range={range} setRange={setRange}
          compare={compare} setCompare={setCompare}
          customRange={customRange} setCustomRange={setCustomRange}
        />
        <div style={{
          fontSize:11, color: C.w(0.4), fontFamily:"'DM Mono',monospace",
          padding:"6px 12px", background: C.w(0.04), borderRadius:8,
          border:`1px solid ${C.w(0.06)}`,
        }}>
          <span style={{color:C.green}}>●</span> Synced 2 min ago
        </div>
        <button style={{
          padding:"8px 14px",borderRadius:9, border:`1px solid ${C.w(0.1)}`,
          background:C.w(0.04), color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer",
          fontFamily:"'Outfit',sans-serif",
        }}>↻ Refresh</button>
        <div style={{
          width:36,height:36,borderRadius:"50%",
          background: C.grad.purple,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:"#fff", fontWeight:700, fontSize:14, fontFamily:"'Outfit',sans-serif",
        }}>A</div>
      </div>
    </div>
  );
};

// ─── OVERVIEW TAB ──────────────────────────────────────────────────────────
const OverviewTab = ({setTab, setBarDrill, range, compare, customRange}) => {
  const d = mockData.overview;
  const window  = range === "custom" ? customRange : rangeWindow(range);
  const cmpWin  = compareWindow(window, compare);

  // Slice revenue + AWS by window
  const slice    = useMemo(() => sliceMonthly(window), [window.start.getTime(), window.end.getTime()]);
  const cmpSlice = useMemo(() => cmpWin ? sliceMonthly(cmpWin) : null, [cmpWin?.start.getTime(), cmpWin?.end.getTime()]);
  const agg      = aggregateRevenue(slice);
  const cmpAgg   = cmpSlice ? aggregateRevenue(cmpSlice) : null;

  // Subscriber timeline filtered by window
  const subSlice = useMemo(() => mockData.subDaily.filter(p => p.date >= window.start && p.date <= window.end), [window.start.getTime(), window.end.getTime()]);
  const cmpSubSlice = useMemo(() => cmpWin ? mockData.subDaily.filter(p => p.date >= cmpWin.start && p.date <= cmpWin.end) : null, [cmpWin?.start.getTime(), cmpWin?.end.getTime()]);

  // Map daily snapshots into chart shape
  const chartData = subSlice.map(p => ({date: p.date, paid: p.paid, trial: p.trial}));
  const chartCmp  = cmpSubSlice ? cmpSubSlice.map(p => ({date: p.date, paid: p.paid, trial: p.trial})) : null;

  const cmpLabel = compare === "yoy" ? "same period LY" : compare === "prev" ? "prior period" : null;
  const isMTD = range === "mtd";

  return (
    <div style={{padding:"28px 32px"}}>
      {/* Hero KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat
          label="Total Users"
          value={d.totalUsers.toLocaleString()}
          sub={`${d.paidSubs.toLocaleString()} paid · ${d.trialUsers} trial · ${d.free.toLocaleString()} free`}
          accent={C.grad.purple} icon="👥" big delay={0}
        />
        <Stat
          label={isMTD ? "Net MRR" : "Net Revenue"}
          value={`$${agg.net.toLocaleString(undefined,{maximumFractionDigits:0})}`}
          sub={isMTD ? `Gross $${agg.gross.toFixed(0)} · after store fees` : `${slice.length} months · after store fees`}
          accent={C.grad.gold} icon="💰" big
          compare={cmpAgg ? {value: cmpAgg.net, label: cmpLabel} : null}
          delay={0.05}
        />
        <Stat
          label="Active Bars"
          value={d.activeBars}
          sub={`${d.pendingBars} pending activation`}
          accent={C.grad.green} icon="🍻" big delay={0.1}
        />
        <Stat
          label={isMTD ? "AWS This Month" : "AWS Spend"}
          value={`$${agg.aws.toFixed(2)}`}
          sub={`Margin: ${agg.net > 0 ? (((agg.net - agg.aws)/agg.net)*100).toFixed(1) : "0"}%`}
          accent={C.grad.cyan} icon="☁️" big
          compare={cmpAgg ? {value: cmpAgg.aws, label: cmpLabel} : null}
          delay={0.15}
        />
      </div>

      {/* Subscriber Trend */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.2}>
          <SectionHeader
            title="Subscriber Growth"
            sub={`${fmtRange(window)} · ${chartData.length} days`}
            live
            action={
              <div style={{display:"flex",gap:14,fontSize:11,fontWeight:600,color:C.w(0.6)}}>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:C.gold}}/>Paid</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:"#a8334a"}}/>Total</span>
                {chartCmp && <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:0,borderTop:`1.5px dashed ${C.gold}`,opacity:0.6}}/>{cmpLabel}</span>}
              </div>
            }
          />
          <SubChart data={chartData} compareData={chartCmp}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:18,paddingTop:18,borderTop:`1px solid ${C.w(0.05)}`}}>
            <MiniStat label="New today" value={`+${d.newSubsToday}`} trend={d.newSubsTrend}/>
            <MiniStat label="Trial conversion" value={`${(d.trialConversion*100).toFixed(0)}%`} good={d.trialConversion >= 0.5}/>
            <MiniStat label="Churn (30d)" value={`${(d.churnRate*100).toFixed(1)}%`} good={d.churnRate < 0.05}/>
            <MiniStat label="LTV est." value="$78.40" sub="@ avg 26mo retention"/>
          </div>
        </Panel>

        <Panel delay={0.25}>
          <SectionHeader title="Question Bank" sub={`Round ${d.currentRound} of ∞`}/>
          <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:18}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:42,fontWeight:700,color:"#fff",lineHeight:1}}>{d.questionsTotal.toLocaleString()}</div>
            <div style={{fontSize:12,color:C.w(0.45),paddingBottom:6}}>questions live</div>
          </div>
          <div style={{height:8,background:C.w(0.06),borderRadius:4,overflow:"hidden",marginBottom:8}}>
            <div style={{
              height:"100%",
              width:`${(d.questionsUsed/d.questionsTotal)*100}%`,
              background: C.grad.gold,
              borderRadius:4,
            }}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.w(0.5),marginBottom:18}}>
            <span><strong style={{color:"#fff"}}>{d.questionsUsed.toLocaleString()}</strong> used</span>
            <span><strong style={{color:"#fff"}}>{(d.questionsTotal - d.questionsUsed).toLocaleString()}</strong> never served</span>
          </div>
          <div style={{
            padding:14, background:C.w(0.03), borderRadius:10,
            border:`1px solid ${C.w(0.06)}`, fontSize:12, color:C.w(0.6), lineHeight:1.5,
          }}>
            At current pace, round 1 completes in <strong style={{color:C.gold}}>~{Math.ceil(d.nextRoundStartsAt/1000)}k</strong> more games before any question repeats.
          </div>
          <button onClick={() => setTab("Questions")} style={{
            width:"100%", marginTop:14, padding:"10px",
            background:"transparent", border:`1px solid ${C.w(0.1)}`,
            borderRadius:9, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer",
            fontFamily:"'Outfit',sans-serif",
          }}>Drill into bank →</button>
        </Panel>
      </div>

      {/* Top bars + AWS donut */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <Panel delay={0.3}>
          <SectionHeader
            title="Top Bars by Player Volume"
            sub="Click any row to drill in"
            action={
              <button onClick={()=>setTab("Bars")} style={{
                background:"transparent",border:"none",cursor:"pointer",
                fontSize:12,fontWeight:600,color:C.gold,fontFamily:"'Outfit',sans-serif",
              }}>View all 47 →</button>
            }
          />
          <Table>
            <THead cols={["Bar","Code","City","Players","Games (mo)","MRR","Last","Status"]}/>
            {mockData.bars.slice(0,6).map((b,i) => (
              <BarRow key={b.code} bar={b} delay={i*0.03} onClick={() => { setBarDrill(b); setTab("Bars"); }}/>
            ))}
          </Table>
        </Panel>

        <Panel delay={0.35}>
          <SectionHeader title="AWS Cost Mix" sub="Month to date"/>
          <div style={{display:"flex",justifyContent:"center",margin:"8px 0 18px"}}>
            <Donut segments={mockData.awsCosts} total={mockData.overview.awsThisMonth}/>
          </div>
          <div className="scrollbar" style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto"}}>
            {mockData.awsCosts.map(s => (
              <div key={s.service} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px"}}>
                <div style={{width:10,height:10,borderRadius:3,background:s.color}}/>
                <div style={{flex:1,fontSize:12,fontWeight:500,color:C.w(0.7)}}>{s.service}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.w(0.5)}}>{(s.pct*100).toFixed(1)}%</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff",minWidth:50,textAlign:"right"}}>${s.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const MiniStat = ({label, value, sub, trend, good}) => (
  <div>
    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:4}}>{label}</div>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:good===false?C.red:good===true?C.green:"#fff",lineHeight:1}}>{value}</div>
      {trend !== undefined && (
        <span style={{fontSize:10,fontWeight:700,color:trend>=0?C.green:C.red}}>{trend>=0?"▲":"▼"}{Math.abs(trend*100).toFixed(0)}%</span>
      )}
    </div>
    {sub && <div style={{fontSize:10,color:C.w(0.35),marginTop:3}}>{sub}</div>}
  </div>
);

// ─── Reusable table primitives ─────────────────────────────────────────────
const Table = ({children}) => (
  <div style={{display:"flex",flexDirection:"column"}}>{children}</div>
);

const THead = ({cols}) => (
  <div style={{
    display:"grid",
    gridTemplateColumns:`2fr 0.8fr 1.3fr 0.7fr 0.8fr 0.8fr 0.7fr 0.8fr`,
    gap:12, padding:"10px 12px",
    fontSize:10, fontWeight:700, color:C.w(0.4), letterSpacing:.8, textTransform:"uppercase",
    borderBottom:`1px solid ${C.w(0.05)}`,
  }}>
    {cols.map(c => <div key={c}>{c}</div>)}
  </div>
);

const BarRow = ({bar, delay=0, onClick}) => {
  const statusMap = {
    active: {color:C.green, bg:"rgba(0,212,170,0.1)", label:"Active"},
    slow:   {color:C.gold,  bg:"rgba(255,210,0,0.1)", label:"Slow"},
    dormant:{color:C.red,   bg:"rgba(255,71,87,0.1)", label:"Dormant"},
  };
  const s = statusMap[bar.status];
  return (
    <div
      className="row clickable panel"
      onClick={onClick}
      style={{
        display:"grid",
        gridTemplateColumns:`2fr 0.8fr 1.3fr 0.7fr 0.8fr 0.8fr 0.7fr 0.8fr`,
        gap:12, padding:"14px 12px",
        fontSize:13, color:"#fff",
        borderBottom:`1px solid ${C.w(0.04)}`,
        animationDelay:`${delay}s`,
      }}
    >
      <div style={{fontWeight:600}}>{bar.name}</div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.gold,fontWeight:600}}>{bar.code}</div>
      <div style={{fontSize:12,color:C.w(0.55)}}>{bar.city}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700}}>{bar.players}</div>
      <div style={{fontSize:12,color:C.w(0.6)}}>{bar.gamesMonth}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,color:C.gold,fontSize:12}}>${bar.mrrAttr.toFixed(0)}</div>
      <div style={{fontSize:11,color:C.w(0.4)}}>{bar.lastGame}</div>
      <div><Pill color={s.color} bg={s.bg}>{s.label}</Pill></div>
    </div>
  );
};

// ─── BARS TAB ──────────────────────────────────────────────────────────────
const BarsTab = ({drillBar, setDrillBar}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return mockData.bars.filter(b => {
      const matchesSearch = !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        b.city.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  if (drillBar) return <BarDrillIn bar={drillBar} onBack={() => setDrillBar(null)}/>;

  const totalPlayers = mockData.bars.reduce((s,b) => s + b.players, 0);
  const totalGames = mockData.bars.reduce((s,b) => s + b.gamesMonth, 0);
  const totalAttrMrr = mockData.bars.reduce((s,b) => s + b.mrrAttr, 0);

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Total Bars" value="47" sub="6 pending" accent={C.grad.green} icon="🍻" delay={0}/>
        <Stat label="Total Players (mo)" value={totalPlayers.toLocaleString()} sub="across all venues" accent={C.grad.purple} icon="👥" delay={0.05}/>
        <Stat label="Games Played (mo)" value={totalGames} sub="avg 6.5 per active bar" accent={C.grad.cyan} icon="🎮" delay={0.1}/>
        <Stat label="Bar-Attributed MRR" value={`$${totalAttrMrr.toFixed(0)}`} sub="patrons subscribed at venue" accent={C.grad.gold} icon="💰" delay={0.15}/>
      </div>

      <Panel delay={0.2}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,gap:14,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:600,color:"#fff",letterSpacing:-.3}}>All Bars</div>
            <div style={{fontSize:12,color:C.w(0.4),marginTop:3}}>{filtered.length} of {mockData.bars.length} bars</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bar, code, city..."
              style={{
                background:C.w(0.04),border:`1px solid ${C.w(0.08)}`,
                borderRadius:9,padding:"9px 14px",color:"#fff",fontSize:13,
                fontFamily:"'Outfit',sans-serif",outline:"none",width:240,
              }}
            />
            <div style={{display:"flex",gap:4,padding:3,background:C.w(0.04),borderRadius:9}}>
              {["all","active","slow","dormant"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding:"6px 12px",borderRadius:6,border:"none",cursor:"pointer",
                    fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",
                    textTransform:"capitalize",
                    background: statusFilter===s ? C.w(0.1) : "transparent",
                    color: statusFilter===s ? "#fff" : C.w(0.5),
                  }}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
        <Table>
          <THead cols={["Bar","Code","City","Players","Games (mo)","MRR","Last","Status"]}/>
          {filtered.map((b,i) => (
            <BarRow key={b.code} bar={b} delay={i*0.02} onClick={() => setDrillBar(b)}/>
          ))}
        </Table>
      </Panel>
    </div>
  );
};

// ─── Bar Drill-In ──────────────────────────────────────────────────────────
const BarDrillIn = ({bar, onBack}) => {
  const geo = BAR_GEO[bar.code] || {state:"—", zip:"—", dma:"—", tvs:1, lastSeen:"unknown"};
  // simulated player roster
  const players = [
    {name:"Mike T.",       sub:"paid",  joined:"Mar 12", games: 18, lastGame:"2h ago"},
    {name:"Sarah K.",      sub:"paid",  joined:"Mar 18", games: 15, lastGame:"2h ago"},
    {name:"DJ Phantom",    sub:"paid",  joined:"Feb 04", games: 31, lastGame:"5h ago"},
    {name:"BeerNerd42",    sub:"trial", joined:"Apr 28", games: 3,  lastGame:"2h ago"},
    {name:"Trivia Queen",  sub:"paid",  joined:"Jan 22", games: 42, lastGame:"2h ago"},
    {name:"Ron",           sub:"free",  joined:"Apr 30", games: 1,  lastGame:"2h ago"},
    {name:"Jess M.",       sub:"trial", joined:"Apr 26", games: 4,  lastGame:"1d ago"},
    {name:"Carl",          sub:"paid",  joined:"Mar 02", games: 22, lastGame:"5h ago"},
  ];

  const subColors = {
    paid:  {color:C.gold,   bg:"rgba(255,210,0,0.1)"},
    trial: {color:C.cyan,   bg:"rgba(79,172,254,0.1)"},
    free:  {color:C.w(0.5), bg:C.w(0.05)},
  };

  return (
    <div style={{padding:"28px 32px"}}>
      <button onClick={onBack} style={{
        background:"transparent",border:"none",cursor:"pointer",
        color:C.w(0.5),fontSize:13,fontWeight:600,marginBottom:14,
        fontFamily:"'Outfit',sans-serif",padding:"4px 0",
      }}>← All Bars</button>

      <Panel delay={0} style={{padding:28,marginBottom:14,background:`linear-gradient(135deg, rgba(118,75,162,0.18), rgba(168,51,74,0.18))`,border:`1px solid ${C.w(0.1)}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",letterSpacing:-.5}}>{bar.name}</div>
              <Pill color={C.green} bg="rgba(0,212,170,0.15)">{bar.status}</Pill>
            </div>
            <div style={{fontSize:14,color:C.w(0.55),display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
              <span>📍 {bar.city}</span>
              <span style={{fontFamily:"'DM Mono',monospace",color:C.gold,fontWeight:600}}>{bar.code}</span>
              <span>📺 {geo.tvs} TV{geo.tvs !== 1 ? "s" : ""}</span>
              <span style={{color:C.w(0.4),fontSize:12}}>· {geo.zip} · DMA #{geo.dma === "Charlotte" ? "22" : "38"}</span>
              <span>Last game {bar.lastGame}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:24}}>
            <DrillStat label="Players" value={bar.players}/>
            <DrillStat label="Games (mo)" value={bar.gamesMonth}/>
            <DrillStat label="Attributed MRR" value={`$${bar.mrrAttr.toFixed(0)}`} accent={C.gold}/>
          </div>
        </div>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Paid Subscribers" value={players.filter(p=>p.sub==="paid").length} sub="from this venue" accent={C.grad.gold} delay={0.05}/>
        <Stat label="On Trial" value={players.filter(p=>p.sub==="trial").length} sub="≤7 days remaining" accent={C.grad.cyan} delay={0.1}/>
        <Stat label="Free Players" value={players.filter(p=>p.sub==="free").length} sub="haven't subscribed" accent={C.grad.purple} delay={0.15}/>
        <Stat label="Avg Game Size" value="14.2" sub="players per game" accent={C.grad.green} delay={0.2}/>
      </div>

      <Panel delay={0.25}>
        <SectionHeader title="Player Roster" sub="All patrons who have played here, ever"/>
        <div style={{
          display:"grid",
          gridTemplateColumns:"2fr 0.8fr 0.8fr 0.6fr 0.8fr",
          gap:12, padding:"10px 12px",
          fontSize:10, fontWeight:700, color:C.w(0.4), letterSpacing:.8, textTransform:"uppercase",
          borderBottom:`1px solid ${C.w(0.05)}`,
        }}>
          <div>Player</div><div>Subscription</div><div>First Joined</div><div>Games</div><div>Last Played</div>
        </div>
        {players.map((p,i) => {
          const s = subColors[p.sub];
          return (
            <div key={i} className="row" style={{
              display:"grid",gridTemplateColumns:"2fr 0.8fr 0.8fr 0.6fr 0.8fr",
              gap:12,padding:"14px 12px",fontSize:13,color:"#fff",
              borderBottom:`1px solid ${C.w(0.04)}`,
              animation:`fadeUp .3s ease-out ${i*0.03}s both`,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:30,height:30,borderRadius:"50%",
                  background:`linear-gradient(135deg,hsl(${p.name.charCodeAt(0)*5},65%,52%),hsl(${p.name.charCodeAt(0)*5+40},65%,42%))`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:700,fontSize:13,
                }}>{p.name[0]}</div>
                <span style={{fontWeight:600}}>{p.name}</span>
              </div>
              <div><Pill color={s.color} bg={s.bg}>{p.sub}</Pill></div>
              <div style={{fontSize:12,color:C.w(0.5)}}>{p.joined}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700}}>{p.games}</div>
              <div style={{fontSize:12,color:C.w(0.5)}}>{p.lastGame}</div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

const DrillStat = ({label, value, accent}) => (
  <div style={{textAlign:"right"}}>
    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:4}}>{label}</div>
    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:26,fontWeight:700,color:accent||"#fff",lineHeight:1}}>{value}</div>
  </div>
);

// ─── SUBSCRIBERS TAB ───────────────────────────────────────────────────────
const SubscribersTab = () => {
  const d = mockData.overview;
  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Active Paid" value={d.paidSubs.toLocaleString()} sub={`@ $2.99/mo`} accent={C.grad.gold} icon="💎" big delay={0}/>
        <Stat label="In Trial" value={d.trialUsers} sub="7-day free trial" accent={C.grad.cyan} icon="⏱" big delay={0.05}/>
        <Stat label="Free Players" value={d.free.toLocaleString()} sub="never subscribed" accent={C.grad.purple} icon="👤" big delay={0.1}/>
        <Stat label="Trial → Paid" value={`${(d.trialConversion*100).toFixed(0)}%`} sub="last 30 days" accent={C.grad.green} icon="📈" big delay={0.15}/>
      </div>

      <Panel delay={0.2} style={{marginBottom:14}}>
        <SectionHeader title="Subscriber Funnel" sub="Where players are in the lifecycle" live/>
        <FunnelChart/>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Panel delay={0.25}>
          <SectionHeader title="Recent Subscriptions" sub="Live from RevenueCat"/>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {[
              {name:"Mike T.", bar:"BR7X9", store:"App Store", t:"4 min ago", type:"new"},
              {name:"BeerNerd42", bar:"BR7X9", store:"Play Store", t:"22 min ago", type:"trial"},
              {name:"Carl", bar:"K3M2L", store:"App Store", t:"1h ago", type:"renew"},
              {name:"Sarah K.", bar:"P9D4F", store:"App Store", t:"2h ago", type:"new"},
              {name:"Anonymous", bar:"X2N7T", store:"Play Store", t:"3h ago", type:"churn"},
              {name:"Jess M.", bar:"BR7X9", store:"App Store", t:"4h ago", type:"trial"},
            ].map((e,i) => {
              const types = {
                new:   {icon:"💎", label:"New paid", color:C.green},
                trial: {icon:"⏱", label:"Started trial", color:C.cyan},
                renew: {icon:"↻", label:"Renewed", color:C.gold},
                churn: {icon:"✕", label:"Churned", color:C.red},
              };
              const t = types[e.type];
              return (
                <div key={i} className="row" style={{
                  display:"flex",alignItems:"center",gap:12,padding:"12px 8px",
                  borderBottom:`1px solid ${C.w(0.04)}`,
                  animation:`fadeUp .3s ease-out ${i*0.04}s both`,
                }}>
                  <div style={{width:32,height:32,borderRadius:8,background:C.w(0.06),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{t.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{e.name}</div>
                    <div style={{fontSize:11,color:C.w(0.4)}}>{t.label} · {e.store} · <span style={{fontFamily:"'DM Mono',monospace",color:C.gold}}>{e.bar}</span></div>
                  </div>
                  <div style={{fontSize:11,color:C.w(0.4)}}>{e.t}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel delay={0.3}>
          <SectionHeader title="Platform Split" sub="iOS vs Android subscriber distribution"/>
          <PlatformBars/>
          <div style={{marginTop:18,padding:14,background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.06)}`,fontSize:12,color:C.w(0.6),lineHeight:1.5}}>
            iOS subscribers contribute <strong style={{color:C.gold}}>52%</strong> of paid users but <strong style={{color:C.gold}}>56%</strong> of revenue — slightly higher retention than Android cohort.
          </div>
        </Panel>
      </div>
    </div>
  );
};

const FunnelChart = () => {
  const stages = [
    {label:"Total Users",       value: 4287, color: C.grad.purple, w: 1.0},
    {label:"Played 1+ Games",   value: 3842, color: "linear-gradient(135deg,#7e60ba,#8a4880)", w: 0.9},
    {label:"Started Trial",     value: 2188, color: C.grad.cyan,   w: 0.51},
    {label:"Active Paid",       value: 1843, color: C.grad.gold,   w: 0.43},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
      {stages.map((s,i) => (
        <div key={s.label} style={{animation:`fadeUp .4s ease-out ${i*0.08}s both`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:C.w(0.7)}}>{s.label}</span>
            <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{s.value.toLocaleString()} <span style={{color:C.w(0.4),fontWeight:500,fontSize:11}}>({(s.w*100).toFixed(0)}%)</span></span>
          </div>
          <div style={{
            height:36, width:`${s.w*100}%`, background:s.color, borderRadius:8,
            display:"flex",alignItems:"center",paddingLeft:14,
            transition:"all .3s",
          }}>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>{s.value.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const PlatformBars = () => {
  const platforms = [
    {name:"iOS (App Store)",   subs: 958, rev: 3085.92, color: "#fff", bgcolor: "rgba(255,255,255,0.85)"},
    {name:"Android (Play)",    subs: 885, rev: 2424.65, color: "#a8e063", bgcolor: "linear-gradient(135deg,#56ab2f,#a8e063)"},
  ];
  const maxRev = Math.max(...platforms.map(p => p.rev));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {platforms.map((p,i) => (
        <div key={p.name} style={{animation:`fadeUp .4s ease-out ${i*0.1}s both`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{p.name}</span>
            <span style={{fontSize:12,color:C.w(0.55)}}>{p.subs} subs · ${p.rev.toFixed(0)}/mo</span>
          </div>
          <div style={{height:10,background:C.w(0.05),borderRadius:5,overflow:"hidden"}}>
            <div style={{
              height:"100%", width:`${(p.rev/maxRev)*100}%`,
              background:p.bgcolor, borderRadius:5,
            }}/>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── FINANCE TAB ───────────────────────────────────────────────────────────
const FinanceTab = ({range, compare, customRange}) => {
  const f = mockData.finance;
  const window  = range === "custom" ? customRange : rangeWindow(range);
  const cmpWin  = compareWindow(window, compare);
  const slice    = useMemo(() => sliceMonthly(window), [window.start.getTime(), window.end.getTime()]);
  const cmpSlice = useMemo(() => cmpWin ? sliceMonthly(cmpWin) : null, [cmpWin?.start.getTime(), cmpWin?.end.getTime()]);
  const agg      = aggregateRevenue(slice);
  const cmpAgg   = cmpSlice ? aggregateRevenue(cmpSlice) : null;
  const totalNet = f.appleNet + f.googleNet + f.appleRefunds + f.googleRefunds;
  const cmpLabel = compare === "yoy" ? "same period LY" : compare === "prev" ? "prior period" : null;

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Gross Revenue" value={`$${agg.gross.toFixed(0)}`} sub={`${slice.length} mo · before any fees`} accent={C.grad.purple} icon="💰" big delay={0}
          compare={cmpAgg ? {value: cmpAgg.gross, label: cmpLabel} : null}/>
        <Stat label="Net Revenue" value={`$${agg.net.toFixed(0)}`} sub="after Apple/Google 15%" accent={C.grad.gold} icon="🏦" big delay={0.05}
          compare={cmpAgg ? {value: cmpAgg.net, label: cmpLabel} : null}/>
        <Stat label="Apple Share" value={`$${(agg.gross * 0.51).toFixed(0)}`} sub="iOS contribution" accent={C.grad.cyan} icon="" big delay={0.1}/>
        <Stat label="Google Share" value={`$${(agg.gross * 0.49).toFixed(0)}`} sub="Android contribution" accent={C.grad.green} icon="▶" big delay={0.15}/>
      </div>

      {/* MoM / YoY heatmap — the canonical "compare months across years" view */}
      <Panel delay={0.18} style={{marginBottom:14}}>
        <SectionHeader
          title="Monthly Revenue Matrix"
          sub="Net revenue by month and year · spot seasonality at a glance"
        />
        <RevenueHeatmap/>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.2}>
          <SectionHeader title="Money Flow" sub="Where the dollars go before they hit your bank"/>
          <FlowDiagram f={f}/>
        </Panel>

        <Panel delay={0.25}>
          <SectionHeader title="Upcoming Payouts"/>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <PayoutCard
              platform="Apple App Store"
              date={f.nextApplePayout}
              amount={f.appleNet + f.appleRefunds}
              icon=""
              days={28}
            />
            <PayoutCard
              platform="Google Play"
              date={f.nextGooglePayout}
              amount={f.googleNet + f.googleRefunds}
              icon="▶"
              days={15}
            />
          </div>
          <div style={{
            marginTop:18,padding:14,background:"rgba(255,210,0,0.06)",
            border:`1px solid rgba(255,210,0,0.15)`,borderRadius:10,
            fontSize:11,color:C.w(0.6),lineHeight:1.5,
          }}>
            <strong style={{color:C.gold}}>Heads up:</strong> Apple holds funds 30 days. Google pays monthly. Always reconcile against bank deposits — store reports occasionally lag.
          </div>
        </Panel>
      </div>

      <Panel delay={0.3}>
        <SectionHeader title="Apple Revenue by Country" sub="Last 30 days · App Store Connect"/>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {f.appleRevByCountry.map((c,i) => {
            const max = Math.max(...f.appleRevByCountry.map(x => x.v));
            return (
              <div key={c.c} style={{display:"flex",alignItems:"center",gap:14,animation:`fadeUp .3s ease-out ${i*0.05}s both`}}>
                <div style={{width:36,fontFamily:"'DM Mono',monospace",fontSize:12,color:C.w(0.5),fontWeight:600}}>{c.c}</div>
                <div style={{flex:1,height:24,background:C.w(0.04),borderRadius:6,overflow:"hidden",position:"relative"}}>
                  <div style={{
                    height:"100%",width:`${(c.v/max)*100}%`,
                    background:C.grad.cyan,borderRadius:6,
                  }}/>
                </div>
                <div style={{width:80,textAlign:"right",fontFamily:"'Fredoka',sans-serif",fontWeight:700,color:"#fff"}}>${c.v.toFixed(0)}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

// ─── Revenue Heatmap (Months × Years) ─────────────────────────────────────
const RevenueHeatmap = () => {
  // Pivot MONTHLY_REVENUE into a grid: rows = years, cols = Jan-Dec
  const years = [...new Set(MONTHLY_REVENUE.map(m => m.year))].sort();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const grid = years.map(y => {
    const row = monthNames.map((_,m) => {
      const found = MONTHLY_REVENUE.find(x => x.year === y && x.month === m);
      return found ? found.net : null;
    });
    return {year: y, row, total: row.reduce((s,v) => s + (v||0), 0)};
  });

  const allValues = MONTHLY_REVENUE.map(m => m.net).filter(v => v > 0);
  const maxVal = Math.max(...allValues);

  // Column totals for MoM avg
  const colTotals = monthNames.map((_,m) => {
    const vals = grid.map(r => r.row[m]).filter(v => v !== null && v > 0);
    return vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
  });

  const colorFor = (v) => {
    if (v === null || v === 0) return "rgba(255,255,255,0.03)";
    const intensity = v / maxVal;
    // Purple to gold gradient based on intensity
    if (intensity < 0.2) return `rgba(118,75,162,${0.2 + intensity})`;
    if (intensity < 0.5) return `rgba(168,51,74,${0.4 + intensity*0.4})`;
    return `rgba(255,210,0,${0.5 + intensity*0.5})`;
  };

  // YoY change per month (current vs prior year)
  const yoyChange = (yearIdx, monthIdx) => {
    if (yearIdx === 0) return null;
    const cur = grid[yearIdx].row[monthIdx];
    const prev = grid[yearIdx-1].row[monthIdx];
    if (!cur || !prev) return null;
    return (cur - prev) / prev;
  };

  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"separate",borderSpacing:3,fontFamily:"'Outfit',sans-serif"}}>
        <thead>
          <tr>
            <th style={{padding:"6px 8px",fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.6,textTransform:"uppercase",textAlign:"left"}}></th>
            {monthNames.map(m => (
              <th key={m} style={{padding:"6px 4px",fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.6,textTransform:"uppercase",textAlign:"center"}}>{m}</th>
            ))}
            <th style={{padding:"6px 8px",fontSize:10,fontWeight:700,color:C.gold,letterSpacing:.6,textTransform:"uppercase",textAlign:"right"}}>Year</th>
          </tr>
        </thead>
        <tbody>
          {grid.map((r, yIdx) => (
            <tr key={r.year}>
              <td style={{padding:"6px 8px",fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:"#fff"}}>{r.year}</td>
              {r.row.map((v, mIdx) => {
                const yoy = yoyChange(yIdx, mIdx);
                return (
                  <td
                    key={mIdx}
                    style={{
                      padding: 0,
                      background: colorFor(v),
                      borderRadius: 6,
                      textAlign:"center",
                      verticalAlign:"middle",
                      width: 64, height: 50,
                      cursor: v ? "default" : "default",
                      position: "relative",
                    }}
                    title={v ? `${monthNames[mIdx]} ${r.year}: $${v.toFixed(0)}${yoy !== null ? ` (${(yoy*100).toFixed(0)}% YoY)` : ""}` : ""}
                  >
                    {v !== null && v > 0 ? (
                      <div style={{padding:"4px 2px"}}>
                        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color: v/maxVal > 0.4 ? "#1e0f4a" : "#fff",lineHeight:1.1}}>
                          ${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}
                        </div>
                        {yoy !== null && (
                          <div style={{fontSize:9,fontWeight:700,marginTop:2,color: v/maxVal > 0.4 ? (yoy >= 0 ? "#0a4d3a" : "#5a1212") : (yoy >= 0 ? C.green : C.red)}}>
                            {yoy >= 0 ? "▲" : "▼"}{Math.abs(yoy*100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{fontSize:10,color:C.w(0.2)}}>—</span>
                    )}
                  </td>
                );
              })}
              <td style={{padding:"6px 8px",fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.gold,textAlign:"right"}}>
                {r.total > 0 ? `$${r.total >= 1000 ? `${(r.total/1000).toFixed(1)}k` : r.total.toFixed(0)}` : "—"}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{padding:"10px 8px",fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.6,textTransform:"uppercase",borderTop:`1px solid ${C.w(0.05)}`}}>Avg/mo</td>
            {colTotals.map((v,i) => (
              <td key={i} style={{padding:"10px 4px",fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:600,color:C.w(0.5),textAlign:"center",borderTop:`1px solid ${C.w(0.05)}`}}>
                {v > 0 ? `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}` : "—"}
              </td>
            ))}
            <td style={{borderTop:`1px solid ${C.w(0.05)}`}}/>
          </tr>
        </tbody>
      </table>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:18,paddingTop:14,borderTop:`1px solid ${C.w(0.05)}`,gap:24,flexWrap:"wrap"}}>
        <div style={{fontSize:12,color:C.w(0.5),lineHeight:1.5}}>
          Hover any cell for exact figures. <strong style={{color:C.gold}}>Q4 2025 → Q1 2026</strong> shows the strongest growth — likely seasonal lift from holiday-themed trivia + sports playoffs.
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase"}}>Low</span>
          <div style={{
            width:140,height:10,borderRadius:5,
            background:"linear-gradient(90deg, rgba(118,75,162,0.3), rgba(168,51,74,0.7), rgba(255,210,0,0.95))",
          }}/>
          <span style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase"}}>High</span>
        </div>
      </div>
    </div>
  );
};

const FlowDiagram = ({f}) => (
  <div style={{padding:"20px 0"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
      <FlowBox label="Patron pays" value={`$${f.revenuecatGross.toFixed(0)}`} sub="at the till" accent={C.grad.purple}/>
      <FlowArrow/>
      <FlowBox label="Store cut (15%)" value={`-$${(f.revenuecatGross * 0.15).toFixed(0)}`} sub="Apple + Google" accent={C.grad.red} negative/>
      <FlowArrow/>
      <FlowBox label="Refunds" value={`$${(f.appleRefunds + f.googleRefunds).toFixed(0)}`} sub="last 30d" accent={C.grad.red} negative/>
      <FlowArrow/>
      <FlowBox label="Net to you" value={`$${(f.appleNet + f.googleNet + f.appleRefunds + f.googleRefunds).toFixed(0)}`} sub="after fees" accent={C.grad.gold} bright/>
    </div>
  </div>
);

const FlowBox = ({label, value, sub, accent, negative, bright}) => (
  <div style={{
    flex:1, padding:"16px 14px", borderRadius:12,
    background: bright ? accent : C.w(0.04),
    border: bright ? "none" : `1px solid ${C.w(0.06)}`,
    boxShadow: bright ? "0 8px 28px rgba(255,210,0,0.25)" : "none",
    textAlign:"center",
  }}>
    <div style={{fontSize:10,color: bright?"rgba(15,3,38,0.7)":C.w(0.45),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <div style={{
      fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,
      color: bright?"#1e0f4a":(negative?C.red:"#fff"),
      lineHeight:1,marginBottom:4,
    }}>{value}</div>
    {sub && <div style={{fontSize:10,color:bright?"rgba(15,3,38,0.5)":C.w(0.4)}}>{sub}</div>}
  </div>
);

const FlowArrow = () => (
  <div style={{color:C.w(0.3),fontSize:20,fontWeight:300}}>→</div>
);

const PayoutCard = ({platform, date, amount, icon, days}) => (
  <div style={{
    padding:16,borderRadius:12,
    background:C.w(0.04),border:`1px solid ${C.w(0.06)}`,
  }}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <span style={{fontSize:18}}>{icon}</span>
      <span style={{fontSize:12,fontWeight:600,color:C.w(0.7)}}>{platform}</span>
    </div>
    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff",marginBottom:4}}>${amount.toFixed(0)}</div>
    <div style={{fontSize:11,color:C.w(0.4)}}>Estimated {date} · in {days}d</div>
  </div>
);

// ─── QUESTIONS TAB ─────────────────────────────────────────────────────────
const QuestionsTab = () => {
  const d = mockData.overview;
  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Total Questions" value={d.questionsTotal.toLocaleString()} sub="in DynamoDB" accent={C.grad.purple} icon="📚" big delay={0}/>
        <Stat label="Used At Least Once" value={d.questionsUsed.toLocaleString()} sub={`${((d.questionsUsed/d.questionsTotal)*100).toFixed(1)}% of bank`} accent={C.grad.gold} icon="✓" big delay={0.05}/>
        <Stat label="Never Served" value={(d.questionsTotal - d.questionsUsed).toLocaleString()} sub="fresh content" accent={C.grad.cyan} icon="✨" big delay={0.1}/>
        <Stat label="Current Round" value={d.currentRound} sub="all repeat once round = 2" accent={C.grad.green} icon="↻" big delay={0.15}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.2}>
          <SectionHeader title="Coverage by Super-Category" sub="What's been served vs total"/>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {mockData.questions.bySupercategory.map((c,i) => {
              const pct = c.used / c.total;
              return (
                <div key={c.name} style={{animation:`fadeUp .4s ease-out ${i*0.05}s both`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{c.name}</span>
                    <span style={{fontSize:12,color:C.w(0.5)}}>
                      <strong style={{color:C.gold,fontFamily:"'Fredoka',sans-serif"}}>{c.used.toLocaleString()}</strong>
                      <span style={{color:C.w(0.3)}}> / {c.total.toLocaleString()}</span>
                      <span style={{marginLeft:8,fontSize:11,color:C.w(0.4)}}>{(pct*100).toFixed(1)}%</span>
                    </span>
                  </div>
                  <div style={{height:8,background:C.w(0.05),borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct*100}%`,background:C.grad.gold,borderRadius:4}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel delay={0.25}>
          <SectionHeader title="Coverage by Difficulty" sub="Levels 1 (easy) through 5 (hard)"/>
          <div style={{display:"flex",alignItems:"flex-end",gap:14,height:200,padding:"20px 8px 0"}}>
            {mockData.questions.byDifficulty.map((d,i) => {
              const max = Math.max(...mockData.questions.byDifficulty.map(x => x.count));
              const totalH = (d.count/max) * 160;
              const usedH = (d.used/max) * 160;
              return (
                <div key={d.d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8,animation:`fadeUp .4s ease-out ${i*0.07}s both`}}>
                  <div style={{
                    width:"100%",
                    height: totalH,
                    background: C.w(0.06),
                    borderRadius:"6px 6px 0 0",
                    position:"relative",
                    overflow:"hidden",
                  }}>
                    <div style={{
                      position:"absolute",bottom:0,left:0,right:0,
                      height: usedH,
                      background: C.grad.gold,
                      borderRadius:"6px 6px 0 0",
                    }}/>
                  </div>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:"#fff"}}>L{d.d}</div>
                  <div style={{fontSize:10,color:C.w(0.4),fontFamily:"'DM Mono',monospace"}}>{(d.count/1000).toFixed(1)}k</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:18,marginTop:18,paddingTop:18,borderTop:`1px solid ${C.w(0.05)}`,fontSize:11,color:C.w(0.5)}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:C.gold}}/>Used</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:C.w(0.15)}}/>Never served</span>
          </div>
        </Panel>
      </div>

      <Panel delay={0.3}>
        <SectionHeader title="Generation Pipeline Health" sub="Question creation throughput · last 7 days"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          <PipelineStat label="Generated this week" value="2,418" trend={0.18} good/>
          <PipelineStat label="FAISS dedup rejects" value="312" sub="13% of generated" muted/>
          <PipelineStat label="Avg difficulty" value="2.84" sub="target: 3.0"/>
          <PipelineStat label="Topic gaps" value="6" sub="leaves with <20 questions" warn/>
        </div>
      </Panel>
    </div>
  );
};

const PipelineStat = ({label,value,sub,trend,good,warn,muted}) => (
  <div style={{padding:16,background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.05)}`}}>
    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:8}}>{label}</div>
    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color: warn?C.gold:muted?C.w(0.6):"#fff"}}>{value}</div>
      {trend !== undefined && <span style={{fontSize:11,fontWeight:700,color:good?C.green:C.red}}>{good?"▲":"▼"}{Math.abs(trend*100).toFixed(0)}%</span>}
    </div>
    {sub && <div style={{fontSize:10,color:C.w(0.4),marginTop:4}}>{sub}</div>}
  </div>
);

// ─── SIGNAGE TAB ───────────────────────────────────────────────────────────
const SignageTab = ({range, compare, customRange}) => {
  const s = SIGNAGE;
  const window = range === "custom" ? customRange : rangeWindow(range);

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{
        marginBottom:18, padding:"14px 18px",
        background:"rgba(255,210,0,0.06)",
        border:`1px solid rgba(255,210,0,0.15)`,
        borderRadius:10,
        display:"flex",alignItems:"center",gap:14,
      }}>
        <span style={{fontSize:20}}>📡</span>
        <div style={{fontSize:12,color:C.w(0.7),lineHeight:1.5}}>
          <strong style={{color:C.gold}}>Inventory tracking · not yet monetized.</strong> Collecting impression data now so future ad inventory has a real history. Operating window: <strong style={{color:"#fff"}}>5 PM – 5 AM ET</strong>, every day.
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat
          label="Total Impressions"
          value={s.totals.impressions.toLocaleString()}
          sub={`${fmtRange(window)}`}
          accent={C.grad.purple} icon="📺" big delay={0}
        />
        <Stat
          label="Audience-Seconds"
          value={`${(s.totals.audienceSeconds/1000).toFixed(0)}k`}
          sub="impression × duration × players"
          accent={C.grad.gold} icon="👁" big delay={0.05}
        />
        <Stat
          label="Active TVs"
          value={`${s.totals.activeTvs} / ${s.totals.totalTvs}`}
          sub={`${s.totals.totalTvs - s.totals.activeTvs} dark in last 24h`}
          accent={C.grad.green} icon="📡" big delay={0.1}
        />
        <Stat
          label="Avg / Peak Audience"
          value={`${s.totals.avgConcurrent} / ${s.totals.peakConcurrent}`}
          sub="concurrent players per impression"
          accent={C.grad.cyan} icon="📊" big delay={0.15}
        />
      </div>

      {/* Engagement heatmap — the killer view */}
      <Panel delay={0.2} style={{marginBottom:14}}>
        <SectionHeader
          title="When Audience Is Engaged"
          sub="Audience-seconds delivered, by day-of-week × bar-local hour · 5 PM – 5 AM window"
        />
        <SignageHeatmap data={s.heatmap}/>
      </Panel>

      {/* Slice by sellable dimensions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.25}>
          <SectionHeader title="By Daypart" sub="ET-anchored windows · what advertisers buy on"/>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:8}}>
            {s.dayparts.map((d,i) => (
              <div key={d.label} style={{animation:`fadeUp .4s ease-out ${i*0.05}s both`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{d.label}</span>
                    <span style={{fontSize:11,color:C.w(0.4),marginLeft:8,fontFamily:"'DM Mono',monospace"}}>{d.range}</span>
                  </div>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.gold}}>{(d.audienceSeconds/1000).toFixed(0)}k</span>
                </div>
                <div style={{height:10,background:C.w(0.05),borderRadius:5,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${d.pct*100}%`,background:C.grad.gold,borderRadius:5}}/>
                </div>
                <div style={{fontSize:10,color:C.w(0.4),marginTop:4,fontFamily:"'DM Mono',monospace"}}>{(d.pct*100).toFixed(0)}% of all audience-seconds</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel delay={0.3}>
          <SectionHeader title="By Audience Size" sub="What inventory looks like at each threshold"/>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
            {s.audienceBuckets.map((b,i) => (
              <div key={b.label} style={{
                display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.05)}`,
                animation:`fadeUp .4s ease-out ${i*0.05}s both`,
              }}>
                <div style={{
                  width:36,height:36,borderRadius:8,
                  background:`linear-gradient(135deg, hsl(${280-i*20}, 65%, 55%), hsl(${260-i*20}, 65%, 45%))`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff",
                }}>{b.threshold}+</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{b.label}</div>
                  <div style={{fontSize:11,color:C.w(0.45),marginTop:2}}>{(b.pct*100).toFixed(1)}% of impressions</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:"#fff"}}>{b.impressions.toLocaleString()}</div>
                  <div style={{fontSize:10,color:C.w(0.4),fontFamily:"'DM Mono',monospace"}}>impressions</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,padding:12,background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.05)}`,fontSize:11,color:C.w(0.55),lineHeight:1.5}}>
            Higher thresholds = more "premium" inventory. <strong style={{color:C.gold}}>22%</strong> of impressions hit a 15+ player audience — the slice that proves engagement to advertisers.
          </div>
        </Panel>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.35}>
          <SectionHeader title="By Region" sub="Geo-IP derived at TV pairing"/>
          <div style={{
            display:"grid",gridTemplateColumns:"1.5fr 0.6fr 0.6fr 1fr 1fr",gap:12,
            padding:"10px 8px",fontSize:10,fontWeight:700,color:C.w(0.4),
            letterSpacing:.8,textTransform:"uppercase",
            borderBottom:`1px solid ${C.w(0.05)}`,
          }}>
            <div>DMA</div><div>Rank</div><div>Bars</div><div>Impressions</div><div>Aud-sec</div>
          </div>
          {s.byDMA.map((d,i) => (
            <div key={d.dma} className="row" style={{
              display:"grid",gridTemplateColumns:"1.5fr 0.6fr 0.6fr 1fr 1fr",gap:12,
              padding:"14px 8px",fontSize:13,color:"#fff",
              borderBottom:`1px solid ${C.w(0.04)}`,
              animation:`fadeUp .3s ease-out ${i*0.05}s both`,
            }}>
              <div>
                <div style={{fontWeight:600}}>{d.dma.length > 28 ? d.dma.split("-").slice(0,2).join("-") + "..." : d.dma}</div>
                <div style={{fontSize:10,color:C.w(0.35),marginTop:2}}>{d.tvs} TVs across {d.bars} bars</div>
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.gold,fontWeight:600}}>#{d.rank}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700}}>{d.bars}</div>
              <div style={{fontSize:12,color:C.w(0.7)}}>{d.impressions.toLocaleString()}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,color:C.gold,fontSize:12}}>{(d.audienceSeconds/1000).toFixed(0)}k</div>
            </div>
          ))}
          <div style={{marginTop:14,padding:12,background:"rgba(102,126,234,0.06)",border:`1px solid rgba(102,126,234,0.15)`,borderRadius:10,fontSize:11,color:C.w(0.6),lineHeight:1.5}}>
            <strong style={{color:C.blue}}>Note:</strong> DMA = Designated Market Area, the standard unit ad buyers use regionally. You're at #38, the WNC/Upstate-SC market.
          </div>
        </Panel>

        <Panel delay={0.4}>
          <SectionHeader title="Impression Mix" sub="What's actually being served"/>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
            {s.totals.impressionsByContext.map((c,i) => {
              const total = s.totals.impressions;
              return (
                <div key={c.context} style={{
                  padding:14,background:C.w(0.03),borderRadius:10,
                  border:`1px solid ${C.w(0.05)}`,
                  animation:`fadeUp .4s ease-out ${i*0.05}s both`,
                }}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:8,height:8,borderRadius:2,background:c.color}}/>
                      <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{c.label}</span>
                      {c.context === "off_hours_idle" && (
                        <Pill color={C.w(0.4)} bg={C.w(0.05)}>not priced</Pill>
                      )}
                    </div>
                    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>{c.count.toLocaleString()}</span>
                  </div>
                  <div style={{height:6,background:C.w(0.05),borderRadius:3,overflow:"hidden",marginBottom:6}}>
                    <div style={{height:"100%",width:`${(c.count/total)*100}%`,background:c.color,borderRadius:3}}/>
                  </div>
                  <div style={{fontSize:10,color:C.w(0.4),fontFamily:"'DM Mono',monospace"}}>
                    {((c.count/total)*100).toFixed(1)}% of impressions
                    {c.audienceWeighted > 0 && ` · ${(c.audienceWeighted*100).toFixed(0)}% of audience-seconds`}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Data quality — am I collecting the right things? */}
      <Panel delay={0.45}>
        <SectionHeader title="Data Quality" sub="Am I collecting what I'll need when this becomes sellable?"/>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {s.dataQuality.map((q,i) => {
            const pct = q.total > 0 ? q.good / q.total : 0;
            const isGood = pct >= 0.95;
            const isInfo = q.kind === "info";
            return (
              <div key={q.label} style={{
                display:"flex",alignItems:"center",gap:14,padding:"12px 14px",
                background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.05)}`,
                animation:`fadeUp .3s ease-out ${i*0.04}s both`,
              }}>
                <div style={{
                  width:10,height:10,borderRadius:"50%",
                  background: isInfo ? C.blue : (isGood ? C.green : C.gold),
                  boxShadow:`0 0 8px ${isInfo ? C.blue : (isGood ? C.green : C.gold)}`,
                }}/>
                <div style={{flex:1,fontSize:13,fontWeight:600,color:"#fff"}}>{q.label}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.w(0.6)}}>
                  {q.good.toLocaleString()}{q.total !== q.good ? ` / ${q.total.toLocaleString()}` : ""}
                </div>
                <Pill color={isInfo?C.blue:(isGood?C.green:C.gold)} bg={isInfo?"rgba(102,126,234,0.1)":(isGood?"rgba(0,212,170,0.1)":"rgba(255,210,0,0.1)")}>
                  {isInfo?"INFO":(isGood?"OK":"WATCH")}
                </Pill>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:14,padding:14,background:"rgba(0,212,170,0.06)",border:`1px solid rgba(0,212,170,0.15)`,borderRadius:10,fontSize:12,color:C.w(0.65),lineHeight:1.5}}>
          <strong style={{color:C.green}}>Schema is sound.</strong> Every impression carries <code style={{background:C.w(0.06),padding:"1px 5px",borderRadius:3,fontFamily:"'DM Mono',monospace",fontSize:11}}>concurrent_players</code>, every TV has geo-IP-derived location, every bar's DMA is derivable from zip. When you're ready to sell, the data answers any reasonable advertiser question.
        </div>
      </Panel>
    </div>
  );
};

// ─── Signage Heatmap (day × hour) ─────────────────────────────────────────
const SignageHeatmap = ({data}) => {
  const {hours, days, values} = data;
  const flat = values.flat();
  const max = Math.max(...flat);

  const formatHour = (h) => {
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    if (h < 12) return `${h}a`;
    return `${h-12}p`;
  };

  const colorFor = (v) => {
    const intensity = v / max;
    if (intensity < 0.05) return "rgba(255,255,255,0.03)";
    if (intensity < 0.2) return `rgba(118,75,162,${0.2 + intensity})`;
    if (intensity < 0.5) return `rgba(168,51,74,${0.4 + intensity*0.4})`;
    return `rgba(255,210,0,${0.5 + intensity*0.5})`;
  };

  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"separate",borderSpacing:3,fontFamily:"'Outfit',sans-serif"}}>
        <thead>
          <tr>
            <th style={{padding:"6px 8px",fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.6,textTransform:"uppercase",textAlign:"left"}}></th>
            {hours.map(h => (
              <th key={h} style={{padding:"6px 4px",fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.6,textTransform:"uppercase",textAlign:"center"}}>{formatHour(h)}</th>
            ))}
            <th style={{padding:"6px 8px",fontSize:10,fontWeight:700,color:C.gold,letterSpacing:.6,textTransform:"uppercase",textAlign:"right"}}>Day</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, dIdx) => {
            const dayTotal = values[dIdx].reduce((s,v) => s+v, 0);
            return (
              <tr key={day}>
                <td style={{padding:"6px 8px",fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:600,color:"#fff"}}>{day}</td>
                {values[dIdx].map((v, hIdx) => (
                  <td
                    key={hIdx}
                    style={{
                      padding: 0,
                      background: colorFor(v),
                      borderRadius: 5,
                      textAlign:"center",
                      verticalAlign:"middle",
                      width: 52, height: 38,
                    }}
                    title={`${day} ${formatHour(hours[hIdx])} · ${v.toLocaleString()} audience-seconds`}
                  >
                    {v / max > 0.15 && (
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700,color: v/max > 0.5 ? "#1e0f4a" : "#fff"}}>
                        {v >= 1000 ? `${Math.round(v/1000)}k` : v}
                      </div>
                    )}
                  </td>
                ))}
                <td style={{padding:"6px 8px",fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.gold,textAlign:"right"}}>
                  {(dayTotal/1000).toFixed(0)}k
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:18,paddingTop:14,borderTop:`1px solid ${C.w(0.05)}`,gap:24,flexWrap:"wrap"}}>
        <div style={{fontSize:12,color:C.w(0.5),lineHeight:1.5}}>
          <strong style={{color:C.gold}}>Tue–Thu 8–10 PM</strong> is your prime inventory — the hours an advertiser would pay for. Friday/Saturday spread later, Sunday goes quiet.
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase"}}>Low</span>
          <div style={{width:140,height:10,borderRadius:5,background:"linear-gradient(90deg, rgba(118,75,162,0.3), rgba(168,51,74,0.7), rgba(255,210,0,0.95))"}}/>
          <span style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase"}}>High</span>
        </div>
      </div>
    </div>
  );
};

// ─── AWS TAB ───────────────────────────────────────────────────────────────
const AwsTab = () => {
  const total = mockData.awsCosts.reduce((s,x) => s+x.cost, 0);
  const dailySeries = [1.21,1.18,1.32,1.45,1.28,1.51,1.39,1.42,1.55,1.18,1.24,1.31,1.42,1.38,1.49,1.41,1.27,1.33,1.46,1.39,1.41,1.34,1.51,1.42,1.28,1.31,1.45,1.38,1.42,1.39];
  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="MTD Spend" value={`$${total.toFixed(2)}`} sub="this billing month" accent={C.grad.cyan} icon="☁" big delay={0}/>
        <Stat label="Daily Avg" value={`$${(total/30).toFixed(2)}`} sub="across all services" accent={C.grad.purple} icon="📅" big delay={0.05}/>
        <Stat label="Cost / Active Bar" value={`$${(total/47).toFixed(2)}`} sub="47 venues live" accent={C.grad.green} icon="🍻" big delay={0.1}/>
        <Stat label="Forecast EOM" value={`$${(total*1.05).toFixed(2)}`} sub="trending normal" accent={C.grad.gold} icon="📊" big delay={0.15}/>
      </div>

      <Panel delay={0.2} style={{marginBottom:14}}>
        <SectionHeader title="Daily Spend" sub="30-day trend · all services combined"/>
        <DailyCostChart data={dailySeries}/>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Panel delay={0.25}>
          <SectionHeader title="By Service" sub="Month to date breakdown"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {mockData.awsCosts.map((s,i) => (
              <div key={s.service} style={{
                display:"flex",alignItems:"center",gap:12,padding:"12px 4px",
                borderBottom:`1px solid ${C.w(0.04)}`,
                animation:`fadeUp .3s ease-out ${i*0.03}s both`,
              }}>
                <div style={{width:8,height:32,borderRadius:2,background:s.color}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>{s.service}</div>
                  <div style={{height:4,width:"100%",background:C.w(0.05),borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(s.cost/Math.max(...mockData.awsCosts.map(x=>x.cost)))*100}%`,background:s.color,borderRadius:2}}/>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700,color:"#fff",fontSize:15}}>${s.cost.toFixed(2)}</div>
                  <div style={{fontSize:10,color:C.w(0.4),fontFamily:"'DM Mono',monospace"}}>{(s.pct*100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel delay={0.3}>
          <SectionHeader title="Cost Sanity" sub="Watching for the things that bite"/>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <SanityRow status="ok" label="DynamoDB on-demand" detail="$12.84 · scale-to-zero working"/>
            <SanityRow status="ok" label="Lambda invocations" detail="2.4M this month · well under free tier risk"/>
            <SanityRow status="ok" label="Bedrock Titan calls" detail="186 logo processings · $2.94"/>
            <SanityRow status="warn" label="API Gateway requests" detail="$6.21 — watch as bars scale, polling-heavy"/>
            <SanityRow status="ok" label="EventBridge daily job" detail="$0.18 · single rule firing"/>
            <SanityRow status="ok" label="No idle services" detail="No NAT, no Cognito, no WebSockets"/>
          </div>
          <div style={{marginTop:18,padding:14,background:"rgba(0,212,170,0.06)",border:`1px solid rgba(0,212,170,0.15)`,borderRadius:10,fontSize:12,color:C.w(0.65),lineHeight:1.5}}>
            At $38.42/mo and {Math.round(((total/47)*100))/100}/bar, gross margin per bar is <strong style={{color:C.green}}>{(((mockData.bars.reduce((s,b)=>s+b.mrrAttr,0)/47) - (total/47))/(mockData.bars.reduce((s,b)=>s+b.mrrAttr,0)/47)*100).toFixed(0)}%</strong>. Healthy.
          </div>
        </Panel>
      </div>
    </div>
  );
};

const SanityRow = ({status, label, detail}) => {
  const colors = {
    ok:   {dot:C.green, label:"OK"},
    warn: {dot:C.gold, label:"WATCH"},
    bad:  {dot:C.red, label:"ALERT"},
  };
  const c = colors[status];
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.w(0.04)}`}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:c.dot,marginTop:6,boxShadow:`0 0 8px ${c.dot}`}}/>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:2}}>{label}</div>
        <div style={{fontSize:11,color:C.w(0.45)}}>{detail}</div>
      </div>
      <Pill color={c.dot} bg={`${c.dot}1a`}>{c.label}</Pill>
    </div>
  );
};

const DailyCostChart = ({data}) => {
  const W = 800, H = 140;
  const max = Math.max(...data) * 1.15;
  const min = Math.min(...data) * 0.85;
  const xStep = W / (data.length - 1);
  const y = v => H - ((v - min)/(max - min)) * H;
  const path = data.map((v,i) => `${i===0?"M":"L"} ${i*xStep} ${y(v)}`).join(" ");
  const area = path + ` L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H+20}`} style={{width:"100%",height:160}}>
      <defs>
        <linearGradient id="cyangrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4facfe" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#4facfe" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#cyangrad)"/>
      <path d={path} fill="none" stroke="#4facfe" strokeWidth="2" strokeLinecap="round"/>
      {data.map((v,i) => i % 5 === 0 && (
        <text key={i} x={i*xStep} y={H+15} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle" fontFamily="DM Mono">D{i+1}</text>
      ))}
    </svg>
  );
};

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("Overview");
  const [drillBar, setDrillBar] = useState(null);
  const [range, setRange] = useState("mtd");
  const [compare, setCompare] = useState("none");
  const [customRange, setCustomRange] = useState({
    start: new Date(2026, 0, 1),
    end: new Date(2026, 3, 30),
  });

  const renderTab = () => {
    switch(tab) {
      case "Overview":    return <OverviewTab setTab={setTab} setBarDrill={setDrillBar} range={range} compare={compare} customRange={customRange}/>;
      case "Subscribers": return <SubscribersTab/>;
      case "Bars":        return <BarsTab drillBar={drillBar} setDrillBar={setDrillBar}/>;
      case "Signage":     return <SignageTab range={range} compare={compare} customRange={customRange}/>;
      case "Finance":     return <FinanceTab range={range} compare={compare} customRange={customRange}/>;
      case "Questions":   return <QuestionsTab/>;
      case "AWS":         return <AwsTab/>;
      default:            return null;
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background: C.grad.main,
      backgroundAttachment:"fixed",
      color:"#fff",
      fontFamily:"'Outfit',sans-serif",
    }}>
      <Styles/>
      <Topbar
        tab={tab}
        setTab={t => { setTab(t); setDrillBar(null); }}
        range={range} setRange={setRange}
        compare={compare} setCompare={setCompare}
        customRange={customRange} setCustomRange={setCustomRange}
      />
      {renderTab()}
      <div style={{padding:"40px 32px 24px",textAlign:"center",fontSize:11,color:C.w(0.25),fontFamily:"'DM Mono',monospace"}}>
        TapTrivia Operator Console · Visudo Labs · Mock data
      </div>
    </div>
  );
}
