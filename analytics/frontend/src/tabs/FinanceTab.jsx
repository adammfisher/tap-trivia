import { C } from "../lib/theme";
import { useFetch } from "../lib/useFetch";
import { apiRangeParams } from "../lib/ranges";
import Panel from "../components/Panel";
import Stat from "../components/Stat";
import { SectionHeader } from "../components/Pill";
import { PanelLoading, PanelError } from "../components/PanelState";
import RevenueHeatmap from "../components/charts/RevenueHeatmap";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function FinanceTab({range, compare, customRange}) {
  const { range: r, start, end } = apiRangeParams(range, customRange);
  const qs = new URLSearchParams({ range: r, compare });
  if (start) qs.set("start", start);
  if (end)   qs.set("end", end);
  const path = `/analytics/finance?${qs.toString()}`;

  const { data, loading, error, retry } = useFetch(path, [r, compare, start, end]);

  if (loading) return <div style={{padding:"28px 32px"}}><PanelLoading height={200} label="Finance"/></div>;
  if (error)   return <div style={{padding:"28px 32px"}}><PanelError error={error} retry={retry} label="Finance"/></div>;

  const cur = data?.current || {};
  const cmp = data?.comparison || null;
  const matrix = data?.monthlyMatrix || [];
  const upcoming = data?.upcomingPayouts || {apple: {}, google: {}};

  const num = (v) => Number(v || 0);

  return (
    <div style={{padding:"28px 32px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
        <Stat label="Gross" value={`$${num(cur.gross).toLocaleString(undefined,{maximumFractionDigits:0})}`}
              sub="before store fees" accent={C.grad.purple} icon="💵" big delay={0}
              compare={cmp ? {value: num(cmp.gross), label: compare === "yoy" ? "YoY" : "prev"} : null}/>
        <Stat label="Net (after fees)" value={`$${num(cur.net).toLocaleString(undefined,{maximumFractionDigits:0})}`}
              sub={`Apple $${num(cur.appleNet).toFixed(0)} · Google $${num(cur.googleNet).toFixed(0)}`}
              accent={C.grad.gold} icon="🏦" big delay={0.05}
              compare={cmp ? {value: num(cmp.net), label: compare === "yoy" ? "YoY" : "prev"} : null}/>
        <Stat label="Refunds" value={`$${num(cur.refunds).toFixed(2)}`} sub="period total" accent={C.grad.red} icon="↩" big delay={0.1}/>
        <Stat label="AWS Cost" value={`$${num(cur.aws).toFixed(2)}`} sub={`Margin ${num(cur.net) > 0 ? (((num(cur.net) - num(cur.aws)) / num(cur.net)) * 100).toFixed(1) : "—"}%`} accent={C.grad.cyan} icon="☁️" big delay={0.15}/>
      </div>

      <Panel delay={0.2} style={{marginBottom:14}}>
        <SectionHeader title="Revenue Heatmap" sub="Net proceeds per month, last 3 years"/>
        <RevenueHeatmap matrix={matrix} months={MONTHS}/>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Panel delay={0.25}>
          <SectionHeader title="Apple Payout" sub="Next scheduled deposit"/>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{
              width:54,height:54,borderRadius:14,
              background:C.grad.cyan,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
            }}></div>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",lineHeight:1}}>
                ${num(upcoming.apple?.amount).toFixed(2)}
              </div>
              <div style={{fontSize:12,color:C.w(0.5),marginTop:5}}>
                {upcoming.apple?.expectedDate || "—"} · status: {upcoming.apple?.status || "pending"}
              </div>
            </div>
          </div>
        </Panel>

        <Panel delay={0.3}>
          <SectionHeader title="Google Payout" sub="Next scheduled deposit"/>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{
              width:54,height:54,borderRadius:14,
              background:C.grad.green,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
            }}>▶</div>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",lineHeight:1}}>
                ${num(upcoming.google?.amount).toFixed(2)}
              </div>
              <div style={{fontSize:12,color:C.w(0.5),marginTop:5}}>
                {upcoming.google?.expectedDate || "—"} · status: {upcoming.google?.status || "pre_revenue"}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
