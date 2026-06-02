import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";
import Donut from "../components/charts/Donut";
import DailyCostChart from "../components/charts/DailyCostChart";

const SERVICE_COLOR = (i) => [C.blue, C.purple, C.cyan, C.gold, "#2ee6b6", "#ff6b81", "#9f7aea", "#f7971e", "#888"][i % 9];

export default function AwsTab() {
  const { data, loading, error, retry } = useFetch("/analytics/aws", []);

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={200} label="AWS"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="AWS"/></div>;

  const cur = data?.currentMonth || {};
  const total = Number(cur.total || 0);
  const forecast = Number(data?.forecast?.endOfMonth || total);
  const trailing = data?.trailing30Days || [];

  const services = (cur.byService || []).map((s, i) => ({
    service: s.service,
    cost:    Number(s.amount || 0),
    pct:     total > 0 ? Number(s.amount || 0) / total : 0,
    color:   SERVICE_COLOR(i),
  }));

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="MTD Spend" value={`$${total.toFixed(2)}`} sub={cur.month || ""} accent={C.grad.cyan} icon="☁️" big delay={0}/>
        <Stat label="EOM Forecast" value={`$${forecast.toFixed(2)}`} sub="projected month-end" accent={C.grad.purple} icon="📈" big delay={0.05}/>
        <Stat label="$ / Active Bar" value={`$${Number(data?.perActiveBar || 0).toFixed(2)}`} sub="this month" accent={C.grad.gold} icon="🍻" big delay={0.1}/>
        <Stat label="Top Service" value={services[0]?.service || "—"} sub={`$${(services[0]?.cost || 0).toFixed(2)} (${((services[0]?.pct || 0)*100).toFixed(0)}%)`} accent={C.grad.green} icon="🏆" big delay={0.15}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Panel delay={0.2}>
          <SectionHeader title="Service Mix" sub="Month to date"/>
          <div style={{display:"flex",justifyContent:"center",margin:"8px 0 18px"}}>
            <Donut segments={services} total={total}/>
          </div>
          <div className="scrollbar" style={{display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto"}}>
            {services.map(s => (
              <div key={s.service} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px"}}>
                <div style={{width:10,height:10,borderRadius:3,background:s.color}}/>
                <div style={{flex:1,fontSize:12,fontWeight:500,color:C.w(0.7)}}>{s.service}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.w(0.5)}}>{(s.pct*100).toFixed(1)}%</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff",minWidth:54,textAlign:"right"}}>${s.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel delay={0.25}>
          <SectionHeader title="Daily Cost" sub="Trailing 30 days"/>
          <DailyCostChart data={trailing}/>
        </Panel>
      </div>
    </div>
  );
}
