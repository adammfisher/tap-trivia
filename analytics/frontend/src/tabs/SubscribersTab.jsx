import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import Pill from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";

const EVENT_TYPES = {
  new:   {icon:"💎", label:"New paid",     color:C.green},
  trial: {icon:"⏱",  label:"Started trial", color:C.cyan},
  renew: {icon:"↻",  label:"Renewed",      color:C.gold},
  churn: {icon:"✕",  label:"Churned",      color:C.red},
};

export default function SubscribersTab() {
  const { data, loading, error, retry } = useFetch("/analytics/subscribers", []);

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={140} label="Subscribers"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Subscribers"/></div>;

  const d = data || {};
  const platform = d.platformSplit || {ios:{subs:0,mrr:0}, android:{subs:0,mrr:0}};
  const funnel = d.funnel || [];
  const events = d.recentEvents || [];

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Active Paid" value={(d.active || 0).toLocaleString()} sub="@ $2.99/mo" accent={C.grad.gold} icon="💎" big delay={0}/>
        <Stat label="In Trial" value={d.trial || 0} sub="7-day free trial" accent={C.grad.cyan} icon="⏱" big delay={0.05}/>
        <Stat label="Free Players" value={(d.free || 0).toLocaleString()} sub="never subscribed" accent={C.grad.purple} icon="👤" big delay={0.1}/>
        <Stat label="Trial → Paid" value={`${((d.trialConversion || 0)*100).toFixed(0)}%`} sub="last 30 days" accent={C.grad.green} icon="📈" big delay={0.15}/>
      </div>

      <Panel delay={0.2} style={{marginBottom:14}}>
        <SectionHeader title="Subscriber Funnel" sub="Where players are in the lifecycle" live/>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {funnel.map((f, i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:160,fontSize:12,fontWeight:600,color:C.w(0.7)}}>{f.stage}</div>
              <div style={{flex:1,height:24,background:C.w(0.04),borderRadius:6,overflow:"hidden"}}>
                <div style={{
                  width: `${Math.max(2, (f.pct || 0) * 100)}%`,
                  height: "100%",
                  background: i === 0 ? C.grad.purple : i === 1 ? C.grad.cyan : i === 2 ? C.grad.gold : C.grad.green,
                }}/>
              </div>
              <div style={{minWidth:80,textAlign:"right",fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>
                {(f.value || 0).toLocaleString()}
              </div>
              <div style={{minWidth:54,textAlign:"right",fontSize:11,color:C.w(0.45),fontFamily:"'DM Mono',monospace"}}>
                {((f.pct || 0)*100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Panel delay={0.25}>
          <SectionHeader title="Recent Subscriptions" sub="Live from RevenueCat"/>
          {events.length === 0 && (
            <div style={{padding:"24px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No subscription events yet</div>
          )}
          {events.slice(0, 8).map((e, i) => {
            const t = EVENT_TYPES[e.type] || EVENT_TYPES.new;
            return (
              <div key={i} className="row" style={{
                display:"flex",alignItems:"center",gap:12,padding:"12px 8px",
                borderBottom:`1px solid ${C.w(0.04)}`,
                animation:`fadeUp .3s ease-out ${i*0.04}s both`,
              }}>
                <div style={{width:32,height:32,borderRadius:8,background:C.w(0.06),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{t.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{e.name || "Anonymous"}</div>
                  <div style={{fontSize:11,color:C.w(0.45)}}>{e.barCode || "—"} · {e.store || "?"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.color}}>{t.label}</div>
                  <div style={{fontSize:10,color:C.w(0.4),fontFamily:"'DM Mono',monospace"}}>{e.at || ""}</div>
                </div>
              </div>
            );
          })}
        </Panel>

        <Panel delay={0.3}>
          <SectionHeader title="Platform Split" sub="iOS vs Android"/>
          {[
            {key:"ios",     label:"App Store",  icon:"", grad:C.grad.cyan, color:C.cyan},
            {key:"android", label:"Play Store", icon:"", grad:C.grad.green, color:C.green},
          ].map((p, i) => {
            const stats = platform[p.key] || {subs:0, mrr:0};
            const total = (platform.ios?.subs || 0) + (platform.android?.subs || 0);
            const pct = total > 0 ? (stats.subs / total) * 100 : 0;
            return (
              <div key={p.key} style={{marginBottom: i === 0 ? 22 : 0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{p.label}</div>
                  <div style={{display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff"}}>{stats.subs.toLocaleString()}</div>
                    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:p.color}}>${Number(stats.mrr || 0).toFixed(0)}</div>
                  </div>
                </div>
                <div style={{height:10,background:C.w(0.04),borderRadius:5,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:p.grad,borderRadius:5}}/>
                </div>
                <div style={{marginTop:5,fontSize:10,color:C.w(0.4),fontFamily:"'DM Mono',monospace"}}>{pct.toFixed(1)}% of subscribers</div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
