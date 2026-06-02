import { useState, useMemo } from "react";
import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { Table, THead, BarRow } from "../components/Table";
import { PanelLoading, PanelError } from "../components/PanelState";
import BarDrillIn from "./BarDrillIn";

export default function BarsTab({drillBar, setDrillBar}) {
  const { data, loading, error, retry } = useFetch("/analytics/bars", []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  if (drillBar) return <BarDrillIn barCode={drillBar} onBack={() => setDrillBar(null)}/>;

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={200} label="Bars"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Bars"/></div>;

  const totals = data?.totals || {};
  const bars = data?.bars || [];
  const activeTvs = data?.activeTvs || [];

  const fmtAgo = (m) => m == null ? "—" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m/60)}h ago` : `${Math.round(m/1440)}d ago`;

  // Group active screens by venue (don't list the same bar twice).
  const tvVenues = Object.values(activeTvs.reduce((acc, tv) => {
    const k = tv.barCode || tv.barName;
    if (!acc[k]) acc[k] = { barName: tv.barName, city: tv.city, state: tv.state, count: 0, platforms: new Set(), minAgo: Infinity };
    acc[k].count += 1;
    if (tv.platform) acc[k].platforms.add(tv.platform);
    acc[k].minAgo = Math.min(acc[k].minAgo, tv.minutesAgo ?? Infinity);
    return acc;
  }, {})).sort((a, b) => a.minAgo - b.minAgo);

  const filtered = bars.filter(b => {
    const matchesSearch = !search ||
      (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.city || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Active Bars" value={totals.active || 0} sub={`${(totals.active + totals.pending) || 0} total · ${totals.pending || 0} dormant`} accent={C.grad.green} icon="🍻" delay={0}/>
        <Stat label="Total Players" value={(totals.totalPlayers || 0).toLocaleString()} sub="joined across all bars" accent={C.grad.purple} icon="👥" delay={0.05}/>
        <Stat label="Active This Week" value={(totals.activePlayers7d || 0).toLocaleString()} sub="players who played in last 7 days" accent={C.grad.cyan} icon="🔥" delay={0.1}/>
        <Stat label="Bar-Attributed MRR" value={`$${Number(totals.totalAttrMrr || 0).toFixed(0)}`} sub="patrons subscribed at venue" accent={C.grad.gold} icon="💰" delay={0.15}/>
      </div>

      <Panel delay={0.18} style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:600,color:"#fff",letterSpacing:-.3}}>Active TVs</div>
          <span style={{fontSize:12,fontWeight:700,color:C.green,background:"rgba(0,212,170,.12)",padding:"3px 9px",borderRadius:20}}>{activeTvs.length} screens · {tvVenues.length} venues</span>
          <div style={{fontSize:12,color:C.w(0.4),marginLeft:"auto"}}>heartbeat in the last 24h</div>
        </div>
        {tvVenues.length === 0 && (
          <div style={{padding:"20px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No TVs are currently live</div>
        )}
        {tvVenues.map((v,i) => (
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:12,padding:"11px 8px",
            borderBottom:`1px solid ${C.w(0.04)}`,
          }}>
            <span style={{width:8,height:8,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{v.barName}</div>
              <div style={{fontSize:11,color:C.w(0.45)}}>{[v.city,v.state].filter(Boolean).join(", ") || "—"}</div>
            </div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.green,minWidth:90}}>📺 {v.count} {v.count === 1 ? "screen" : "screens"}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.w(0.6),textTransform:"capitalize",minWidth:60}}>{[...v.platforms].join(", ")}</div>
            <div style={{fontSize:11,color:C.w(0.4),fontFamily:"'DM Mono',monospace",minWidth:70,textAlign:"right"}}>{fmtAgo(v.minAgo)}</div>
          </div>
        ))}
      </Panel>

      <Panel delay={0.2}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,gap:14,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:600,color:"#fff",letterSpacing:-.3}}>All Bars</div>
            <div style={{fontSize:12,color:C.w(0.4),marginTop:3}}>{filtered.length} of {bars.length} bars</div>
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
          <THead cols={["Bar","Code","City","Players","Active 7d","Screens","MRR","Last","Status"]}/>
          {filtered.length === 0 && (
            <div style={{padding:"24px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No bars match your filters</div>
          )}
          {filtered.map((b,i) => (
            <BarRow key={b.code} bar={b} delay={i*0.02} onClick={() => setDrillBar(b.code)}/>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
