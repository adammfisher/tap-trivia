import { C } from "../lib/theme";
import Panel from "./Panel";

export default function Stat({label, value, sub, accent, icon, big, delay=0, trend, compare}) {
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
}
