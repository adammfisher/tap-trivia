import { useState } from "react";
import { C } from "../lib/theme";
import DateControl from "./DateControl";
import { fmtTimeAgo } from "../lib/format";
import { api } from "../lib/api";
import { signOut } from "../lib/auth";

export default function Topbar({tab, setTab, range, setRange, compare, setCompare, customRange, setCustomRange, sources, generatedAt, onRefresh}) {
  const tabs = ["Overview", "Subscribers", "Bars", "Signage", "Finance", "Questions", "AWS"];
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await api.post("/analytics/refresh");
      // Give analytics-sync a moment, then re-pull all visible data via callback.
      setTimeout(() => { onRefresh && onRefresh(); setRefreshing(false); }, 4000);
    } catch {
      setRefreshing(false);
    }
  };

  // Single freshness label = oldest of the four sources.
  let oldest = null;
  if (sources) {
    for (const s of Object.values(sources)) {
      if (s?.last_synced && (!oldest || s.last_synced < oldest)) oldest = s.last_synced;
    }
  }

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
        <div title={oldest || ""} style={{
          fontSize:11, color: C.w(0.4), fontFamily:"'DM Mono',monospace",
          padding:"6px 12px", background: C.w(0.04), borderRadius:8,
          border:`1px solid ${C.w(0.06)}`,
        }}>
          <span style={{color: oldest ? C.green : C.red}}>●</span> Synced {fmtTimeAgo(oldest)}
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{
          padding:"8px 14px",borderRadius:9, border:`1px solid ${C.w(0.1)}`,
          background:C.w(0.04), color:"#fff", fontSize:12, fontWeight:600,
          cursor: refreshing ? "wait" : "pointer",
          fontFamily:"'Outfit',sans-serif",
          opacity: refreshing ? 0.6 : 1,
        }}>{refreshing ? "↻ Syncing…" : "↻ Refresh"}</button>
        <div style={{position:"relative"}}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width:36,height:36,borderRadius:"50%",
            background: C.grad.purple,
            display:"flex",alignItems:"center",justifyContent:"center",
            color:"#fff", fontWeight:700, fontSize:14, fontFamily:"'Outfit',sans-serif",
            border:"none", cursor:"pointer",
          }}>A</button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:50}}/>
              <div style={{
                position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:51,
                minWidth:160,padding:6,
                background:"rgba(15,3,38,0.96)",
                border:`1px solid ${C.w(0.1)}`,
                borderRadius:10,
                backdropFilter:"blur(20px)",
                boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
              }}>
                <button onClick={() => signOut()} style={{
                  width:"100%",padding:"9px 12px",borderRadius:6,
                  background:"transparent", border:"none", cursor:"pointer",
                  color:C.w(0.85), fontSize:12, fontWeight:600, fontFamily:"'Outfit',sans-serif",
                  textAlign:"left",
                }}>Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
