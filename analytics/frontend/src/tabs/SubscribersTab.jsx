import { useState } from "react";
import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import { apiRangeParams } from "../lib/ranges";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";

const EVENT_TYPES = {
  active:        { icon: "💎", label: "Converted",     color: C.green },
  trial:         { icon: "⏱",  label: "Trial",         color: C.cyan  },
  cancelled:     { icon: "⊘",  label: "Cancelled",     color: C.gold  },
  expired:       { icon: "✕",  label: "Expired",       color: C.red   },
  billing_issue: { icon: "⚠",  label: "Billing issue", color: C.red   },
  // legacy fallbacks
  new:   { icon: "💎", label: "New paid", color: C.green },
  renew: { icon: "↻",  label: "Renewed",  color: C.gold  },
  churn: { icon: "✕",  label: "Churned",  color: C.red   },
};

// Group raw subscription types into the three buckets the operator cares about.
const FILTERS = [
  { key: "all",       label: "All",       match: () => true },
  { key: "trial",     label: "Trial",     match: (t) => t === "trial" },
  { key: "converted", label: "Converted", match: (t) => t === "active" },
  { key: "cancelled", label: "Cancelled", match: (t) => t === "cancelled" || t === "expired" },
];

function _fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return "—"; }
}

export default function SubscribersTab({ range = "mtd", compare = "none", customRange } = {}) {
  const { range: r, start, end } = apiRangeParams(range, customRange);
  const qs = new URLSearchParams({ range: r, compare });
  if (start) qs.set("start", start);
  if (end)   qs.set("end", end);

  const { data, loading, error, retry } = useFetch(`/analytics/subscribers?${qs.toString()}`, [r, compare, start, end]);
  const [subFilter, setSubFilter] = useState("all");

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={140} label="Subscribers"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Subscribers"/></div>;

  const d = data || {};
  const platform = d.platformSplit || { ios: {subs:0,mrr:0}, android: {subs:0,mrr:0} };
  const funnel = d.funnel || [];
  const allEvents = d.recentEvents || [];
  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = allEvents.filter(e => f.match(e.type)).length;
    return acc;
  }, {});
  const activeFilter = FILTERS.find(f => f.key === subFilter) || FILTERS[0];
  const events = allEvents.filter(e => activeFilter.match(e.type));

  return (
    <div style={{padding:"28px 32px"}}>

      {/* Row 1 — mirrors RevenueCat overview top row */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:14}}>
        <Stat label="Active Trials"        value={(d.trial  || 0).toLocaleString()} sub="In total"           accent={C.grad.cyan}   icon="⏱"  big delay={0}/>
        <Stat label="Active Subscriptions" value={(d.active || 0).toLocaleString()} sub="In total"           accent={C.grad.gold}   icon="💎" big delay={0.05}/>
        <Stat label="MRR"                  value={`$${(d.mrr || 0).toFixed(0)}`}    sub="Monthly recurring"  accent={C.grad.green}  icon="💵" big delay={0.1}/>
      </div>

      {/* Row 2 — mirrors RevenueCat overview bottom row */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:14}}>
        <Stat label="Revenue"         value={`$${(d.revenue28d     || 0).toFixed(0)}`} sub="Last 28 days"  accent={C.grad.purple} icon="💰" big delay={0.15}/>
        <Stat label="New Customers"   value={(d.newCustomers28d || 0).toLocaleString()} sub="Last 28 days"  accent={C.grad.cyan}   icon="✨" big delay={0.2}/>
        <Stat label="Active Customers" value={(d.activeUsers28d || 0).toLocaleString()} sub="Last 28 days" accent={C.grad.gold}   icon="👥" big delay={0.25}/>
      </div>

      {/* Subscriber Funnel */}
      <Panel delay={0.3} style={{marginBottom:14}}>
        <SectionHeader title="Subscriber Funnel" sub="Where players are in the lifecycle" live/>
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {funnel.map((f, i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:14}}>
              <div style={{width:160, fontSize:12, fontWeight:600, color:C.w(0.7)}}>{f.stage}</div>
              <div style={{flex:1, height:24, background:C.w(0.04), borderRadius:6, overflow:"hidden"}}>
                <div style={{
                  width: `${Math.max(2, (f.pct || 0) * 100)}%`,
                  height: "100%",
                  background: i === 0 ? C.grad.purple : i === 1 ? C.grad.cyan : i === 2 ? C.grad.gold : C.grad.green,
                }}/>
              </div>
              <div style={{minWidth:80, textAlign:"right", fontFamily:"'Fredoka',sans-serif", fontSize:14, fontWeight:700, color:"#fff"}}>
                {(f.value || 0).toLocaleString()}
              </div>
              <div style={{minWidth:54, textAlign:"right", fontSize:11, color:C.w(0.45), fontFamily:"'DM Mono',monospace"}}>
                {((f.pct || 0)*100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>

        {/* Recent Subscriptions */}
        <Panel delay={0.35}>
          <SectionHeader title="Recent Subscriptions" sub="Live from RevenueCat"/>
          <div style={{display:"flex", gap:6, marginBottom:14, flexWrap:"wrap"}}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setSubFilter(f.key)}
                style={{
                  padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer",
                  fontSize:12, fontWeight:600, fontFamily:"'Outfit',sans-serif",
                  background: subFilter===f.key ? C.w(0.12) : C.w(0.04),
                  color: subFilter===f.key ? "#fff" : C.w(0.55),
                }}
              >{f.label} <span style={{opacity:.6, fontFamily:"'DM Mono',monospace"}}>{counts[f.key] || 0}</span></button>
            ))}
          </div>
          {events.length === 0 && (
            <div style={{padding:"24px 12px", fontSize:12, color:C.w(0.4), textAlign:"center"}}>No {subFilter==="all" ? "subscription events" : activeFilter.label.toLowerCase()+" subscribers"} yet</div>
          )}
          {events.slice(0, 12).map((e, i) => {
            const t = EVENT_TYPES[e.type] || EVENT_TYPES.active;
            return (
              <div key={i} className="row" style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 8px",
                borderBottom:`1px solid ${C.w(0.04)}`,
                animation:`fadeUp .3s ease-out ${i*0.04}s both`,
              }}>
                <div style={{width:32, height:32, borderRadius:8, background:C.w(0.06), display:"flex", alignItems:"center", justifyContent:"center", fontSize:14}}>{t.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'DM Mono',monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{e.customerId || e.name || "Anonymous"}</div>
                  <div style={{fontSize:11, color:C.w(0.45)}}>{e.store || "?"}{e.product ? ` · ${e.product}` : ""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11, fontWeight:700, color:t.color}}>{t.label}</div>
                  <div style={{fontSize:10, color:C.w(0.4), fontFamily:"'DM Mono',monospace"}}>{_fmtDate(e.purchasedAt)} → {_fmtDate(e.expiresAt)}</div>
                </div>
              </div>
            );
          })}
        </Panel>

        {/* Platform Split */}
        <Panel delay={0.4}>
          <SectionHeader title="Platform Split" sub="iOS vs Android"/>
          {[
            { key:"ios",     label:"App Store",  grad:C.grad.cyan,  color:C.cyan  },
            { key:"android", label:"Play Store", grad:C.grad.green, color:C.green },
          ].map((p, i) => {
            const stats = platform[p.key] || {subs:0, mrr:0};
            const total = (platform.ios?.subs || 0) + (platform.android?.subs || 0);
            const pct = total > 0 ? (stats.subs / total) * 100 : 0;
            return (
              <div key={p.key} style={{marginBottom: i === 0 ? 22 : 0}}>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
                  <div style={{fontSize:12, fontWeight:600, color:"#fff"}}>{p.label}</div>
                  <div style={{display:"flex", gap:14, alignItems:"center"}}>
                    <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:18, fontWeight:700, color:"#fff"}}>{stats.subs.toLocaleString()}</div>
                    <div style={{fontFamily:"'Fredoka',sans-serif", fontSize:18, fontWeight:700, color:p.color}}>${Number(stats.mrr || 0).toFixed(0)}</div>
                  </div>
                </div>
                <div style={{height:10, background:C.w(0.04), borderRadius:5, overflow:"hidden"}}>
                  <div style={{width:`${pct}%`, height:"100%", background:p.grad, borderRadius:5}}/>
                </div>
                <div style={{marginTop:5, fontSize:10, color:C.w(0.4), fontFamily:"'DM Mono',monospace"}}>{pct.toFixed(1)}% of subscribers</div>
              </div>
            );
          })}
        </Panel>

      </div>
    </div>
  );
}
