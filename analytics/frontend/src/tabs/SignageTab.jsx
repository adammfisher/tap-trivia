import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";

const CTX_LABELS = {
  game_lobby:     {label: "Lobby (waiting)", color: C.cyan},
  between_rounds: {label: "Between rounds",  color: C.gold},
  results:        {label: "End-of-game",     color: C.green},
  off_hours_idle: {label: "Off-hours idle",  color: C.purple},
};

export default function SignageTab() {
  const { data, loading, error, retry } = useFetch("/analytics/signage", []);

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={200} label="Signage"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Signage"/></div>;

  const t = data?.totals || {};
  const byCtx = data?.byContext || [];
  const heat = data?.heatmap || {hours: [], days: [], values: []};

  const peakVal = heat.values.flat().reduce((m, v) => Math.max(m, v || 0), 0) || 1;

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Impressions (period)" value={(t.impressions || 0).toLocaleString()} sub="signage card displays" accent={C.grad.gold} icon="📺" big delay={0}/>
        <Stat label="Audience-Seconds" value={Math.round((t.audienceSeconds || 0) / 1000).toLocaleString() + "k"} sub="impressions × seconds × players" accent={C.grad.purple} icon="👥" big delay={0.05}/>
        <Stat label="Active TVs" value={`${t.activeTvs || 0}/${t.totalTvs || 0}`} sub="heartbeat in last 24h" accent={C.grad.green} icon="📡" big delay={0.1}/>
        <Stat label="Avg Concurrent" value={(t.avgConcurrent || 0).toFixed(1)} sub={`peak ${t.peakConcurrent || 0}`} accent={C.grad.cyan} icon="🎯" big delay={0.15}/>
      </div>

      <Panel delay={0.2} style={{marginBottom:14}}>
        <SectionHeader title="Audience Heatmap" sub="Hour of day × day of week, audience-seconds (bar-local time)"/>
        <div style={{display:"grid",gridTemplateColumns:`60px repeat(${heat.hours.length}, 1fr)`,gap:4}}>
          <div></div>
          {heat.hours.map(h => (
            <div key={h} style={{textAlign:"center",fontSize:10,color:C.w(0.4),fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{h}</div>
          ))}
          {heat.days.map((day, di) => (
            <div key={day} style={{display:"contents"}}>
              <div style={{fontSize:11,color:C.w(0.5),fontWeight:600,paddingTop:6}}>{day}</div>
              {(heat.values[di] || []).map((v, hi) => {
                const intensity = (v || 0) / peakVal;
                return (
                  <div key={hi} style={{
                    height: 28,
                    background: intensity > 0
                      ? `rgba(255,210,0,${0.05 + intensity * 0.55})`
                      : C.w(0.03),
                    border: `1px solid ${C.w(0.04)}`,
                    borderRadius: 4,
                  }}/>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Panel delay={0.25}>
          <SectionHeader title="By Context" sub="Where impressions land"/>
          {byCtx.length === 0 && (
            <div style={{padding:"20px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No impressions yet</div>
          )}
          {byCtx.map(c => {
            const meta = CTX_LABELS[c.context] || {label: c.context, color: C.w(0.5)};
            const pct = t.impressions > 0 ? (c.impressions / t.impressions) * 100 : 0;
            return (
              <div key={c.context} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{meta.label}</div>
                  <div style={{display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>{(c.impressions || 0).toLocaleString()}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.w(0.45)}}>{pct.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{height:6,background:C.w(0.04),borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:meta.color}}/>
                </div>
              </div>
            );
          })}
        </Panel>

        <Panel delay={0.3}>
          <SectionHeader title="Inventory Health" sub="What's tracking; what's missing"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(data?.dataQuality || [
              {label:"TVs heartbeating in last 24h", good: t.activeTvs || 0, total: t.totalTvs || 0, kind: "good"},
              {label:"Bars with geo resolved", good: 0, total: 0, kind: "info"},
            ]).map((q, i) => {
              const ratio = q.total > 0 ? q.good / q.total : 0;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.w(0.04)}`}}>
                  <div style={{flex:1,fontSize:12,color:C.w(0.7)}}>{q.label}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.w(0.5)}}>{q.good}/{q.total}</div>
                  <div style={{width:60,height:6,background:C.w(0.04),borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${ratio*100}%`,height:"100%",background: ratio === 1 ? C.green : ratio > 0.7 ? C.gold : C.red}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
