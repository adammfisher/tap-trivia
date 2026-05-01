import { useMemo } from "react";
import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import { rangeWindow, compareWindow, fmtRange, apiRangeParams } from "../lib/ranges";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import { Table, THead, BarRow, MiniStat } from "../components/Table";
import { PanelLoading, PanelError } from "../components/PanelState";
import SubChart from "../components/charts/SubChart";
import Donut from "../components/charts/Donut";

const SERVICE_COLOR = (i) => [C.blue, C.purple, C.cyan, C.gold, "#2ee6b6", "#ff6b81", "#9f7aea", "#f7971e", "#888"][i % 9];

export default function OverviewTab({setTab, setBarDrill, range, compare, customRange}) {
  // Overview is cache-only — single endpoint covers everything except the
  // range-derived subscriber sub-slice (which the API doesn't yet split,
  // so for now we hand SubChart whatever subscriberDailyTrend it gave us).
  const { data, loading, error, retry } = useFetch("/analytics/overview", []);

  const window = range === "custom" ? customRange : rangeWindow(range);
  const cmpWin = compareWindow(window, compare);

  if (loading) {
    return (
      <div style={{padding:"28px 32px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[0,1,2,3].map(i => <PanelLoading key={i} height={80}/>)}
      </div>
    );
  }
  if (error) {
    return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Overview"/></div>;
  }

  const d = data || {};
  const trend = d.subscriberDailyTrend || [];
  const cmpLabel = compare === "yoy" ? "same period LY" : compare === "prev" ? "prior period" : null;

  // Decimals coming back from the API may be Number or string-encoded
  // depending on how DynamoDB formatted them — coerce.
  const num = (v) => Number(v || 0);
  const totalUsers = num(d.totalUsers);
  const paidSubs   = num(d.paidSubs);
  const trialUsers = num(d.trialUsers);
  const free       = num(d.free);
  const activeBars = num(d.activeBars);
  const pendingBars = num(d.pendingBars);
  const mrrGross   = num(d.mrrGross);
  const netMrr     = num(d.netMrr);
  const awsThisMonth = num(d.awsThisMonth);
  const questionsTotal = num(d.questionsTotal);
  const questionsUsed  = num(d.questionsUsed);
  const newSubsToday   = num(d.newSubsToday);
  const newSubsTrend   = num(d.newSubsTrend);
  const churnRate      = num(d.churnRate);
  const trialConversion = num(d.trialConversion);

  const isMTD = range === "mtd";

  const awsBreakdown = (d.awsCosts || []).map((s, i) => ({
    service: s.service,
    cost:    num(s.amount),
    pct:     awsThisMonth > 0 ? num(s.amount) / awsThisMonth : 0,
    color:   SERVICE_COLOR(i),
  }));

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Total Users" value={totalUsers.toLocaleString()}
              sub={`${paidSubs.toLocaleString()} paid · ${trialUsers} trial · ${free.toLocaleString()} free`}
              accent={C.grad.purple} icon="👥" big delay={0}/>
        <Stat label={isMTD ? "Net MRR" : "Net Revenue"}
              value={`$${netMrr.toLocaleString(undefined,{maximumFractionDigits:0})}`}
              sub={`Gross $${mrrGross.toFixed(0)} · ${d.revenue_source === "store_reconciled" ? "store actuals" : "RC estimate × 0.85"}`}
              accent={C.grad.gold} icon="💰" big delay={0.05}/>
        <Stat label="Active Bars" value={activeBars}
              sub={`${pendingBars} pending activation`}
              accent={C.grad.green} icon="🍻" big delay={0.1}/>
        <Stat label={isMTD ? "AWS This Month" : "AWS Spend"}
              value={`$${awsThisMonth.toFixed(2)}`}
              sub={`Margin: ${netMrr > 0 ? (((netMrr - awsThisMonth)/netMrr)*100).toFixed(1) : "—"}%`}
              accent={C.grad.cyan} icon="☁️" big delay={0.15}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.2}>
          <SectionHeader title="Subscriber Growth"
                         sub={`${fmtRange(window)} · ${trend.length} points`}
                         live
                         action={
                           <div style={{display:"flex",gap:14,fontSize:11,fontWeight:600,color:C.w(0.6)}}>
                             <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:C.gold}}/>Paid</span>
                             <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:"#a8334a"}}/>Total</span>
                             {cmpLabel && <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:0,borderTop:`1.5px dashed ${C.gold}`,opacity:0.6}}/>{cmpLabel}</span>}
                           </div>
                         }/>
          <SubChart data={trend} compareData={null}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:18,paddingTop:18,borderTop:`1px solid ${C.w(0.05)}`}}>
            <MiniStat label="New today" value={`+${newSubsToday}`} trend={newSubsTrend || undefined}/>
            <MiniStat label="Trial conversion" value={`${(trialConversion*100).toFixed(0)}%`} good={trialConversion >= 0.5}/>
            <MiniStat label="Churn (30d)" value={`${(churnRate*100).toFixed(1)}%`} good={churnRate < 0.05}/>
            <MiniStat label="LTV est." value="—" sub="needs >30d of subs"/>
          </div>
        </Panel>

        <Panel delay={0.25}>
          <SectionHeader title="Question Bank" sub={`Round ${num(d.currentRound)} of ∞`}/>
          <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:18}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:42,fontWeight:700,color:"#fff",lineHeight:1}}>{questionsTotal.toLocaleString()}</div>
            <div style={{fontSize:12,color:C.w(0.45),paddingBottom:6}}>questions live</div>
          </div>
          <div style={{height:8,background:C.w(0.06),borderRadius:4,overflow:"hidden",marginBottom:8}}>
            <div style={{
              height:"100%",
              width: questionsTotal > 0 ? `${(questionsUsed/questionsTotal)*100}%` : "0%",
              background: C.grad.gold,
              borderRadius:4,
            }}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.w(0.5),marginBottom:18}}>
            <span><strong style={{color:"#fff"}}>{questionsUsed.toLocaleString()}</strong> used</span>
            <span><strong style={{color:"#fff"}}>{(questionsTotal - questionsUsed).toLocaleString()}</strong> never served</span>
          </div>
          <div style={{
            padding:14, background:C.w(0.03), borderRadius:10,
            border:`1px solid ${C.w(0.06)}`, fontSize:12, color:C.w(0.6), lineHeight:1.5,
          }}>
            At current pace, round 1 completes in <strong style={{color:C.gold}}>~{Math.ceil((num(d.nextRoundStartsAt))/1000)}k</strong> more games before any question repeats.
          </div>
          <button onClick={() => setTab("Questions")} style={{
            width:"100%", marginTop:14, padding:"10px",
            background:"transparent", border:`1px solid ${C.w(0.1)}`,
            borderRadius:9, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer",
            fontFamily:"'Outfit',sans-serif",
          }}>Drill into bank →</button>
        </Panel>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <Panel delay={0.3}>
          <SectionHeader title="Top Bars by Player Volume" sub="Click any row to drill in"
                         action={
                           <button onClick={()=>setTab("Bars")} style={{
                             background:"transparent",border:"none",cursor:"pointer",
                             fontSize:12,fontWeight:600,color:C.gold,fontFamily:"'Outfit',sans-serif",
                           }}>View all {activeBars + pendingBars} →</button>
                         }/>
          <Table>
            <THead cols={["Bar","Code","City","Players","Games (mo)","MRR","Last","Status"]}/>
            {(d.topBars || []).slice(0,6).map((b,i) => (
              <BarRow key={b.code} bar={b} delay={i*0.03} onClick={() => { setBarDrill(b.code); setTab("Bars"); }}/>
            ))}
            {(d.topBars || []).length === 0 && (
              <div style={{padding:"24px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No bars yet</div>
            )}
          </Table>
        </Panel>

        <Panel delay={0.35}>
          <SectionHeader title="AWS Cost Mix" sub="Month to date"/>
          <div style={{display:"flex",justifyContent:"center",margin:"8px 0 18px"}}>
            <Donut segments={awsBreakdown} total={awsThisMonth}/>
          </div>
          <div className="scrollbar" style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto"}}>
            {awsBreakdown.map(s => (
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
}
