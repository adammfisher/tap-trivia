import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";

export default function QuestionsTab() {
  const { data, loading, error, retry } = useFetch("/analytics/questions", []);

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={200} label="Questions"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Questions"/></div>;

  const t = data?.totals || {};
  const bySC = data?.bySupercategory || [];
  const byD = data?.byDifficulty || [];
  const pipe = data?.pipeline || {};

  const total = t.total || 1;
  const maxSC = bySC.reduce((m, x) => Math.max(m, x.count || 0), 1);
  const maxD = byD.reduce((m, x) => Math.max(m, x.count || 0), 1);

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Total Questions" value={(t.total || 0).toLocaleString()} sub={`Round ${t.currentRound || 1} · ${(t.neverServed || 0).toLocaleString()} never served`} accent={C.grad.purple} icon="❓" big delay={0}/>
        <Stat label="Used (round)" value={(t.used || 0).toLocaleString()} sub={`${t.total > 0 ? (((t.used || 0)/t.total)*100).toFixed(1) : "0"}% consumed`} accent={C.grad.gold} icon="🎯" big delay={0.05}/>
        <Stat label="Games to Next Round" value={(t.gamesUntilNextRound || 0).toLocaleString()} sub="before any repeats" accent={C.grad.green} icon="🔁" big delay={0.1}/>
        <Stat label="Avg Difficulty" value={(pipe.avgDifficulty || 0).toFixed(2)} sub="across the bank" accent={C.grad.cyan} icon="📊" big delay={0.15}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Panel delay={0.2}>
          <SectionHeader title="By Supercategory" sub="Distribution across topic groups"/>
          {bySC.length === 0 && <div style={{padding:"20px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No questions tagged yet</div>}
          {bySC.map(s => {
            const pct = (s.count || 0) / total;
            return (
              <div key={s.name} style={{marginBottom: 12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                  <span style={{color:"#fff",fontWeight:600}}>{s.name}</span>
                  <span style={{color:C.w(0.5),fontFamily:"'DM Mono',monospace"}}>{(s.count || 0).toLocaleString()}</span>
                </div>
                <div style={{height:10,background:C.w(0.04),borderRadius:5,overflow:"hidden"}}>
                  <div style={{width:`${(s.count/maxSC)*100}%`,height:"100%",background:C.grad.purple}}/>
                </div>
                <div style={{fontSize:10,color:C.w(0.35),marginTop:3,fontFamily:"'DM Mono',monospace"}}>{(pct*100).toFixed(1)}% of bank</div>
              </div>
            );
          })}
        </Panel>

        <Panel delay={0.25}>
          <SectionHeader title="By Difficulty" sub="1 (easy) → 5 (hard)"/>
          {byD.length === 0 && <div style={{padding:"20px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No difficulty data yet</div>}
          {byD.map(d => (
            <div key={d.level} style={{marginBottom: 12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                <span style={{color:"#fff",fontWeight:600}}>Level {d.level}</span>
                <span style={{color:C.w(0.5),fontFamily:"'DM Mono',monospace"}}>{(d.count || 0).toLocaleString()}</span>
              </div>
              <div style={{height:10,background:C.w(0.04),borderRadius:5,overflow:"hidden"}}>
                <div style={{width:`${(d.count/maxD)*100}%`,height:"100%",background:C.grad.gold}}/>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
