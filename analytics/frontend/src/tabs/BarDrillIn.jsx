import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import Pill, { SectionHeader } from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";

function DrillStat({label, value, accent}) {
  return (
    <div style={{textAlign:"right"}}>
      <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:26,fontWeight:700,color:accent||"#fff",lineHeight:1}}>{value}</div>
    </div>
  );
}

const SUB_COLORS = {
  paid:  {color:C.gold,   bg:"rgba(255,210,0,0.1)"},
  trial: {color:C.cyan,   bg:"rgba(79,172,254,0.1)"},
  free:  {color:C.w(0.5), bg:C.w(0.05)},
};

export default function BarDrillIn({barCode, onBack}) {
  const { data, loading, error, retry } = useFetch(`/analytics/bars/${encodeURIComponent(barCode)}`, [barCode]);

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={140} label="Bar"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Bar"/></div>;

  const bar = data?.bar || {};
  const geo = data?.geo || {};
  const tvs = data?.tvs || [];
  const sum = data?.playerSummary || {};
  const players = data?.players || [];

  return (
    <div style={{padding:"28px 32px"}}>
      <button onClick={onBack} style={{
        background:"transparent",border:"none",cursor:"pointer",
        color:C.w(0.5),fontSize:13,fontWeight:600,marginBottom:14,
        fontFamily:"'Outfit',sans-serif",padding:"4px 0",
      }}>← All Bars</button>

      <Panel delay={0} style={{padding:28,marginBottom:14,background:`linear-gradient(135deg, rgba(118,75,162,0.18), rgba(168,51,74,0.18))`,border:`1px solid ${C.w(0.1)}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",letterSpacing:-.5}}>{bar.name || "—"}</div>
              {bar.status && <Pill color={C.green} bg="rgba(0,212,170,0.15)">{bar.status}</Pill>}
            </div>
            <div style={{fontSize:14,color:C.w(0.55),display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
              {(geo.city || geo.state) && <span>📍 {[geo.city, geo.state].filter(Boolean).join(", ")}</span>}
              <span style={{fontFamily:"'DM Mono',monospace",color:C.gold,fontWeight:600}}>{bar.code}</span>
              <span>📺 {tvs.length} TV{tvs.length !== 1 ? "s" : ""}</span>
              {geo.zip && <span style={{color:C.w(0.4),fontSize:12}}>· {geo.zip}{geo.dma ? ` · ${geo.dma}` : ""}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:24}}>
            <DrillStat label="Players" value={sum.total ?? 0}/>
            <DrillStat label="TVs" value={tvs.length}/>
            <DrillStat label="Avg Game Size" value={(sum.avgGameSize || 0).toFixed(1)} accent={C.gold}/>
          </div>
        </div>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Paid Subscribers" value={sum.paid ?? 0} sub="from this venue" accent={C.grad.gold} delay={0.05}/>
        <Stat label="On Trial" value={sum.trial ?? 0} sub="≤7 days remaining" accent={C.grad.cyan} delay={0.1}/>
        <Stat label="Free Players" value={sum.free ?? 0} sub="haven't subscribed" accent={C.grad.purple} delay={0.15}/>
        <Stat label="Total Patrons" value={sum.total ?? 0} sub="ever played here" accent={C.grad.green} delay={0.2}/>
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
        {players.length === 0 && (
          <div style={{padding:"24px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No players yet</div>
        )}
        {players.map((p,i) => {
          const s = SUB_COLORS[p.subscription] || SUB_COLORS.free;
          const initial = (p.name || "?")[0].toUpperCase();
          const hue = (initial.charCodeAt(0) || 65) * 5;
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
                  background:`linear-gradient(135deg,hsl(${hue},65%,52%),hsl(${hue+40},65%,42%))`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:700,fontSize:13,
                }}>{initial}</div>
                <span style={{fontWeight:600}}>{p.name || "Anonymous"}</span>
              </div>
              <div><Pill color={s.color} bg={s.bg}>{p.subscription || "free"}</Pill></div>
              <div style={{fontSize:12,color:C.w(0.5)}}>{p.joined ? new Date(p.joined).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700}}>{p.games || 0}</div>
              <div style={{fontSize:12,color:C.w(0.5)}}>{p.lastGame ? new Date(p.lastGame).toLocaleString("en-US",{month:"short",day:"numeric"}) : "—"}</div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
