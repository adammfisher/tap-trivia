// Single source of truth for visual tokens. Mirrors the C object and
// the Styles component in the original mockup verbatim — every component
// imports from here. Inline tokens are forbidden.

export const C = {
  grad: {
    main:   "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    panel:  "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
    gold:   "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    green:  "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    purple: "linear-gradient(135deg, #667eea, #764ba2)",
    red:    "linear-gradient(135deg, #ff4757, #ff6b81)",
    cyan:   "linear-gradient(135deg, #4facfe, #00f2fe)",
  },
  w: a => `rgba(255,255,255,${a})`,
  green:  "#00d4aa",
  red:    "#ff4757",
  gold:   "#ffd200",
  blue:   "#667eea",
  purple: "#764ba2",
  cyan:   "#4facfe",
  orange: "#f7971e",
};

export const Styles = () => (
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
    .skel{background:linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.10) 50%, rgba(255,255,255,.04) 100%);background-size:200% 100%;animation:shimmer 1.4s linear infinite;border-radius:8px}
  `}</style>
);

export const RANGES = [
  {key:"mtd",   label:"Month to date",      days: null},
  {key:"30d",   label:"Last 30 days",       days: 30},
  {key:"90d",   label:"Last 90 days",       days: 90},
  {key:"ytd",   label:"Year to date",       days: null},
  {key:"12mo",  label:"Last 12 months",     days: 365},
  {key:"3y",    label:"Last 3 years",       days: 1095},
  {key:"custom",label:"Custom…",            days: null},
];

export const COMPARE_MODES = [
  {key:"none", label:"No comparison"},
  {key:"prev", label:"Previous period"},
  {key:"yoy",  label:"Same period last year"},
];
