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
        <Stat label="Total Bars" value={(totals.active + totals.pending) || 0} sub={`${totals.pending || 0} pending`} accent={C.grad.green} icon="🍻" delay={0}/>
        <Stat label="Total Players (mo)" value={(totals.totalPlayers || 0).toLocaleString()} sub="across all venues" accent={C.grad.purple} icon="👥" delay={0.05}/>
        <Stat label="Games Played (mo)" value={totals.totalGamesMonth || 0} sub={totals.active ? `avg ${((totals.totalGamesMonth || 0) / totals.active).toFixed(1)} per active bar` : "—"} accent={C.grad.cyan} icon="🎮" delay={0.1}/>
        <Stat label="Bar-Attributed MRR" value={`$${Number(totals.totalAttrMrr || 0).toFixed(0)}`} sub="patrons subscribed at venue" accent={C.grad.gold} icon="💰" delay={0.15}/>
      </div>

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
          <THead cols={["Bar","Code","City","Players","Games (mo)","MRR","Last","Status"]}/>
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
