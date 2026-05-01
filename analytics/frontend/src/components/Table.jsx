import { C } from "../lib/theme";
import Pill from "./Pill";

export function Table({children}) {
  return <div style={{display:"flex",flexDirection:"column"}}>{children}</div>;
}

export function THead({cols}) {
  return (
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
}

const STATUS_MAP = {
  active:  {color:C.green, bg:"rgba(0,212,170,0.1)", label:"Active"},
  slow:    {color:C.gold,  bg:"rgba(255,210,0,0.1)", label:"Slow"},
  dormant: {color:C.red,   bg:"rgba(255,71,87,0.1)", label:"Dormant"},
};

export function BarRow({bar, delay=0, onClick}) {
  const s = STATUS_MAP[bar.status] || STATUS_MAP.dormant;
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
      <div style={{fontSize:12,color:C.w(0.55)}}>{bar.city || "—"}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700}}>{bar.players ?? 0}</div>
      <div style={{fontSize:12,color:C.w(0.6)}}>{bar.gamesMonth ?? 0}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:600,color:C.gold,fontSize:12}}>${(bar.attrMrr || 0).toFixed(0)}</div>
      <div style={{fontSize:11,color:C.w(0.4)}}>{bar.lastGame ? new Date(bar.lastGame).toLocaleString("en-US",{month:"short",day:"numeric"}) : "—"}</div>
      <div><Pill color={s.color} bg={s.bg}>{s.label}</Pill></div>
    </div>
  );
}

export function MiniStat({label, value, sub, trend, good}) {
  return (
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
}
